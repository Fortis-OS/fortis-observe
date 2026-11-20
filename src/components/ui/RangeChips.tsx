import Link from "next/link";
import { RANGE_KEYS, type RangeKey } from "@/lib/range";

const LABELS: Record<RangeKey, string> = { today: "Today", "7d": "7d", "30d": "30d", all: "All" };

/**
 * Frost's profile chips (Chronos: Default / Focus / …) as a time-range
 * picker. Plain links, so it works without JavaScript and the range is in
 * the URL. `extra` keeps other query parameters (e.g. a humans/all filter).
 */
export function RangeChips({ current, basePath, extra = {} }: {
    current: RangeKey;
    basePath: string;
    extra?: Record<string, string | undefined>;
}) {
    return (
        <nav aria-label="Time range" className="flex items-center gap-1.5">
            {RANGE_KEYS.map((key) => {
                const params = new URLSearchParams();
                params.set("range", key);
                for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
                const on = key === current;
                return (
                    <Link
                        key={key}
                        href={`${basePath}?${params.toString()}`}
                        aria-current={on ? "true" : undefined}
                        className={`chip pressable ${on ? "on" : "hover:bg-faint hover:text-fg"}`}
                    >
                        {LABELS[key]}
                    </Link>
                );
            })}
        </nav>
    );
}
