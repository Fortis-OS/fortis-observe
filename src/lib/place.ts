/**
 * Vercel's x-vercel-ip-city header is URL-encoded ("New%20York%20City"),
 * and older rows were stored that way. Decode for display.
 */
export function place(value: string | null | undefined) {
    if (!value) return "";
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
