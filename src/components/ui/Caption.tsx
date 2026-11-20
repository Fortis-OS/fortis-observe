import type { ReactNode } from "react";

/** Small uppercase caption, like "SYSTEM OBSERVATORY". */
export function Caption({ children, className = "", accent = false }: {
    children: ReactNode;
    className?: string;
    accent?: boolean;
}) {
    return <div className={`caption ${accent ? "!text-accent" : ""} ${className}`}>{children}</div>;
}
