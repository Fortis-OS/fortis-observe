import { GlobeWrapper } from "@/components/GlobeWrapper";
import { supabaseAdmin } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";

export const dynamic = 'force-dynamic';

export default async function MapPage() {
    const { data: globeSessions } = await supabaseAdmin.from('sessions').select('country, city, ip_address, latitude, longitude').limit(500);

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader title="Fortis Radar" subtitle="3D Geographic visualization of traffic sources and endpoints." />
            <div className="glass flex-1 min-h-[420px] flex items-center justify-center relative overflow-hidden">
                <GlobeWrapper activeSessions={globeSessions || []} />
            </div>
        </div>
    );
}
