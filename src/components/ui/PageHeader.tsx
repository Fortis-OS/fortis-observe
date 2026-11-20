import type { ReactNode } from "react";

/**
 * The header every page uses, after Frost's Chronos card: a big
 * letter-spaced title, an optional red line under it, a muted subtitle,
 * and anything on the right (status chips, timestamps).
 */
export function PageHeader({ title, eyebrow, subtitle, right }: {
    title: string;
    /** Red caption under the title, like Chronos's date line. */
    eyebrow?: ReactNode;
    subtitle?: ReactNode;
    right?: ReactNode;
}) {
    return (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="text-[30px] md:text-[36px] leading-none uppercase tracking-[4px] text-fg">{title}</h1>
                {eyebrow && (
                    <div className="mt-2 text-[13px] uppercase tracking-[3px] text-accent">{eyebrow}</div>
                )}
                {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            </div>
            {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
        </header>
    );
}
