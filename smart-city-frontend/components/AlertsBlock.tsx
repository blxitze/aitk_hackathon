"use client";

import {
  RiAlertLine,
  RiCarLine,
  RiCheckboxCircleLine,
  RiWindyLine,
} from "react-icons/ri";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  formatAlertTime,
  translateDomain,
  translateStatus,
} from "@/lib/utils";
import type { Alert, AlertsBlockProps, UiLanguage } from "@/types";

const ALERTS_LABELS: Record<
  UiLanguage,
  { title: string; allClear: string }
> = {
  ru: {
    title: "Предупреждения",
    allClear: "Все показатели в норме",
  },
  kz: {
    title: "Ескертулер",
    allClear: "Барлық көрсеткіштер қалыпты",
  },
};

const LEVEL_ORDER: Record<Alert["level"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const LEVEL_COLOR: Record<Alert["level"], string> = {
  high: "var(--status-crit)",
  medium: "var(--status-warn)",
  low: "var(--status-good)",
};

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
  );
}

function badgeSeverityColor(alerts: Alert[]): string {
  if (alerts.some((a) => a.level === "high")) return "var(--status-crit)";
  if (alerts.some((a) => a.level === "medium")) return "var(--status-warn)";
  return "var(--status-good)";
}

function DomainIcon({
  domain,
  language,
}: {
  domain: Alert["domain"];
  language: UiLanguage;
}) {
  const label = translateDomain(domain, language);
  if (domain === "transport") {
    return (
      <RiCarLine
        size={15}
        color="var(--accent-blue)"
        style={{ flexShrink: 0 }}
        aria-label={label}
      />
    );
  }
  return (
    <RiWindyLine
      size={15}
      color="var(--status-good)"
      style={{ flexShrink: 0 }}
      aria-label={label}
    />
  );
}

export default function AlertsBlock({
  alerts,
  loading = false,
  language = "ru",
}: AlertsBlockProps) {
  const sorted = useMemo(() => sortAlerts(alerts), [alerts]);
  const countBadgeColor = badgeSeverityColor(alerts);
  const labels = ALERTS_LABELS[language];

  return (
    <div className="rounded-[12px] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RiAlertLine
          size={18}
          color="var(--status-warn)"
          style={{ flexShrink: 0 }}
          aria-hidden
        />
        <h2 className="font-[family:var(--font-space-grotesk)] text-[14px] font-medium text-[var(--text-primary)]">
          {labels.title}
        </h2>
        <span
          className="rounded-md px-2 py-0.5 font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium tabular-nums"
          style={{
            backgroundColor: `color-mix(in srgb, ${countBadgeColor} 15%, transparent)`,
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
              className="h-[44px] animate-pulse rounded-[8px] bg-[var(--bg-elevated)]"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="flex items-center gap-2 font-[family:var(--font-space-grotesk)] text-[14px] text-[var(--status-good)]">
          <RiCheckboxCircleLine
            size={18}
            color="var(--status-good)"
            style={{ flexShrink: 0 }}
            aria-hidden
          />
          {labels.allClear}
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
                  <span className="inline-flex shrink-0" aria-hidden>
                    <DomainIcon domain={alert.domain} language={language} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-[family:var(--font-space-grotesk)] text-[13px] leading-snug text-[var(--text-primary)]">
                        {alert.message}
                      </p>
                      <time
                        className="shrink-0 text-right font-[family:var(--font-jetbrains-mono)] text-[10px] leading-tight text-[var(--text-secondary)]"
                        dateTime={alert.time}
                      >
                        {formatAlertTime(alert.time, language)}
                      </time>
                    </div>
                    <span
                      className="mt-1 inline-block font-[family:var(--font-jetbrains-mono)] text-[9px] font-semibold leading-tight"
                      style={{ color: statusColor }}
                    >
                      {translateStatus(alert.level, language)}
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
                    backgroundColor: `color-mix(in srgb, ${statusColor} 4%, transparent)`,
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
