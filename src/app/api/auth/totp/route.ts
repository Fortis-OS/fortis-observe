import { NextResponse } from "next/server";
import { verifySync } from 'otplib';
import { signToken, SESSION_COOKIE } from "@/lib/jwt";
import { cookies } from "next/headers";
import { totpLockedFor, totpCodeAlreadyUsed, recordAttempt, clientIp } from "@/lib/authAttempts";

export async function POST(req: Request) {
    try {
        const secret = process.env.ADMIN_TOTP_SECRET;
        if (!secret) return NextResponse.json({ error: "Server misconfiguration: No TOTP secret." }, { status: 500 });

        const ip = clientIp(req);

        const lockedMs = await totpLockedFor();
        if (lockedMs > 0) {
            const minutes = Math.ceil(lockedMs / 60000);
            return NextResponse.json(
                { error: `Too many wrong codes. Try again in ${minutes} min, or use your security key.` },
                { status: 429, headers: { "Retry-After": String(Math.ceil(lockedMs / 1000)) } }
            );
        }

        const { token } = await req.json();
        const code = typeof token === "string" ? token.trim() : "";
        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
        }

        const { valid } = verifySync({ token: code, secret });

        if (valid && !(await totpCodeAlreadyUsed(code))) {
            await recordAttempt("totp", true, ip, code);
            const jwt = await signToken({ authenticated_via: 'totp' });

            const cookieStore = await cookies();
            cookieStore.set(SESSION_COOKIE, jwt, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 // 24 hours
            });

            return NextResponse.json({ success: true });
        }

        await recordAttempt("totp", false, ip);
        return NextResponse.json({ error: "ACCESS DENIED. INVALID TOKEN." }, { status: 401 });
    } catch (e) {
        console.error("[auth] totp:", e);
        return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
    }
}
