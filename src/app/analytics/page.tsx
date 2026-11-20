import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    // Fetch all sessions (or limit to a recent window) to aggregate stats
    const sessions = await fetchAll<{ browser: string; os: string; country: string; total_visits: number }>((from, to) =>
        supabaseAdmin.from('sessions').select('browser, os, country, total_visits').order('id').range(from, to));

    const rawBrowsers: Record<string, number> = {};
    const rawOs: Record<string, number> = {};
    const rawCountries: Record<string, number> = {};

    let newVisitors = 0;
    let returningVisitors = 0;

    sessions.forEach(s => {
        rawBrowsers[s.browser] = (rawBrowsers[s.browser] || 0) + 1;
        rawOs[s.os] = (rawOs[s.os] || 0) + 1;
        rawCountries[s.country] = (rawCountries[s.country] || 0) + 1;
        if (s.total_visits === 1) newVisitors++;
        else returningVisitors++;
    });

    const visitorTypes = [
        { name: 'New', value: newVisitors },
        { name: 'Returning', value: returningVisitors }
    ].filter(v => v.value > 0);

    const browsers = Object.entries(rawBrowsers)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const os = Object.entries(rawOs)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const countries = Object.entries(rawCountries)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    // Fetch human events to aggregate pages and referrers
    const events = await fetchAll<{ path: string; referer: string | null; is_bot: boolean }>((from, to) =>
        supabaseAdmin.from('events').select('path, referer, is_bot').eq('is_bot', false).order('id').range(from, to));

    const rawPaths: Record<string, number> = {};
    const rawReferrers: Record<string, number> = {};

    events.forEach(e => {
        rawPaths[e.path] = (rawPaths[e.path] || 0) + 1;
        
        let ref = e.referer || "Direct";
        if (ref !== "Direct") {
            try {
                const url = new URL(ref);
                ref = url.hostname.replace("www.", "");
            } catch (err) {}
        }
        rawReferrers[ref] = (rawReferrers[ref] || 0) + 1;
    });

    const topPages = Object.entries(rawPaths)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    const topReferrers = Object.entries(rawReferrers)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return (
        <div className="p-6 space-y-6 h-full flex flex-col overflow-y-auto">
            <PageHeader title="Analytics Dashboard" subtitle="Aggregated metrics and intelligence from all recorded sessions." />

            <AnalyticsCharts 
                browsers={browsers} 
                os={os} 
                countries={countries} 
                visitorTypes={visitorTypes}
                topPages={topPages}
                topReferrers={topReferrers}
            />
        </div>
    );
}
