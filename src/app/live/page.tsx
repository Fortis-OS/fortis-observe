import { LiveFeed } from "@/components/LiveFeed";
import { PageHeader } from "@/components/ui";

export default function LivePage() {
    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageHeader title="Live Telemetry Feed" subtitle="Real-time stream of all incoming portfolio events." />
            <div className="glass-panel p-6 flex-1 flex flex-col overflow-hidden">
                <LiveFeed />
            </div>
        </div>
    );
}
