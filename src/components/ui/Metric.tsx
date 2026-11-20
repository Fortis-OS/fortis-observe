import type { LucideIcon } from "lucide-react";

/**
 * One compact metric (Metric.qml): icon, label, a big mono value and a
 * thin level bar. Bar and value turn red at or above `warnAt`.
 */
export function Metric({ icon: Icon, label, value, detail, ratio, warnAt = 0.85, className = "" }: {
    icon?: LucideIcon;
    label: string;
    value: string | number;
    detail?: string;
    /** 0..1; leave out for a value with no bar. */
    ratio?: number;
    warnAt?: number;
    className?: string;
}) {
    const r = ratio == null ? null : Math.max(0, Math.min(1, ratio));
    const hot = r != null && r >= warnAt;
    return (
        <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
            <div className="flex items-center gap-1.5 min-w-0">
                {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${hot ? "text-accent" : "text-muted"}`} />}
                <span className="caption !tracking-[1.5px] truncate">{label}</span>
                {detail && <span className="ml-auto font-mono text-[10px] text-muted shrink-0">{detail}</span>}
            </div>
            <div className={`font-mono text-[22px] leading-tight ${hot ? "text-accent" : "text-fg"}`}>
                {typeof value === "number" ? value.toLocaleString() : value}
            </div>
            {r != null && (
                <div className={`level ${hot ? "hot" : ""}`}>
                    <span style={{ width: `${r * 100}%` }} />
                </div>
            )}
        </div>
    );
}
