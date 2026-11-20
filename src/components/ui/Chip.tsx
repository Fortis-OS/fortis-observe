import type { ReactNode } from "react";

/** Pill with a red outline when on. A button when it has an onClick, a label otherwise. */
export function Chip({ children, on = false, onClick, className = "" }: {
    children: ReactNode;
    on?: boolean;
    onClick?: () => void;
    className?: string;
}) {
    const cls = `chip ${on ? "on" : ""} ${className}`;
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={`${cls} pressable hover:bg-faint`}>
                {children}
            </button>
        );
    }
    return <span className={cls}>{children}</span>;
}
