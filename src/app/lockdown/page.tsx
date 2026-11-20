"use client";

import { useState } from "react";
import { Shield, ShieldCheck, KeyRound, Fingerprint } from "lucide-react";
import { useIstClock } from "@/components/command/Chronos";
import { startAuthentication } from '@simplewebauthn/browser';

export default function LockdownPage() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("AWAITING_INPUT");

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("VERIFYING");
        setError("");

        try {
            const res = await fetch("/api/auth/totp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
            });
            const data = await res.json();
            
            if (data.success) {
                setStatus("GRANTED");
                window.location.href = "/";
            } else {
                setStatus("AWAITING_INPUT");
                setError(data.error || "ACCESS DENIED");
            }
        } catch (err) {
            setStatus("AWAITING_INPUT");
            setError("NETWORK ERROR");
        }
    };

    const handleWebAuthnLogin = async () => {
        try {
            setStatus("VERIFYING");
            setError("");
            
            const resp = await fetch('/api/auth/webauthn/generate-authentication-options');
            if (!resp.ok) throw new Error("Failed to get challenge");
            const options = await resp.json();
            
            const authResp = await startAuthentication({ optionsJSON: options });
            
            const verificationResp = await fetch('/api/auth/webauthn/verify-authentication', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authResp)
            });
            
            const verificationJSON = await verificationResp.json();
            if (verificationJSON && verificationJSON.verified) {
                setStatus("GRANTED");
                window.location.href = "/";
            } else {
                setStatus("AWAITING_INPUT");
                setError("Hardware verification failed.");
            }
        } catch (err: any) {
            setStatus("AWAITING_INPUT");
            setError(err.message || "Hardware authentication failed.");
        }
    };

    const now = useIstClock();
    const granted = status === 'GRANTED';
    const verifying = status === 'VERIFYING';

    return (
        <div className="min-h-full flex flex-col items-center justify-center gap-10 p-4">
            {/* The Frost clock */}
            <div className="text-center">
                <div className="font-mono text-[72px] md:text-[96px] leading-none font-medium text-fg">
                    {now?.hm ?? "--:--"}
                    <span className="text-[24px] md:text-[28px] text-accent ml-2">{now ? `:${now.s}` : ""}</span>
                </div>
                <div className="mt-3 text-[15px] uppercase tracking-[4px] text-fg min-h-[1.2em]">{now?.day ?? "\u00a0"}</div>
                <div className="mt-1 text-[13px] uppercase tracking-[3px] text-accent min-h-[1.2em]">{now?.date ?? "\u00a0"}</div>
            </div>

            {/* Glass password card */}
            <div className="glass w-full max-w-sm p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <span
                        className={`grid place-items-center w-10 h-10 rounded-full border transition-colors duration-500 ${
                            granted ? "border-ok text-ok bg-ok/15" : "border-accent text-accent bg-accent-soft"
                        }`}
                    >
                        {granted ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </span>
                    <div>
                        <h1 className="text-[18px] tracking-[2px] uppercase text-fg leading-tight">System lockdown</h1>
                        <p className="caption !tracking-[1.5px] !text-[10px] mt-0.5">Unauthorised access prohibited</p>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="text-[13px] text-accent bg-accent-soft border border-accent/60 rounded-[12px] px-3 py-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleVerifyTotp} className="flex flex-col gap-3">
                    <label className="caption flex items-center gap-2" htmlFor="totp">
                        <KeyRound className="w-3.5 h-3.5" /> Authenticator code
                    </label>
                    <input
                        id="totp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="field text-center font-mono text-[30px] tracking-[0.6em] !py-3 !pl-[calc(14px+0.6em)]"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={token.length !== 6 || verifying}
                        className="btn primary w-full !py-3"
                    >
                        {verifying ? 'Verifying…' : 'Unlock'}
                    </button>
                </form>

                <div className="flex items-center gap-3 text-muted">
                    <div className="h-px flex-1 bg-faint" />
                    <span className="caption !text-[10px]">or</span>
                    <div className="h-px flex-1 bg-faint" />
                </div>

                <button
                    type="button"
                    onClick={handleWebAuthnLogin}
                    disabled={verifying}
                    className="btn w-full !py-3 group"
                >
                    <Fingerprint className="w-5 h-5 group-hover:text-accent transition-colors" />
                    Use security key
                </button>
            </div>
        </div>
    );
}
