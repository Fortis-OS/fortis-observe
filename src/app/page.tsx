import { Activity, ShieldAlert, Users, Footprints, LogOut, Timer } from "lucide-react";
import { LiveFeed } from "@/components/LiveFeed";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { getSiteStatus } from "@/lib/status";
import { statusColor } from "@/lib/siteStatus";
import { PageHeader, Chip, Caption, Metric, BarList, RangeChips } from "@/components/ui";
import { parseRange, delta, formatDuration } from "@/lib/range";
import { getOverview, getTop, type Overview } from "@/lib/stats";
import { Chronos } from "@/components/command/Chronos";
import { HourStrip, type HourBucket } from "@/components/command/HourStrip";

export const dynamic = 'force-dynamic';

const HOUR = 3600 * 1000;

function istHour(ms: number) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(ms));
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Data loading lives outside the component: it reads the clock, which a render must not do.
async function loadDashboard(rangeParam: string | string[] | undefined) {
  const range = parseRange(rangeParam, "7d");
  const now = Date.now();
  const thisHourStart = Math.floor(now / HOUR) * HOUR;
  const dayStart = thisHourStart - 23 * HOUR;

  const [overview, previous, topSources, dayEvents] = await Promise.all([
    getOverview(range.from, range.to),
    range.prev ? getOverview(range.prev.from, range.prev.to) : Promise.resolve(null),
    getTop("isp", range.from, range.to, 5),
    fetchAll<{ timestamp: string; is_bot: boolean }>((from, to) =>
      supabaseAdmin.from('events').select('timestamp, is_bot').gte('timestamp', new Date(dayStart).toISOString()).order('id').range(from, to)),
  ]);

  // Last 24 hours, one bucket per hour (oldest first, current hour last)
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({ hour: istHour(dayStart + i * HOUR), human: 0, bot: 0 }));
  dayEvents.forEach(ev => {
    const i = Math.floor((new Date(ev.timestamp).getTime() - dayStart) / HOUR);
    if (i >= 0 && i < 24) buckets[i][ev.is_bot ? 'bot' : 'human'] += 1;
  });
  const dayHuman = buckets.reduce((a, b) => a + b.human, 0);
  const dayBot = buckets.reduce((a, b) => a + b.bot, 0);

  return { range, overview, previous, topSources, buckets, dayHuman, dayBot };
}

const bounceRate = (o: Overview) => (o.visits > 0 ? o.bounces / o.visits : 0);

export default async function CommandCenter({ searchParams }: { searchParams: SearchParams }) {
  const { range: rangeParam } = await searchParams;
  const { range, overview: o, previous: p, topSources, buckets, dayHuman, dayBot } = await loadDashboard(rangeParam);
  const site = await getSiteStatus();
  const humanShare = o.events > 0 ? o.human_events / o.events : 0;
  const vs = p ? ` vs ${range.prevLabel}` : "";

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
      <PageHeader
        title="Command Center"
        subtitle="Telemetry from ganeshangadi.online, as it happens."
        right={
          <>
            <RangeChips current={range.key} basePath="/" />
            <Chip on><span className="dot live" /> Live</Chip>
            <Chip><ShieldAlert className={`w-3.5 h-3.5 ${statusColor(site.state)}`} /> Site: <span className="font-mono text-fg">{site.label}</span></Chip>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">

        {/* Row 1: Chronos + Observatory */}
        <Chronos className="lg:col-span-5" />

        <section className="glass p-[18px] lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Caption>Traffic observatory</Caption>
            <span className="caption !tracking-[1.5px] !text-[10px]">{range.label}{vs && <span className="normal-case"> · Δ{vs}</span>}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
            <Metric icon={Users} label="Visitors" value={o.visitors} detail={delta(o.visitors, p?.visitors)} />
            <Metric icon={Footprints} label="Visits" value={o.visits} detail={delta(o.visits, p?.visits)} />
            <Metric
              icon={LogOut}
              label="Bounce"
              value={`${Math.round(bounceRate(o) * 100)}%`}
              detail={p ? delta(Math.round(bounceRate(o) * 100), Math.round(bounceRate(p) * 100), (n) => `${n}%`) : undefined}
              ratio={bounceRate(o)}
              warnAt={2}
            />
            <Metric
              icon={Timer}
              label="Avg visit"
              value={formatDuration(o.avg_visit_ms)}
              detail={p ? delta(Math.round(o.avg_visit_ms / 1000), Math.round(p.avg_visit_ms / 1000), (n) => formatDuration(n * 1000)) : undefined}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            <span><span className="font-mono text-fg">{o.page_views.toLocaleString()}</span> page views</span>
            <span><span className="font-mono text-fg">{o.new_visitors.toLocaleString()}</span> new visitors</span>
            <span><span className="font-mono text-fg">{Math.round(humanShare * 100)}%</span> of {o.events.toLocaleString()} events human</span>
          </div>

          <div className="h-px bg-faint" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="dot text-accent" /><span className="text-muted">Human</span> <span className="font-mono text-fg">{dayHuman.toLocaleString()}</span></span>
            <span className="flex items-center gap-1.5"><span className="dot text-fill" /><span className="text-muted">Bot</span> <span className="font-mono text-fg">{dayBot.toLocaleString()}</span></span>
            <span className="ml-auto caption !tracking-[1.5px] !text-[10px]">Last 24 hours</span>
          </div>
          <HourStrip buckets={buckets} />
        </section>

        {/* Row 2: live feed + top sources */}
        <section className="glass p-[18px] lg:col-span-8 flex flex-col gap-4 min-h-[320px] lg:h-[420px] overflow-hidden">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-muted" />
            <Caption>Live event feed</Caption>
          </div>
          <LiveFeed />
        </section>

        <section className="glass p-[18px] lg:col-span-4 flex flex-col gap-4">
          <Caption>Top sources</Caption>
          <BarList items={topSources} empty="No sources detected." />
        </section>

      </div>
    </div>
  );
}
