"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Breakdown } from "@/lib/stats";

const fmtDay = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", opts);

export function ClicksChart({ data }: { data: Breakdown[] }) {
  return (
    <div className="clicks-chart h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickFormatter={(k) => fmtDay(k, { day: "2-digit", month: "2-digit" })}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ className: "clicks-chart-cursor" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Breakdown;
              return (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-md">
                  <p className="text-[var(--text-secondary)]">
                    {fmtDay(p.label, { weekday: "short", day: "2-digit", month: "short" })}
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums">{p.count.toLocaleString("pt-BR")} cliques</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" className="clicks-chart-bar" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
