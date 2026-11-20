"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export function LiveFeed() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to new INSERTS on the 'events' table
    const channel = supabaseClient
      .channel('realtime_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        setEvents((prev) => {
           const newEvents = [payload.new, ...prev];
           return newEvents.slice(0, 50); // Keep last 50 events in memory to prevent DOM bloat
        });
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  if (events.length === 0) {
     return (
       <div className="flex items-center justify-center gap-2 text-muted text-sm mt-10">
         <span className="dot live text-accent" />
         Listening for telemetry…
       </div>
     );
  }

  return (
    <ul className="flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-2 pr-2">
      {events.map((ev) => {
        const timeString = new Date(ev.timestamp).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });
        return (
            <li key={ev.id} className="flex items-center gap-2.5 min-w-0">
                <span className="text-muted shrink-0">{timeString}</span>
                {ev.is_bot ? (
                    <span className="shrink-0 w-10 text-center rounded-full border border-accent bg-accent-soft text-accent text-[10px] leading-[16px]">bot</span>
                ) : (
                    <span className="shrink-0 w-10 text-center rounded-full border border-line text-fg text-[10px] leading-[16px]">in</span>
                )}
                <span className="text-fg truncate">{ev.path}</span>
            </li>
        );
      })}
    </ul>
  );
}
