export type HourBucket = {
    /** Hour of day (0–23) in IST, for labels. */
    hour: number;
    human: number;
    bot: number;
};

function label(hour: number) {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

/**
 * Frost Screen Time's 24-hour strip: one stacked bar per hour, humans in red
 * at the bottom and bots in white on top. The newest hour (last) is full
 * strength, the others dimmed.
 */
export function HourStrip({ buckets }: { buckets: HourBucket[] }) {
    const peak = Math.max(1, ...buckets.map((b) => b.human + b.bot));
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-[3px] h-16">
                {buckets.map((b, i) => {
                    const now = i === buckets.length - 1;
                    return (
                        <div
                            key={i}
                            className="relative flex-1 h-full flex flex-col-reverse"
                            title={`${label(b.hour)}: ${b.human} human, ${b.bot} bot`}
                        >
                            <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-[1px] bg-faint" />
                            {b.human > 0 && (
                                <div
                                    className="relative rounded-[2px] bg-accent"
                                    style={{ height: `${Math.max(3, (b.human / peak) * 100)}%`, opacity: now ? 1 : 0.7 }}
                                />
                            )}
                            {b.bot > 0 && (
                                <div
                                    className="relative rounded-[2px] bg-fill"
                                    style={{ height: `${Math.max(3, (b.bot / peak) * 100)}%`, opacity: now ? 0.95 : 0.5 }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-[3px] font-mono text-[9px] text-muted">
                {buckets.map((b, i) => (
                    <div key={i} className="flex-1 overflow-visible whitespace-nowrap">
                        {b.hour % 6 === 0 ? label(b.hour) : ""}
                    </div>
                ))}
            </div>
        </div>
    );
}
