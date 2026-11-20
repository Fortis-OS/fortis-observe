"use client";

import dynamic from "next/dynamic";
import { Globe2 } from "lucide-react";

// Disable SSR for the globe since it relies on WebGL and the window object
const CyberGlobe = dynamic(() => import("./CyberGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center ">
        <Globe2 className="w-12 h-12 text-accent animate-pulse mb-4" />
        <p className="caption">Initialising radar…</p>
    </div>
  )
});

export function GlobeWrapper({ activeSessions }: { activeSessions?: any[] }) {
  return <CyberGlobe activeSessions={activeSessions || []} />;
}
