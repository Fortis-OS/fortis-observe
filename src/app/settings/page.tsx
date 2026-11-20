"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, KeyRound, Trash2, LogOut } from "lucide-react";
import { PageHeader, Caption } from "@/components/ui";

type Device = { id: string; credential: string; transports: string[]; uses: number; createdAt: string };

export default function SettingsPage() {
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [devices, setDevices] = useState<Device[] | null>(null);

    const loadDevices = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/webauthn/devices', { cache: 'no-store' });
            if (!res.ok) throw new Error();
            const { devices } = await res.json();
            setDevices(devices);
        } catch {
            setError("Could not load your security keys.");
        }
    }, []);

    useEffect(() => {
        // fetch on mount; setState happens after the request resolves
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDevices();
    }, [loadDevices]);

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
                setStatus("Key registered.");
                loadDevices();
            } else {
                throw new Error("Hardware verification failed on server");
            }

        } catch (err) {
            console.error(err);
            setStatus("");
            setError(err instanceof Error ? err.message : "Failed to register device.");
        }
    };

    const removeDevice = async (d: Device) => {
        if (!window.confirm(`Remove security key ${d.credential}? It will no longer unlock this dashboard.`)) return;
        setError("");
        const res = await fetch(`/api/auth/webauthn/devices?id=${encodeURIComponent(d.id)}`, { method: 'DELETE' });
        if (res.ok) {
            setStatus("Key removed.");
            loadDevices();
        } else {
            setError("Could not remove that key.");
        }
    };

    const signOut = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/lockdown';
    };

    const date = (iso: string) =>
        new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

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

                <div className="flex flex-col gap-2">
                    <Caption className="flex items-center gap-2">
                        Registered keys {devices && <span className="font-mono text-fg">{devices.length}</span>}
                    </Caption>
                    {devices === null ? (
                        <p className="text-sm text-muted">Loading…</p>
                    ) : devices.length === 0 ? (
                        <p className="text-sm text-muted">No keys yet. You sign in with the authenticator code only.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {devices.map((d) => (
                                <li key={d.id} className="flex items-center gap-3 rounded-[12px] border border-faint bg-white/[0.03] px-3 py-2.5">
                                    <KeyRound className="w-4 h-4 text-muted shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-mono text-xs text-fg truncate">{d.credential}</div>
                                        <div className="text-[11px] text-muted mt-0.5">
                                            Added {date(d.createdAt)}
                                            {d.transports.length > 0 && <> · {d.transports.join(", ")}</>}
                                            {" · "}<span className="font-mono">{d.uses}</span> uses
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDevice(d)}
                                        aria-label={`Remove key ${d.credential}`}
                                        className="pressable p-2 rounded-full text-muted hover:text-accent hover:bg-accent-soft"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    onClick={registerDevice}
                    className="btn primary self-start"
                >
                    Register new key
                </button>
            </section>

            <section className="glass max-w-xl p-[18px] flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-[16px] text-fg leading-tight">Sign out</h2>
                    <p className="text-sm text-muted mt-1">End the session in this browser.</p>
                </div>
                <button type="button" onClick={signOut} className="btn shrink-0">
                    <LogOut className="w-4 h-4" /> Sign out
                </button>
            </section>
        </div>
    );
}
