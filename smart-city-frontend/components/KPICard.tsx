"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { translateStatus } from "@/lib/utils";
import type { KPICardProps, KPICardStatus } from "@/types";

const STATUS_COLORS: Record<KPICardStatus, string> = {
  low: "#10b981",
  good: "#10b981",
  medium: "#f59e0b",
  moderate: "#f59e0b",
  high: "#ef4444",
  unhealthy: "#ef4444",
};

function isCriticalStatus(status: KPICardStatus): boolean {
  return status === "high" || status === "unhealthy";
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatAnimatedNumber(current: number, target: number): string {
  if (Number.isInteger(target)) {
    return String(Math.round(current));
  }
  const decimals = Math.min(
    4,
    (target.toString().split(".")[1] ?? "").length
  );
  return current.toFixed(decimals);
}

export default function KPICard({
  label,
  value,
  unit,
  status,
  trend,
  loading = false,
  animate = false,
  language = "ru",
}: KPICardProps) {
  const statusColor = STATUS_COLORS[status];
  const critical = isCriticalStatus(status);
  const valueSizeClass = critical ? "text-[36px]" : "text-[28px]";

  const [displayNumber, setDisplayNumber] = useState<number>(() => {
    if (typeof value !== "number") return 0;
    return animate ? 0 : value;
  });

  useEffect(() => {
    if (typeof value !== "number") {
      return;
    }
    if (!animate) {
      setDisplayNumber(value);
      return;
    }

    let startTime: number | null = null;
    let rafId = 0;
    const duration = 600;
    const from = 0;
    const to = value;

    const step = (now: number) => {
      if (startTime === null) {
        startTime = now;
      }
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setDisplayNumber(from + (to - from) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    setDisplayNumber(0);
    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [animate, value]);

  const displayValue =
    typeof value === "number"
      ? formatAnimatedNumber(displayNumber, value)
      : String(value);

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-5 ${
        critical ? "kpi-card-border-pulse border-l-[3px] border-solid" : "border-l-[3px] border-solid"
      }`}
      style={
        {
          "--kpi-status-color": statusColor,
          borderLeftColor: critical ? undefined : statusColor,
        } as CSSProperties & { "--kpi-status-color"?: string }
      }
    >
      {!loading && trend ? (
        <div
          className="absolute right-5 top-5 font-[family:var(--font-space-grotesk)] text-[12px] leading-none"
          aria-hidden
        >
          {trend === "up" ? (
            <TrendingUp size={16} style={{ color: statusColor }} strokeWidth={2} />
          ) : trend === "down" ? (
            <TrendingDown size={16} style={{ color: statusColor }} strokeWidth={2} />
          ) : (
            <Minus size={16} className="text-[#64748b]" strokeWidth={2} />
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-[#0f2040]" />
          <div className="h-9 w-32 animate-pulse rounded bg-[#0f2040]" />
        </div>
      ) : (
        <>
          <p className="mb-3 pr-8 font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
            {label}
          </p>

          <div className="mb-3 flex flex-wrap items-baseline gap-0">
            <span
              className={`font-[family:var(--font-jetbrains-mono)] font-medium leading-none ${valueSizeClass}`}
              style={{ color: statusColor }}
            >
              {displayValue}
            </span>
            <span className="ml-1 font-[family:var(--font-space-grotesk)] text-[13px] text-[#64748b]">
              {unit}
            </span>
          </div>

          <span
            className="inline-block rounded-full px-2 py-0.5 font-[family:var(--font-space-grotesk)] text-[10px] font-semibold leading-tight"
            style={{
              backgroundColor: withAlpha(statusColor, 0.15),
              color: statusColor,
            }}
          >
            {translateStatus(status, language)}
          </span>
        </>
      )}
    </div>
  );
}
