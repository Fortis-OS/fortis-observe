import { LiveFeed } from "@/components/LiveFeed";
import { PageHeader } from "@/components/ui";

export default function LivePage() {
    return (
        <div className="p-4 md:p-6 flex flex-col gap-6 h-full">
            <PageHeader title="Live Telemetry Feed" subtitle="Real-time stream of all incoming portfolio events." />
            <div className="glass p-[18px] flex-1 min-h-[360px] flex flex-col overflow-hidden">
                <LiveFeed />
            </div>
        </div>
    );
}
