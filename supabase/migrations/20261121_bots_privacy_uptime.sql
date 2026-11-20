-- FortisObserve: bot backfill, IP anonymising and retention, uptime index, 2026-11-21.
-- Run once in the Supabase SQL editor, after 20261121_visits_and_stats.sql. Safe to run again.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
-- service_role needs USAGE on extensions for hmac(). Supabase already grants it, and
-- the extensions schema belongs to an admin role there, so a failed grant is fine.
do $$
begin
    grant usage on schema extensions to service_role;
exception when insufficient_privilege then
    raise notice 'extensions schema: grant skipped (%), Supabase already grants it', sqlerrm;
end $$;


-- ─── 1. Re-flag older page views with today's bot rules ──────────────
-- The same rules as src/lib/bots.ts, as far as stored data allows (raw user
-- agents were never stored): headless browsers and datacenter networks.
do $$
declare n int;
begin
    update public.events e
    set is_bot = true
    from public.sessions s
    where e.session_id = s.id
      and not e.is_bot
      and (
          s.browser ilike '%headless%'
          or s.isp ~* '(amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|alibaba|tencent|choopa|vultr|contabo|oracle|scaleway|leaseweb|m247|datacamp|hostinger|ionos|upcloud|kamatera|cherry servers|fly\.io|render|heroku|netlify|vercel|cloudflare, inc|fastly|zenlayer)'
      );
    get diagnostics n = row_count;
    raise notice 'bot backfill: % page views re-flagged as bots', n;
end $$;


-- ─── 2. IP anonymising ───────────────────────────────────────────────
-- A secret salt, readable only by the service role, so anonymised IPs
-- can't be reversed by hashing all 4 billion IPv4 addresses.
create table if not exists public.fortis_private (
    key   text primary key,
    value text not null
);
alter table public.fortis_private enable row level security;
revoke all on public.fortis_private from anon, authenticated;
grant select on public.fortis_private to service_role;
insert into public.fortis_private (key, value)
values ('ip_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- 152.57.55.236  → 152.57.55.0#3fa1c09e   (network kept, host replaced by a keyed hash)
-- 2409:40f2:…    → 2409:40f2:1a::#9b20d4e1
-- The hash keeps two different addresses apart, so (visitor, ip) stays unique.
create or replace function public.fortis_anonymise_ip(ip text)
returns text
language sql stable
set search_path = public, extensions
as $$
    select case
        when ip is null or ip like '%#%' then ip
        when ip ~ '^\d{1,3}(\.\d{1,3}){3}$'
            then regexp_replace(ip, '\.\d{1,3}$', '.0') || '#' ||
                 left(encode(extensions.hmac(ip, (select value from fortis_private where key = 'ip_salt'), 'sha256'::text), 'hex'), 8)
        when ip like '%:%'
            then array_to_string((string_to_array(ip, ':'))[1:3], ':') || '::#' ||
                 left(encode(extensions.hmac(ip, (select value from fortis_private where key = 'ip_salt'), 'sha256'::text), 'hex'), 8)
        else 'x#' || left(encode(extensions.hmac(ip, (select value from fortis_private where key = 'ip_salt'), 'sha256'::text), 'hex'), 8)
    end
$$;


-- ─── 3. Retention, run by the uptime cron ────────────────────────────
--   connections not seen for p_days: IP anonymised, coordinates rounded to ~10 km
--   login attempts: kept 30 days
--   uptime checks: kept 180 days
create or replace function public.fortis_retention(p_days int default 30)
returns json
language plpgsql
set search_path = public
as $$
declare
    anonymised int; attempts int; checks int;
begin
    update sessions
    set ip_address = fortis_anonymise_ip(ip_address),
        latitude   = round(latitude, 1),
        longitude  = round(longitude, 1)
    where last_seen < now() - make_interval(days => p_days)
      and ip_address is not null
      and ip_address not like '%#%';
    get diagnostics anonymised = row_count;

    delete from auth_attempts where at < now() - interval '30 days';
    get diagnostics attempts = row_count;

    delete from uptime_logs where timestamp < now() - interval '180 days';
    get diagnostics checks = row_count;

    return json_build_object('anonymised_connections', anonymised, 'deleted_login_attempts', attempts, 'deleted_uptime_checks', checks);
end
$$;


-- ─── 4. Referrers: count ?utm_source= / ?ref= visits by their source ──
-- The portfolio stores those as "utm_source:linkedin"; they were showing as Direct.
create or replace function public.fortis_top(p_dim text, p_from timestamptz, p_to timestamptz, p_limit int default 8)
returns table (name text, value bigint)
language sql stable
set search_path = public
as $$
    select name, value from (
        select e.path as name, count(*) as value
        from events e
        where p_dim = 'path' and not e.is_bot and e.timestamp >= p_from and e.timestamp < p_to
        group by 1

        union all

        select case
                   when v.referer ~* '^utm_source:' then coalesce(nullif(lower(substring(v.referer from '(?i)^utm_source:(.+)$')), ''), 'Direct')
                   else coalesce(substring(v.referer from '^[a-zA-Z][a-zA-Z0-9+.-]*://(?:www\.)?([^/:?#]+)'), 'Direct')
               end,
               count(*)
        from fortis_visits v
        where p_dim = 'referrer' and not v.is_bot and v.started_at >= p_from and v.started_at < p_to
        group by 1

        union all

        select case p_dim
                   when 'country' then s.country
                   when 'browser' then s.browser
                   when 'os'      then s.os
                   when 'device'  then s.device
                   when 'isp'     then s.isp
               end,
               count(distinct s.visitor_uuid)
        from events e
        join sessions s on s.id = e.session_id
        where p_dim in ('country', 'browser', 'os', 'device', 'isp')
          and not e.is_bot and e.timestamp >= p_from and e.timestamp < p_to
        group by 1
    ) t
    where name is not null and name <> '' and name <> 'Unknown'
    order by value desc, name
    limit p_limit;
$$;


-- ─── 5. Uptime page ──────────────────────────────────────────────────
create index if not exists uptime_logs_timestamp_idx on public.uptime_logs (timestamp);


-- ─── Service role only ───────────────────────────────────────────────
revoke all on function public.fortis_anonymise_ip(text) from public, anon, authenticated;
revoke all on function public.fortis_retention(int) from public, anon, authenticated;
revoke all on function public.fortis_top(text, timestamptz, timestamptz, int) from public, anon, authenticated;
grant execute on function public.fortis_anonymise_ip(text) to service_role;
grant execute on function public.fortis_retention(int) to service_role;
grant execute on function public.fortis_top(text, timestamptz, timestamptz, int) to service_role;

notify pgrst, 'reload schema';
