import { Activity, Globe2, ShieldAlert, Users, Zap, UserCheck, MapPin } from "lucide-react";
import { GlobeWrapper } from "@/components/GlobeWrapper";
import { LiveFeed } from "@/components/LiveFeed";
import { supabaseAdmin } from "@/lib/supabase";
import { PageHeader, Chip, Caption, Metric, BarList } from "@/components/ui";
import { Chronos } from "@/components/command/Chronos";
import { HourStrip, type HourBucket } from "@/components/command/HourStrip";

export const dynamic = 'force-dynamic';

const HOUR = 3600 * 1000;

function istHour(ms: number) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(ms));
}

// Data loading lives outside the component: it reads the clock, which a render must not do.
async function loadDashboard() {
  const now = Date.now();
  const thisHourStart = Math.floor(now / HOUR) * HOUR;
  const dayStart = thisHourStart - 23 * HOUR;

  const [
    { count: sessionCount },
    { count: eventCount },
    { count: humanCount },
    { data: sessionRows },
    { data: dayEvents },
    { data: globeSessions },
  ] = await Promise.all([
    supabaseAdmin.from('sessions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).eq('is_bot', false),
    supabaseAdmin.from('sessions').select('isp, country'),
    supabaseAdmin.from('events').select('timestamp, is_bot').gte('timestamp', new Date(dayStart).toISOString()),
    // Active countries/cities to draw arcs on the globe
    supabaseAdmin.from('sessions').select('country, city, ip_address, latitude, longitude').limit(100),
  ]);

  // Top sources (ISP) and top country
  const ispCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  sessionRows?.forEach(row => {
    const isp = row.isp && row.isp !== 'Unknown' ? row.isp : 'Other';
    ispCounts[isp] = (ispCounts[isp] || 0) + 1;
    if (row.country && row.country !== 'Unknown') {
      countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    }
  });

  const topSources = Object.entries(ispCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const [topCountry, topCountryCount] = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
  const located = Object.values(countryCounts).reduce((a, b) => a + b, 0);

  // Last 24 hours, one bucket per hour (oldest first, current hour last)
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({ hour: istHour(dayStart + i * HOUR), human: 0, bot: 0 }));
  dayEvents?.forEach(ev => {
    const i = Math.floor((new Date(ev.timestamp).getTime() - dayStart) / HOUR);
    if (i >= 0 && i < 24) buckets[i][ev.is_bot ? 'bot' : 'human'] += 1;
  });
  const dayHuman = buckets.reduce((a, b) => a + b.human, 0);
  const dayBot = buckets.reduce((a, b) => a + b.bot, 0);

  const sessions = sessionCount ?? 0;
  const events = eventCount ?? 0;
  const humans = humanCount ?? 0;
  const humanShare = events > 0 ? humans / events : 0;

  return {
    sessions, events, humans, humanShare, topSources, topCountry, topCountryCount, located,
    buckets, dayHuman, dayBot, globeSessions: globeSessions || [],
  };
}

export default async function CommandCenter() {
  const {
    sessions, events, humans, humanShare, topSources, topCountry, topCountryCount, located,
    buckets, dayHuman, dayBot, globeSessions,
  } = await loadDashboard();

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
      <PageHeader
        title="Command Center"
        subtitle="Telemetry from ganeshangadi.online, as it happens."
        right={
          <>
            <Chip on><span className="dot live" /> Live</Chip>
            <Chip><ShieldAlert className="w-3.5 h-3.5 text-ok" /> Status: optimal</Chip>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">

        {/* Row 1: Chronos + Observatory */}
        <Chronos className="lg:col-span-5" />

        <section className="glass p-[18px] lg:col-span-7 flex flex-col gap-4">
          <Caption>Traffic observatory</Caption>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
            <Metric icon={Users} label="Targets" value={sessions} detail="sessions" />
            <Metric icon={Zap} label="Events" value={events} detail="recorded" />
            <Metric
              icon={UserCheck}
              label="Human"
              value={`${Math.round(humanShare * 100)}%`}
              detail={humans.toLocaleString()}
              ratio={humanShare}
              warnAt={2}
            />
            <Metric
              icon={MapPin}
              label="Top region"
              value={topCountry}
              detail={located > 0 ? `${Math.round((topCountryCount / located) * 100)}%` : undefined}
              ratio={located > 0 ? topCountryCount / located : 0}
              warnAt={2}
            />
          </div>

          <div className="h-px bg-faint" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="dot text-accent" /><span className="text-muted">Human</span> <span className="font-mono text-fg">{dayHuman.toLocaleString()}</span></span>
            <span className="flex items-center gap-1.5"><span className="dot text-fill" /><span className="text-muted">Bot</span> <span className="font-mono text-fg">{dayBot.toLocaleString()}</span></span>
            <span className="ml-auto caption !tracking-[1.5px] !text-[10px]">Last 24 hours</span>
          </div>
          <HourStrip buckets={buckets} />
        </section>

        {/* Row 2: globe + sources and feed */}
        <section className="glass lg:col-span-8 relative overflow-hidden min-h-[380px] lg:min-h-[520px] flex items-center justify-center">
          <div className="absolute top-[18px] left-[18px] z-10 flex items-center gap-2">
            <Globe2 className="w-3.5 h-3.5 text-muted" />
            <Caption>Fortis radar</Caption>
          </div>
          <GlobeWrapper activeSessions={globeSessions} />
        </section>

        <div className="lg:col-span-4 flex flex-col gap-4 md:gap-5 min-h-0">
          <section className="glass p-[18px] flex flex-col gap-4">
            <Caption>Top sources</Caption>
            <BarList items={topSources} empty="No sources detected." />
          </section>

          <section className="glass p-[18px] flex-1 flex flex-col gap-4 min-h-[300px] lg:max-h-[420px] overflow-hidden">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted" />
              <Caption>Live event feed</Caption>
            </div>
            <LiveFeed />
          </section>
        </div>

      </div>
    </div>
  );
}
