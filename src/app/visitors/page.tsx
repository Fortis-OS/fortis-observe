import { VisitorTable } from "@/components/VisitorTable";
import { PageHeader, RangeChips } from "@/components/ui";
import { parseRange } from "@/lib/range";
import { getVisitorList } from "@/lib/stats";

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function VisitorsPage({ searchParams }: { searchParams: SearchParams }) {
    const range = parseRange((await searchParams).range, "30d");
    const people = await getVisitorList(range.from, range.to, 300);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader
                title="Visitors"
                subtitle="People seen in this range: one row per browser, however many networks it came from."
                right={<RangeChips current={range.key} basePath="/visitors" />}
            />

            <div className="glass flex-1 min-h-0 overflow-hidden flex flex-col">
                <VisitorTable people={people} />
            </div>
        </div>
    );
}
