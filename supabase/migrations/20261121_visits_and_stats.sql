-- FortisObserve data model: visits and database-side stats, 2026-11-21.
-- Run once in the Supabase SQL editor, after 20261120_security.sql. Safe to run again.
--
-- Nothing here changes how data is written: ingest_telemetry and
-- update_telemetry are untouched. Visits are derived from events.
--
--   person   = visitor_uuid (one browser, from the portfolio's localStorage)
--   session  = the existing `sessions` row: one person on one IP address
--   visit    = a run of a person's events with no gap longer than 30 minutes
--   event    = one page view

-- Indexes the queries below lean on
create index if not exists events_timestamp_idx on public.events (timestamp);
create index if not exists events_session_ts_idx on public.events (session_id, timestamp);
create index if not exists sessions_visitor_idx on public.sessions (visitor_uuid, last_seen desc);


-- ─── Visits ─────────────────────────────────────────────────────────
create or replace view public.fortis_visits
with (security_invoker = true) as
with e as (
    select
        ev.id, ev.session_id, ev.path, ev.referer, ev.is_bot, ev.timestamp, ev.duration_ms,
        s.visitor_uuid,
        case
            when lag(ev.timestamp) over w is null
              or ev.timestamp - lag(ev.timestamp) over w > interval '30 minutes'
            then 1 else 0
        end as starts_visit
    from public.events ev
    join public.sessions s on s.id = ev.session_id
    window w as (partition by s.visitor_uuid order by ev.timestamp, ev.id)
), numbered as (
    select e.*,
           sum(starts_visit) over (partition by visitor_uuid order by timestamp, id rows unbounded preceding) as visit_no
    from e
)
select
    visitor_uuid || ':' || visit_no                                    as visit_id,
    visitor_uuid,
    visit_no::int                                                      as visit_no,
    min(timestamp)                                                     as started_at,
    max(timestamp)                                                     as ended_at,
    count(*)::int                                                      as page_views,
    (array_agg(path order by timestamp, id))[1]                        as entry_path,
    (array_agg(path order by timestamp desc, id desc))[1]              as exit_path,
    nullif(nullif((array_agg(referer order by timestamp, id))[1], ''), 'null') as referer,
    bool_or(is_bot)                                                    as is_bot,
    -- time between the first and last page, plus time spent on the last page
    (extract(epoch from max(timestamp) - min(timestamp)) * 1000)::bigint
        + coalesce((array_agg(duration_ms order by timestamp desc, id desc))[1], 0)::bigint
                                                                       as duration_ms,
    (array_agg(session_id order by timestamp desc, id desc))[1]        as session_id
from numbered
group by visitor_uuid, visit_no;


-- ─── Overview numbers for a time range ──────────────────────────────
create or replace function public.fortis_overview(p_from timestamptz, p_to timestamptz)
returns json
language sql stable
set search_path = public
as $$
    with ev as (
        select is_bot from events where timestamp >= p_from and timestamp < p_to
    ), v as (
        select * from fortis_visits where started_at >= p_from and started_at < p_to and not is_bot
    ), firsts as (
        select visitor_uuid, min(started_at) as first_at from fortis_visits where not is_bot group by visitor_uuid
    )
    select json_build_object(
        'events',        (select count(*) from ev),
        'human_events',  (select count(*) from ev where not is_bot),
        'bot_events',    (select count(*) from ev where is_bot),
        'visits',        (select count(*) from v),
        'visitors',      (select count(distinct visitor_uuid) from v),
        'new_visitors',  (select count(*) from firsts f where f.first_at >= p_from and f.first_at < p_to),
        'bounces',       (select count(*) from v where page_views = 1),
        'page_views',    (select coalesce(sum(page_views), 0) from v),
        'avg_visit_ms',  (select coalesce(round(avg(duration_ms)), 0) from v)
    );
$$;


-- ─── Top N for a dimension in a time range (humans only) ────────────
--   path      → page views
--   referrer  → visits, by the referring site of the visit's first page
--   country / browser / os / device / isp → distinct people
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

        select coalesce(substring(v.referer from '^[a-zA-Z][a-zA-Z0-9+.-]*://(?:www\.)?([^/:?#]+)'), 'Direct'), count(*)
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


-- ─── One row per day (in the given time zone) ───────────────────────
create or replace function public.fortis_daily(p_from timestamptz, p_to timestamptz, p_tz text default 'Asia/Kolkata')
returns table (day date, human bigint, bot bigint, visitors bigint)
language sql stable
set search_path = public
as $$
    with days as (
        select generate_series(
            (p_from at time zone p_tz)::date,
            ((p_to - interval '1 microsecond') at time zone p_tz)::date,
            interval '1 day'
        )::date as day
    ), ev as (
        select (e.timestamp at time zone p_tz)::date as day, e.is_bot, s.visitor_uuid
        from events e
        join sessions s on s.id = e.session_id
        where e.timestamp >= p_from and e.timestamp < p_to
    )
    select d.day,
           count(ev.day) filter (where not ev.is_bot),
           count(ev.day) filter (where ev.is_bot),
           count(distinct ev.visitor_uuid) filter (where not ev.is_bot)
    from days d
    left join ev on ev.day = d.day
    group by d.day
    order by d.day;
$$;


-- ─── People active in a time range ──────────────────────────────────
create or replace function public.fortis_visitor_list(p_from timestamptz, p_to timestamptz, p_limit int default 200)
returns table (
    visitor_uuid text, first_seen timestamptz, last_seen timestamptz,
    visits bigint, page_views bigint, is_bot boolean, impossible_travel boolean,
    country text, city text, device text, os text, browser text, isp text, ip_address text
)
language sql stable
set search_path = public
as $$
    with v as (
        select visitor_uuid, count(*) as visits, sum(page_views) as page_views,
               max(ended_at) as last_seen, bool_and(is_bot) as is_bot
        from fortis_visits
        where started_at >= p_from and started_at < p_to
        group by visitor_uuid
    ), latest as (
        select distinct on (visitor_uuid) *
        from sessions
        order by visitor_uuid, last_seen desc
    ), person as (
        select visitor_uuid, min(first_seen) as first_seen, bool_or(impossible_travel) as impossible_travel
        from sessions
        group by visitor_uuid
    )
    select v.visitor_uuid, p.first_seen, v.last_seen, v.visits, v.page_views, v.is_bot, p.impossible_travel,
           l.country, l.city, l.device, l.os, l.browser, l.isp, l.ip_address
    from v
    join latest l on l.visitor_uuid = v.visitor_uuid
    join person p on p.visitor_uuid = v.visitor_uuid
    order by v.last_seen desc
    limit p_limit;
$$;


-- ─── Service role only ──────────────────────────────────────────────
revoke all on public.fortis_visits from anon, authenticated;
grant select on public.fortis_visits to service_role;

revoke all on function public.fortis_overview(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.fortis_top(text, timestamptz, timestamptz, int) from public, anon, authenticated;
revoke all on function public.fortis_daily(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.fortis_visitor_list(timestamptz, timestamptz, int) from public, anon, authenticated;

grant execute on function public.fortis_overview(timestamptz, timestamptz) to service_role;
grant execute on function public.fortis_top(text, timestamptz, timestamptz, int) to service_role;
grant execute on function public.fortis_daily(timestamptz, timestamptz, text) to service_role;
grant execute on function public.fortis_visitor_list(timestamptz, timestamptz, int) to service_role;

-- Let PostgREST pick up the new view and functions straight away
notify pgrst, 'reload schema';
