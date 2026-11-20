import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCorsHeaders } from "@/lib/cors";
import { bodyTooLarge, throttled, parsePageUpdate } from "@/lib/telemetryGuard";
import { clientIp } from "@/lib/authAttempts";

export async function OPTIONS(req: NextRequest) {
    return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
    const corsHeaders = getCorsHeaders(req);
    try {
        if (bodyTooLarge(req)) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: corsHeaders });
        }
        if (throttled(clientIp(req))) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: corsHeaders });
        }

        const update = parsePageUpdate(await req.json().catch(() => null));
        if (!update) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: corsHeaders });
        }
        const { visitorId, path, scrollDepth, durationMs } = update;

        const { error } = await supabaseAdmin.rpc("update_telemetry", {
            p_visitor_uuid: visitorId,
            p_path: path,
            p_scroll_depth: scrollDepth || null,
            p_duration_ms: durationMs || null
        });

        if (error) {
            console.error("Update RPC error:", error);
            return NextResponse.json({ error: "Database error" }, { status: 500, headers: corsHeaders });
        }

        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Tracking update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}
