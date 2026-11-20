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
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageHeader title="Visitor Sessions" subtitle="Unique identified sessions across the network." />

            <div className="glass-panel flex-1 overflow-hidden flex flex-col">
                <VisitorTable initialSessions={sessions || []} />
            </div>
        </div>
    );
}
