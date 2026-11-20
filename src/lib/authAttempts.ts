import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Brute-force protection for the TOTP login, kept in the `auth_attempts`
 * table (see supabase/migrations) so it holds across serverless instances.
 *
 * The limit is global, not per IP: there is one admin, and a 6-digit code
 * must not be guessable by spreading tries over many addresses. Security
 * keys are unaffected, so a lockout never shuts you out completely.
 */
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const REUSE_MS = 120 * 1000; // a used code stays used for its whole validity window

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

function tableMissing(error: { code?: string; message?: string } | null) {
    return !!error && (error.code === "42P01" || error.code === "PGRST205" || /auth_attempts/.test(error.message ?? ""));
}

/** Milliseconds until TOTP sign-in is allowed again (0 = allowed now). */
export async function totpLockedFor(): Promise<number> {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data, error } = await supabaseAdmin
        .from("auth_attempts")
        .select("at")
        .eq("method", "totp")
        .eq("ok", false)
        .gte("at", since)
        .order("at", { ascending: true });

    if (error) {
        if (tableMissing(error)) {
            console.warn("[auth] auth_attempts table missing: TOTP rate limit is OFF until the migration is run");
            return 0;
        }
        throw error;
    }
    if (!data || data.length < MAX_FAILURES) return 0;
    // Locked until enough of the oldest failures fall out of the window.
    const unlockAt = new Date(data[data.length - MAX_FAILURES].at).getTime() + WINDOW_MS;
    return Math.max(0, unlockAt - Date.now());
}

/** True if this exact code already signed someone in within its validity window. */
export async function totpCodeAlreadyUsed(code: string): Promise<boolean> {
    const since = new Date(Date.now() - REUSE_MS).toISOString();
    const { data, error } = await supabaseAdmin
        .from("auth_attempts")
        .select("id")
        .eq("method", "totp")
        .eq("ok", true)
        .eq("code_hash", hash(code))
        .gte("at", since)
        .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
}

export async function recordAttempt(method: "totp" | "webauthn", ok: boolean, ip: string, code?: string) {
    const { error } = await supabaseAdmin.from("auth_attempts").insert({
        method, ok, ip, code_hash: ok && code ? hash(code) : null,
    });
    if (error && !tableMissing(error)) console.error("[auth] could not record attempt:", error.message);
}

export function clientIp(req: Request) {
    return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
