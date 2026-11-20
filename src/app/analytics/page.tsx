import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { PageHeader, RangeChips } from "@/components/ui";
import { parseRange } from "@/lib/range";
import { getOverview, getTop, getDaily, getFirstEventAt } from "@/lib/stats";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
    const range = parseRange((await searchParams).range, "30d");

    // "All time" starts the daily chart at the first recorded event, not at the epoch.
    const dailyFrom = range.key === "all" ? (await getFirstEventAt()) ?? range.from : range.from;

    const [overview, countries, browsers, os, devices, topPages, topReferrers, daily] = await Promise.all([
        getOverview(range.from, range.to),
        getTop("country", range.from, range.to, 8),
        getTop("browser", range.from, range.to, 6),
        getTop("os", range.from, range.to, 6),
        getTop("device", range.from, range.to, 4),
        getTop("path", range.from, range.to, 8),
        getTop("referrer", range.from, range.to, 6),
        getDaily(dailyFrom, range.to),
    ]);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 min-h-full">
            <PageHeader
                title="Analytics Dashboard"
                subtitle="Humans only, bots filtered out. Regions, browsers and systems count people; pages count views."
                right={<RangeChips current={range.key} basePath="/analytics" />}
            />

            <AnalyticsCharts
                rangeLabel={range.label}
                daily={daily}
                countries={countries}
                browsers={browsers}
                os={os}
                devices={devices}
                visitors={overview.visitors}
                newVisitors={overview.new_visitors}
                topPages={topPages}
                topReferrers={topReferrers}
            />
        </div>
    );
}
