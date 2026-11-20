export type BarItem = {
    name: string;
    value: number;
    /** Small tag after the name, like "phone" / "laptop" in Screen Time. */
    tag?: string;
    /** Draw this row's bar and tag in red (the second series is white). */
    accent?: boolean;
};

/**
 * Ranked list in the style of Frost's Screen Time "top apps": name, mono
 * value, and a 3px bar scaled to the largest value. The top row is full
 * strength, the rest dimmed.
 */
export function BarList({ items, format = (v) => v.toLocaleString(), empty = "Nothing yet.", className = "" }: {
    items: BarItem[];
    format?: (v: number) => string;
    empty?: string;
    className?: string;
}) {
    if (items.length === 0) {
        return <p className={`text-muted text-sm ${className}`}>{empty}</p>;
    }
    const peak = Math.max(...items.map((i) => i.value), 1);
    return (
        <ul className={`flex flex-col gap-[9px] ${className}`}>
            {items.map((item, i) => (
                <li key={item.name} className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-[13px] text-fg truncate" title={item.name}>{item.name}</span>
                        {item.tag && (
                            <span className={`text-[10px] shrink-0 ${item.accent ? "text-accent" : "text-muted"}`}>{item.tag}</span>
                        )}
                        <span className="ml-auto font-mono text-[11px] text-muted shrink-0">{format(item.value)}</span>
                    </div>
                    <div className="level">
                        <span
                            style={{
                                width: `${(item.value / peak) * 100}%`,
                                background: item.accent ? "var(--color-accent)" : "var(--color-fill)",
                                opacity: i === 0 ? 1 : 0.6,
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
