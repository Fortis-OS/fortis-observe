import { GlobeWrapper } from "@/components/GlobeWrapper";
import { supabaseAdmin } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function MapPage() {
    const { data: globeSessions } = await supabaseAdmin.from('sessions').select('country, city, ip_address, latitude, longitude').limit(500);

    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageHeader title="Fortis Radar" subtitle="3D Geographic visualization of traffic sources and endpoints." />
            <div className="glass-panel flex-1 flex items-center justify-center relative overflow-hidden">
                <GlobeWrapper activeSessions={globeSessions || []} />
            </div>
        </div>
    );
}
