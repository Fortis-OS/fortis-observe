import { supabaseAdmin } from "@/lib/supabase";
import { VisitorTable } from "@/components/VisitorTable";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function VisitorsPage() {
    const { data: sessions, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(100);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader title="Visitor Sessions" subtitle="Unique identified sessions across the network." />

            <div className="glass flex-1 min-h-0 overflow-hidden flex flex-col">
                <VisitorTable initialSessions={sessions || []} />
            </div>
        </div>
    );
}
