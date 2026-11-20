import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/jwt";

/** Registered security keys: list them, or remove one with ?id=. Admin only. */
export async function GET(req: NextRequest) {
    if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from("admin_devices")
        .select("id, credential_id, transports, counter, created_at")
        .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });

    return NextResponse.json({
        devices: (data ?? []).map((d) => ({
            id: d.id,
            // enough of the credential to tell keys apart, not the whole thing
            credential: `${String(d.credential_id).slice(0, 10)}…`,
            transports: d.transports ?? [],
            uses: d.counter,
            createdAt: d.created_at,
        })),
    }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest) {
    if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabaseAdmin.from("admin_devices").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
    return NextResponse.json({ success: true });
}
