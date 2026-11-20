-- FortisObserve security fixes, 2026-11-20.
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- The dashboard reads everything with the service-role key on the server,
-- so none of these tables need any access for the public anon key.
-- Only Fortis tables are touched; the portfolio's comments / likes /
-- page_views are left alone.

-- 1. Brute-force protection for the TOTP login (src/lib/authAttempts.ts)
create table if not exists public.auth_attempts (
    id         bigint generated always as identity primary key,
    at         timestamptz not null default now(),
    method     text not null check (method in ('totp', 'webauthn')),
    ok         boolean not null,
    ip         text,
    code_hash  text          -- sha256 of a code that signed in, to block reuse
);
create index if not exists auth_attempts_recent on public.auth_attempts (method, ok, at desc);

-- 2. Row level security on, with no policies: service role only
alter table public.auth_attempts  enable row level security;
alter table public.events         enable row level security;
alter table public.sessions       enable row level security;
alter table public.admin_devices  enable row level security;
alter table public.uptime_logs    enable row level security;

-- 3. Drop any policy that opened these tables to anon / authenticated users.
--    (Today the anon key can read every row of public.events.)
do $$
declare p record;
begin
    for p in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in ('events', 'sessions', 'admin_devices', 'uptime_logs', 'auth_attempts')
          and roles && array['anon', 'authenticated', 'public']::name[]
    loop
        execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
        raise notice 'dropped policy % on %', p.policyname, p.tablename;
    end loop;
end $$;

-- 4. Belt and braces: no table privileges for anon / authenticated either.
revoke all on public.events, public.sessions, public.admin_devices, public.uptime_logs, public.auth_attempts
    from anon, authenticated;

-- 5. The live feed now polls /api/live; stop broadcasting events over Realtime.
do $$
begin
    if exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
    ) then
        alter publication supabase_realtime drop table public.events;
    end if;
end $$;

-- 6. Optional housekeeping: keep a month of login attempts.
-- delete from public.auth_attempts where at < now() - interval '30 days';
