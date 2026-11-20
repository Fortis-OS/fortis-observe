// Server only: the last 24 hours of events, one bucket per hour.
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";

export type HourBucket = {
    /** Hour of day (0–23) in IST, for labels. */
    hour: number;
    human: number;
    bot: number;
};

const HOUR = 3600 * 1000;

function istHour(ms: number) {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(ms));
}

/** 24 buckets, oldest first; the last one is the current hour. */
export async function getLast24Hours(): Promise<HourBucket[]> {
    const thisHourStart = Math.floor(Date.now() / HOUR) * HOUR;
    const dayStart = thisHourStart - 23 * HOUR;

    const events = await fetchAll<{ timestamp: string; is_bot: boolean }>((from, to) =>
        supabaseAdmin.from("events").select("timestamp, is_bot")
            .gte("timestamp", new Date(dayStart).toISOString())
            .order("id").range(from, to));

    const buckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({ hour: istHour(dayStart + i * HOUR), human: 0, bot: 0 }));
    for (const ev of events) {
        const i = Math.floor((new Date(ev.timestamp).getTime() - dayStart) / HOUR);
        if (i >= 0 && i < 24) buckets[i][ev.is_bot ? "bot" : "human"] += 1;
    }
    return buckets;
}
