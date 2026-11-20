import { HardHat } from "lucide-react";

export function UnderConstruction({ title }: { title: string }) {
    return (
        <div className="p-6 h-full flex items-center justify-center">
            <div className="glass p-10 text-center max-w-md w-full flex flex-col items-center gap-4">
                <HardHat className="w-12 h-12 text-accent" />
                <h1 className="text-[22px] tracking-[3px] uppercase text-fg">{title}</h1>
                <p className="text-muted text-sm">This module is scheduled for future deployment.</p>
                <div className="mt-2 flex items-center gap-2 caption">
                    <span className="dot live text-accent" />
                    Module offline
                </div>
            </div>
        </div>
    );
}
