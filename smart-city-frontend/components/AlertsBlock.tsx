"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { Alert, AlertsBlockProps } from "@/types";

const LEVEL_ORDER: Record<Alert["level"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const LEVEL_COLOR: Record<Alert["level"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
  );
}

function badgeSeverityColor(alerts: Alert[]): string {
  if (alerts.some((a) => a.level === "high")) return "#ef4444";
  if (alerts.some((a) => a.level === "medium")) return "#f59e0b";
  return "#10b981";
}

function domainIcon(domain: Alert["domain"]): string {
  return domain === "transport" ? "🚗" : "🌫";
}

export default function AlertsBlock({ alerts, loading = false }: AlertsBlockProps) {
  const sorted = useMemo(() => sortAlerts(alerts), [alerts]);
  const countBadgeColor = badgeSeverityColor(alerts);

  return (
    <div className="rounded-[12px] bg-[#0a1628] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-[family:var(--font-space-grotesk)] text-[14px] font-medium text-[#f1f5f9]">
          Предупреждения
        </h2>
        <span
          className="rounded-md px-2 py-0.5 font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium tabular-nums"
          style={{
            backgroundColor: withAlpha(countBadgeColor, 0.15),
            color: countBadgeColor,
          }}
        >
          {loading ? "—" : alerts.length}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[44px] animate-pulse rounded-[8px] bg-[#0f2040]"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="font-[family:var(--font-space-grotesk)] text-[14px] text-[#10b981]">
          ✓ Все показатели в норме
        </p>
      ) : (
        <ul className="list-none p-0">
          {sorted.map((alert, index) => {
            const statusColor = LEVEL_COLOR[alert.level];
            const isHigh = alert.level === "high";
            const pulseDelayMs = index * 50 + 300;

            const outerStyle: CSSProperties = {
              animationDelay: `${index * 50}ms`,
            };

            const pulseStyle: CSSProperties | undefined = isHigh
              ? { animationDelay: `${pulseDelayMs}ms` }
              : undefined;

            const rowContent = (
              <div className="px-[14px] py-2.5">
                <div className="flex gap-3">
                  <span
                    className="shrink-0 font-[family:var(--font-space-grotesk)] text-[16px] leading-none"
                    aria-hidden
                  >
                    {domainIcon(alert.domain)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-[family:var(--font-space-grotesk)] text-[13px] leading-snug text-[#f1f5f9]">
                        {alert.message}
                      </p>
                      <time
                        className="shrink-0 text-right font-[family:var(--font-jetbrains-mono)] text-[10px] leading-tight text-[#64748b]"
                        dateTime={alert.time}
                      >
                        {alert.time}
                      </time>
                    </div>
                    <span
                      className="mt-1 inline-block font-[family:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase leading-tight"
                      style={{ color: statusColor }}
                    >
                      {alert.level.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );

            return (
              <li key={`${alert.domain}-${alert.message}-${alert.time}-${index}`} className="mb-1.5 last:mb-0">
                <div
                  className="alert-row-outer overflow-hidden rounded-r-[8px] border-l-[3px] border-solid"
                  style={{
                    ...outerStyle,
                    borderLeftColor: statusColor,
                    backgroundColor: withAlpha(statusColor, 0.04),
                  }}
                >
                  {isHigh ? (
                    <div className="alert-row-pulse-inner" style={pulseStyle}>
                      {rowContent}
                    </div>
                  ) : (
                    rowContent
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
