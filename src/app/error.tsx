"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

/** Frost-styled error screen for any page that fails to load. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const migration = /migration/i.test(error.message);
    return (
        <div className="p-4 md:p-6 h-full flex items-center justify-center">
            <div className="glass p-8 max-w-md w-full flex flex-col items-center text-center gap-4">
                <span className="grid place-items-center w-12 h-12 rounded-full border border-accent bg-accent-soft text-accent">
                    <AlertTriangle className="w-6 h-6" />
                </span>
                <h1 className="text-[20px] tracking-[3px] uppercase text-fg">Couldn&apos;t load this page</h1>
                <p className="text-sm text-muted">
                    {migration
                        ? error.message
                        : "Something failed while reading the data. If you have just deployed, check that every SQL file in supabase/migrations has been run in Supabase."}
                </p>
                {error.digest && <p className="font-mono text-[11px] text-muted">ref {error.digest}</p>}
                <button type="button" onClick={reset} className="btn primary">
                    <RotateCw className="w-4 h-4" /> Try again
                </button>
            </div>
        </div>
    );
}
