import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type GlassCardProps<T extends ElementType> = {
    as?: T;
    /** Lighter, more see-through glass for nested or secondary cards. */
    soft?: boolean;
    /** Add the standard 18px Frost padding. */
    padded?: boolean;
    className?: string;
    children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/** Frost's level-1 glass surface (GlassCard.qml). */
export function GlassCard<T extends ElementType = "div">({
    as, soft = false, padded = false, className = "", children, ...rest
}: GlassCardProps<T>) {
    const Tag = (as ?? "div") as ElementType;
    return (
        <Tag className={`${soft ? "glass-soft" : "glass"} ${padded ? "p-[18px]" : ""} ${className}`} {...rest}>
            {children}
        </Tag>
    );
}
