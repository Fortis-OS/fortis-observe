"use client";

import type { ReactNode } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarList, Caption } from "@/components/ui";

type Datum = { name: string; value: number };

const ACCENT = "#F21D43";
const MUTED = "#9A9AA6";

// Frost glass tooltip
const tooltipProps = {
    cursor: { fill: "rgba(255,255,255,0.04)" },
    contentStyle: {
        background: "rgba(16,16,20,0.94)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        color: "#F2F2F5",
        fontSize: 12,
        fontFamily: "var(--font-jetbrains), monospace",
        backdropFilter: "blur(24px)",
    },
    labelStyle: { color: MUTED, marginBottom: 2 },
    itemStyle: { color: "#F2F2F5", padding: 0 },
};

function Card({ title, right, className = "", children }: {
    title: string;
    right?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={`glass p-[18px] flex flex-col gap-4 ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <Caption>{title}</Caption>
                {right}
            </div>
            {children}
        </section>
    );
}

const toItems = (data: Datum[]) => data.map((d) => ({ name: d.name || "Unknown", value: d.value }));

export function AnalyticsCharts({
    browsers, os, countries, visitorTypes = [], topPages = [], topReferrers = []
}: {
    browsers: Datum[], os: Datum[], countries: Datum[], visitorTypes?: Datum[], topPages?: Datum[], topReferrers?: Datum[]
}) {
    const newCount = visitorTypes.find((v) => v.name === "New")?.value ?? 0;
    const returningCount = visitorTypes.find((v) => v.name === "Returning")?.value ?? 0;
    const visitorTotal = newCount + returningCount;
    const returningShare = visitorTotal > 0 ? returningCount / visitorTotal : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

            {/* Top regions: the one real chart */}
            <Card title="Top regions" className="md:col-span-2 h-80">
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: MUTED, fontSize: 11, fontFamily: "var(--font-jetbrains), monospace" }}
                            />
                            <YAxis hide />
                            <Tooltip {...tooltipProps} />
                            <Bar
                                dataKey="value"
                                name="sessions"
                                fill={ACCENT}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                                background={{ fill: "rgba(255,255,255,0.05)", radius: 4 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* New vs returning */}
            <Card title="Visitor retention" className="md:h-80 justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[44px] leading-none text-fg">{Math.round(returningShare * 100)}%</span>
                        <span className="text-sm text-muted">come back</span>
                    </div>
                    <p className="text-xs text-muted">of {visitorTotal.toLocaleString()} sessions visited more than once</p>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex h-3 rounded-full overflow-hidden bg-faint gap-[2px]">
                        {returningCount > 0 && <div className="bg-accent rounded-full" style={{ width: `${returningShare * 100}%` }} />}
                        {newCount > 0 && <div className="bg-fill opacity-60 rounded-full flex-1" />}
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-1.5">
                            <span className="dot text-accent" /> <span className="text-muted">Returning</span>
                            <span className="font-mono text-fg">{returningCount.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="dot text-fill" /> <span className="text-muted">New</span>
                            <span className="font-mono text-fg">{newCount.toLocaleString()}</span>
                        </span>
                    </div>
                </div>
            </Card>

            <Card title="Top browsers">
                <BarList items={toItems(browsers)} empty="No browser data available." />
            </Card>

            <Card title="Operating systems">
                <BarList items={toItems(os)} empty="No OS data available." />
            </Card>

            <Card title="Top referrers">
                <BarList items={toItems(topReferrers)} empty="No referrer data available." />
            </Card>

            <Card title="Top pages" className="md:col-span-2 lg:col-span-3">
                <BarList
                    items={toItems(topPages).map((p, i) => ({ ...p, accent: i === 0 }))}
                    empty="No page data available."
                    className="font-mono"
                />
            </Card>

        </div>
    );
}
