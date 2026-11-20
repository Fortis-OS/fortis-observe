import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// This endpoint is triggered by Vercel Cron
export async function GET(request: Request) {
    // Vercel Cron sends "Authorization: Bearer $CRON_SECRET". The route is outside
    // the login proxy, so without a secret configured it refuses to run at all.
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return new NextResponse("CRON_SECRET is not set", { status: 503 });
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const start = Date.now();
    let statusCode = 0;
    
    try {
        // Ping the portfolio health endpoint
        const res = await fetch("https://ganeshangadi.online/health", { cache: "no-store" });
        statusCode = res.status;
    } catch (e) {
        console.error("Ping failed:", e);
        statusCode = 500;
    }

    const latencyMs = Date.now() - start;

    // Log the ping to Supabase
    const { error } = await supabaseAdmin
        .from("uptime_logs")
        .insert([{
            endpoint: "https://ganeshangadi.online",
            status_code: statusCode,
            latency_ms: latencyMs
        }]);

    if (error) {
        console.error("Failed to insert uptime log:", error);
        return NextResponse.json({ error: "DB Insert Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, latencyMs, statusCode });
}
