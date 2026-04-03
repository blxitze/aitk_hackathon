"use client";

import { Car, Wind } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
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
import { translateScenario } from "@/lib/utils";
import type {
  ChartSectionProps,
  HourlyPoint,
  ThemeMode,
  UiLanguage,
} from "@/types";

const CHART_COLORS: Record<
  ThemeMode,
  {
    grid: string;
    tick: string;
    axisLine: string;
    refLine: string;
    tooltip_bg: string;
    tooltip_border: string;
    tooltip_text: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
  }
> = {
  dark: {
    grid: "rgba(255,255,255,0.04)",
    tick: "#334155",
    axisLine: "rgba(255,255,255,0.06)",
    refLine: "rgba(255,255,255,0.2)",
    tooltip_bg: "#0f2040",
    tooltip_border: "rgba(255,255,255,0.12)",
    tooltip_text: "#f1f5f9",
    line1: "#3b82f6",
    line2: "#f59e0b",
    line3: "#8b5cf6",
    line4: "#06b6d4",
  },
  light: {
    grid: "rgba(0,0,0,0.06)",
    tick: "#94a3b8",
    axisLine: "rgba(0,0,0,0.08)",
    refLine: "rgba(0,0,0,0.12)",
    tooltip_bg: "#ffffff",
    tooltip_border: "rgba(0,0,0,0.08)",
    tooltip_text: "#0f172a",
    line1: "#2563eb",
    line2: "#d97706",
    line3: "#7c3aed",
    line4: "#0891b2",
  },
};

const X_TICK_HOURS = [0, 4, 8, 12, 16, 20];

const CHART_LABELS: Record<
  UiLanguage,
  {
    transport: string;
    ecology: string;
    lagNote: string;
    now: string;
    emptyState: string;
    legendTraffic: string;
    legendIncidents: string;
    legendAqi: string;
    legendCo2: string;
    tooltipHour: string;
  }
> = {
  ru: {
    transport: "Транспортная нагрузка",
    ecology: "Качество воздуха",
    lagNote: "* Экология следует за трафиком с задержкой ~1 час",
    now: "сейчас",
    emptyState: "Нет данных для графиков",
    legendTraffic: "Индекс трафика",
    legendIncidents: "Инциденты ×4",
    legendAqi: "ИКВ",
    legendCo2: "CO₂ норм.",
    tooltipHour: "Час",
  },
  kz: {
    transport: "Көлік жүктемесі",
    ecology: "Ауа сапасы",
    lagNote: "* Экология трафиктен ~1 сағат кешігіп өзгереді",
    now: "қазір",
    emptyState: "Графиктер үшін дерек жоқ",
    legendTraffic: "Қозғалыс индексі",
    legendIncidents: "Оқиғалар ×4",
    legendAqi: "АКИ",
    legendCo2: "CO₂ норм.",
    tooltipHour: "Сағат",
  },
};

function tooltipMetricLookup(lang: UiLanguage): Record<string, string> {
  const L = CHART_LABELS[lang];
  const R = CHART_LABELS.ru;
  const m: Record<string, string> = {
    traffic_index: L.legendTraffic,
    incidentsScaled: L.legendIncidents,
    aqiResolved: L.legendAqi,
    co2Normalized: L.legendCo2,
    incidents: L.legendIncidents,
    aqi: L.legendAqi,
    co2: L.legendCo2,
    temperature: "Температура",
    avg_speed: lang === "kz" ? "Жылдамдық" : "Скорость",
  };
  m[R.legendTraffic] = L.legendTraffic;
  m[R.legendIncidents] = L.legendIncidents;
  m[R.legendAqi] = L.legendAqi;
  m[R.legendCo2] = L.legendCo2;
  m[L.legendTraffic] = L.legendTraffic;
  m[L.legendIncidents] = L.legendIncidents;
  m[L.legendAqi] = L.legendAqi;
  m[L.legendCo2] = L.legendCo2;
  m["ИКВ"] = L.legendAqi;
  return m;
}

function normalizeScenario(scenario: string): string {
  return scenario.toLowerCase().replace(/-/g, "_");
}

function referenceHourForScenario(scenario: string): number {
  const s = normalizeScenario(scenario);
  if (s === "morning_peak") return 8;
  if (s === "night") return 23;
  if (s === "rush_hour" || s === "emergency") return 18;
  return 13;
}

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
  language = "ru",
  theme,
}: ChartSectionProps) {
  const lang: UiLanguage = language;
  const L = CHART_LABELS[lang];
  const metricLookup = useMemo(() => tooltipMetricLookup(lang), [lang]);
  const c = CHART_COLORS[theme];

  const gridStyle = useMemo(
    () => ({
      stroke: c.grid,
      strokeDasharray: "3 3" as const,
    }),
    [c.grid]
  );

  const tickProps = useMemo(
    () => ({
      fill: c.tick,
      fontSize: 11,
      fontFamily: "var(--font-jetbrains-mono)",
    }),
    [c.tick]
  );

  const tooltipContentStyle = useMemo(
    (): CSSProperties => ({
      backgroundColor: c.tooltip_bg,
      border: `1px solid ${c.tooltip_border}`,
      borderRadius: "8px",
      fontFamily: "var(--font-jetbrains-mono)",
      fontSize: 12,
    }),
    [c]
  );

  const tooltipLabelStyle = useMemo(
    (): CSSProperties => ({
      color: c.tooltip_text,
      fontFamily: "var(--font-jetbrains-mono)",
      fontSize: 12,
    }),
    [c.tooltip_text]
  );

  const tooltipItemStyle = useMemo(
    (): CSSProperties => ({
      color: c.tooltip_text,
      fontFamily: "var(--font-jetbrains-mono)",
      fontSize: 12,
    }),
    [c.tooltip_text]
  );

  const chartTooltipFormatter = useCallback(
    (value: unknown, name: unknown): [ReactNode, ReactNode] => {
      const key = String(name ?? "");
      const displayName = metricLookup[key] ?? key;
      const v = Array.isArray(value) ? value[0] : value;
      return [v as ReactNode, displayName];
    },
    [metricLookup]
  );

  const chartTooltipLabelFormatter = useCallback(
    (label: unknown): string => {
      if (label === null || label === undefined) return "";
      return `${L.tooltipHour} ${label}:00`;
    },
    [L.tooltipHour]
  );

  const refHour = referenceHourForScenario(currentScenario);
  const rows = useMemo(() => buildRows(chartData), [chartData]);

  const lineNames = useMemo(
    () => ({
      traffic: CHART_LABELS[lang].legendTraffic,
      incidents: CHART_LABELS[lang].legendIncidents,
      aqi: CHART_LABELS[lang].legendAqi,
      co2: CHART_LABELS[lang].legendCo2,
    }),
    [lang]
  );

  const cardClass =
    "rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] p-4";

  if (chartData.length === 0) {
    return (
      <div
        className={`${cardClass} text-center font-[family:var(--font-space-grotesk)] text-[13px] text-[var(--text-secondary)]`}
      >
        {L.emptyState}
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-4"
      aria-label={`${translateScenario(currentScenario, lang)}`}
    >
      <div className={cardClass}>
        <h3 className="mb-3 flex items-center gap-2 font-[family:var(--font-space-grotesk)] text-[14px] font-medium leading-tight text-[var(--text-primary)]">
          <Car
            size={18}
            className="shrink-0 text-[var(--text-primary)]"
            strokeWidth={2}
          />
          {L.transport}
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...gridStyle} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 23]}
                ticks={X_TICK_HOURS}
                tickFormatter={(h: number) => `${h}:00`}
                tick={tickProps}
                tickLine={{ stroke: c.axisLine }}
                axisLine={{ stroke: c.axisLine }}
              />
              <YAxis
                tick={tickProps}
                tickLine={{ stroke: c.axisLine }}
                axisLine={{ stroke: c.axisLine }}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={chartTooltipFormatter}
                labelFormatter={chartTooltipLabelFormatter}
              />
              <ReferenceLine
                x={refHour}
                stroke={c.refLine}
                strokeDasharray="3 3"
                label={{
                  value: L.now,
                  position: "top",
                  fill: c.tick,
                  fontSize: 10,
                  fontFamily: "var(--font-space-grotesk)",
                }}
              />
              <Line
                type="monotone"
                dataKey="traffic_index"
                name={lineNames.traffic}
                stroke={c.line1}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="incidentsScaled"
                name={lineNames.incidents}
                stroke={c.line2}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-6 font-[family:var(--font-jetbrains-mono)] text-[11px]">
          <span style={{ color: c.line1 }}>{lineNames.traffic}</span>
          <span style={{ color: c.line2 }}>{lineNames.incidents}</span>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="mb-3 flex items-center gap-2 font-[family:var(--font-space-grotesk)] text-[14px] font-medium leading-tight text-[var(--text-primary)]">
          <Wind
            size={18}
            className="shrink-0 text-[var(--text-primary)]"
            strokeWidth={2}
          />
          {L.ecology}
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...gridStyle} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[0, 23]}
                ticks={X_TICK_HOURS}
                tickFormatter={(h: number) => `${h}:00`}
                tick={tickProps}
                tickLine={{ stroke: c.axisLine }}
                axisLine={{ stroke: c.axisLine }}
              />
              <YAxis
                tick={tickProps}
                tickLine={{ stroke: c.axisLine }}
                axisLine={{ stroke: c.axisLine }}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={chartTooltipFormatter}
                labelFormatter={chartTooltipLabelFormatter}
              />
              <ReferenceLine
                x={refHour}
                stroke={c.refLine}
                strokeDasharray="3 3"
                label={{
                  value: L.now,
                  position: "top",
                  fill: c.tick,
                  fontSize: 10,
                  fontFamily: "var(--font-space-grotesk)",
                }}
              />
              <Line
                type="monotone"
                dataKey="aqiResolved"
                name={lineNames.aqi}
                stroke={c.line3}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="co2Normalized"
                name={lineNames.co2}
                stroke={c.line4}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-6 font-[family:var(--font-jetbrains-mono)] text-[11px]">
          <span style={{ color: c.line3 }}>{lineNames.aqi}</span>
          <span style={{ color: c.line4 }}>{lineNames.co2}</span>
        </div>
        <p className="mt-3 font-[family:var(--font-space-grotesk)] text-[11px] italic leading-snug text-[var(--text-muted)]">
          {L.lagNote}
        </p>
      </div>
    </div>
  );
}
