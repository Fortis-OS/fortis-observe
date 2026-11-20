import type { NextRequest } from "next/server";

// Sites allowed to send telemetry from a browser.
export const ALLOWED_ORIGINS = [
    "https://ganeshangadi.online",
    "http://localhost:3000",
    "http://localhost:3001",
];

/** CORS headers for the telemetry endpoints: echo the origin only if it is on the list. */
export function getCorsHeaders(req: NextRequest) {
    const origin = req.headers.get("origin") || "";
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    };
}
