"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSectionProps, HourlyPoint } from "@/types";

const GRID_STYLE = {
  stroke: "rgba(255,255,255,0.04)",
  strokeDasharray: "3 3" as const,
};

const TICK_PROPS = {
  fill: "#334155",
  fontSize: 11,
  fontFamily: "var(--font-jetbrains-mono)",
};

const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "#0f2040",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: 12,
};

const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "#f1f5f9",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: 12,
};

const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "#f1f5f9",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: 12,
};

const X_TICK_HOURS = [0, 4, 8, 12, 16, 20];

function normalizeScenario(scenario: string): string {
  return scenario.toLowerCase().replace(/-/g, "_");
}

function referenceHourForScenario(scenario: string): number {
  const s = normalizeScenario(scenario);
  if (s === "rush_hour" || s === "emergency") return 18;
  return 13;
}

/** Proxy hourly AQI when API points omit `aqi` (~1h lag vs traffic). */
function estimateHourlyAqi(points: HourlyPoint[], hour: number): number {
  const byHour = new Map(points.map((p) => [p.hour, p]));
  const lagHour = Math.max(0, hour - 1);
  const lag = byHour.get(lagHour);
  const ti = lag?.traffic_index ?? 0;
  return Math.round(Math.min(300, Math.max(20, 35 + ti * 1.2)));
}

type ChartRow = HourlyPoint & {
  incidentsScaled: number;
  co2Normalized: number;
  aqiResolved: number;
};

function buildRows(chartData: HourlyPoint[]): ChartRow[] {
  return chartData.map((p) => ({
    ...p,
    incidentsScaled: p.incidents * 4,
    co2Normalized: (p.co2 - 350) / 2,
    aqiResolved: p.aqi ?? estimateHourlyAqi(chartData, p.hour),
  }));
}

export default function ChartSection({
  chartData,
  currentScenario,
}: ChartSectionProps) {
  const refHour = referenceHourForScenario(currentScenario);
  const rows = useMemo(() => buildRows(chartData), [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-4 text-center font-[family:var(--font-space-grotesk)] text-[13px] text-[#64748b]">
        Нет данных для графиков
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-4">
        <h3 className="mb-3 font-[family:var(--font-space-grotesk)] text-[14px] font-medium leading-tight text-[#f1f5f9]">
          <span className="mr-1.5 text-[13px] leading-none">🚗</span>
          Транспортная нагрузка
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 23]}
                ticks={X_TICK_HOURS}
                tickFormatter={(h: number) => `${h}:00`}
                tick={TICK_PROPS}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <YAxis
                tick={TICK_PROPS}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
              />
              <ReferenceLine
                x={refHour}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 3"
                label={{
                  value: "сейчас",
                  position: "top",
                  fill: "#64748b",
                  fontSize: 10,
                  fontFamily: "var(--font-space-grotesk)",
                }}
              />
              <Line
                type="monotone"
                dataKey="traffic_index"
                name="traffic_index"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="incidentsScaled"
                name="incidents ×4"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-6 font-[family:var(--font-jetbrains-mono)] text-[11px]">
          <span className="text-[#3b82f6]">traffic_index</span>
          <span className="text-[#f59e0b]">incidents ×4</span>
        </div>
      </div>

      <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-4">
        <h3 className="mb-3 font-[family:var(--font-space-grotesk)] text-[14px] font-medium leading-tight text-[#f1f5f9]">
          <span className="mr-1.5 text-[13px] leading-none">🌫</span>
          Качество воздуха
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 23]}
                ticks={X_TICK_HOURS}
                tickFormatter={(h: number) => `${h}:00`}
                tick={TICK_PROPS}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <YAxis
                tick={TICK_PROPS}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
              />
              <ReferenceLine
                x={refHour}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 3"
                label={{
                  value: "сейчас",
                  position: "top",
                  fill: "#64748b",
                  fontSize: 10,
                  fontFamily: "var(--font-space-grotesk)",
                }}
              />
              <Line
                type="monotone"
                dataKey="aqiResolved"
                name="AQI"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="co2Normalized"
                name="CO2 норм."
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-6 font-[family:var(--font-jetbrains-mono)] text-[11px]">
          <span className="text-[#8b5cf6]">AQI</span>
          <span className="text-[#06b6d4]">CO2 норм.</span>
        </div>
        <p className="mt-3 font-[family:var(--font-space-grotesk)] text-[11px] italic leading-snug text-[#334155]">
          * Экология следует за трафиком с задержкой ~1 час
        </p>
      </div>
    </div>
  );
}
