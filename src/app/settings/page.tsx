"use client";

import { useState } from "react";
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    const registerDevice = async () => {
        try {
            setStatus("Requesting challenge...");
            setError("");
            
            // 1. Get registration options from server
            const resp = await fetch('/api/auth/webauthn/generate-registration-options');
            if (!resp.ok) throw new Error("Failed to get registration options");
            const options = await resp.json();

            setStatus("Waiting for hardware key interaction...");

            // 2. Pass options to browser to trigger TouchID / YubiKey prompt
            const attResp = await startRegistration({ optionsJSON: options });

            setStatus("Verifying hardware signature...");

            // 3. Send signature back to server for verification
            const verificationResp = await fetch('/api/auth/webauthn/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            const verificationJSON = await verificationResp.json();

            if (verificationJSON && verificationJSON.verified) {
                setStatus("Device registered successfully!");
            } else {
                throw new Error("Hardware verification failed on server");
            }

        } catch (err: any) {
            console.error(err);
            setStatus("");
            setError(err.message || "Failed to register device.");
        }
    };

    return (
        <div className="p-4 md:p-6 flex flex-col gap-6">
            <PageHeader title="System Settings" subtitle="Security keys and access to this dashboard." />

            <section className="glass max-w-xl p-[18px] flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full border border-accent bg-accent-soft text-accent">
                        <Fingerprint className="w-5 h-5" />
                    </span>
                    <div>
                        <h2 className="text-[18px] text-fg leading-tight">Security keys</h2>
                        <p className="text-sm text-muted mt-1.5">
                            Bind a physical security key (YubiKey, Touch ID, Windows Hello) to this dashboard.
                            Once registered, you can unlock with it instead of the authenticator code.
                        </p>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="text-[13px] text-accent bg-accent-soft border border-accent/60 rounded-[12px] px-3 py-2">{error}</div>
                )}
                {status && (
                    <div role="status" className="text-[13px] text-fg bg-white/5 border border-line rounded-[12px] px-3 py-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-ok shrink-0" />{status}
                    </div>
                )}

                <button 
                    type="button"
                    onClick={registerDevice}
                    className="btn primary self-start"
                >
                    Register new key
                </button>
            </section>
        </div>
    );
}
