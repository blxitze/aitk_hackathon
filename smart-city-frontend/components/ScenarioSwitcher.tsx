"use client";

import type { CSSProperties } from "react";
import type { ScenarioSwitcherProps } from "@/types";

const SCENARIO_LABELS: Record<
  string,
  { ru: string; kz: string; time: string; color: string }
> = {
  morning_peak: {
    ru: "Утренний пик",
    kz: "Таңғы шың",
    time: "08:00",
    color: "#f59e0b",
  },
  normal: {
    ru: "Норма",
    kz: "Қалыпты",
    time: "13:00",
    color: "#10b981",
  },
  rush_hour: {
    ru: "Час пик",
    kz: "Шың сағат",
    time: "18:00",
    color: "#f59e0b",
  },
  emergency: {
    ru: "ЧС",
    kz: "ТЖ",
    time: "18:45",
    color: "#ef4444",
  },
  night: {
    ru: "Ночь",
    kz: "Түн",
    time: "23:00",
    color: "#3b82f6",
  },
};

const SCENARIO_ORDER = [
  "morning_peak",
  "normal",
  "rush_hour",
  "emergency",
  "night",
] as const;

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ScenarioSwitcher({
  current,
  onChange,
  disabled = false,
  language,
}: ScenarioSwitcherProps) {
  const SELECT_SCENARIO: Record<typeof language, string> = {
    ru: "выберите сценарий",
    kz: "сценарийді таңдаңыз",
  };

  return (
    <div
      className={`w-full ${disabled ? "pointer-events-none cursor-not-allowed opacity-40" : ""}`}
    >
      <p className="mb-3 text-center font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
        {SELECT_SCENARIO[language]}
      </p>
      <div className="flex w-full flex-row flex-wrap justify-center gap-[10px]">
        {SCENARIO_ORDER.map((id) => {
          const def = SCENARIO_LABELS[id];
          const label = def[language];
          const time = def.time;
          const active = current === id;
          const isEmergency = id === "emergency";
          const pulseEmergency = active && isEmergency;

          const style: CSSProperties & {
            "--scenario-emergency-color"?: string;
          } = {
            backgroundColor: active
              ? withAlpha(def.color, 0.12)
              : "#0a1628",
            borderColor: active ? def.color : "rgba(255,255,255,0.06)",
            transition: "all 250ms ease",
          };

          if (pulseEmergency) {
            style["--scenario-emergency-color"] = def.color;
          }

          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${label}, ${time}`}
              onClick={() => onChange(id)}
              className={`flex min-w-[120px] shrink-0 flex-col items-center justify-center rounded-[10px] border border-solid px-5 py-3 ${
                pulseEmergency ? "scenario-emergency-border-pulse" : ""
              }`}
              style={style}
            >
              <span
                className="mb-1 font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: active ? def.color : "#64748b" }}
              >
                {label}
              </span>
              <span
                className="font-[family:var(--font-jetbrains-mono)] text-[20px] font-medium leading-none"
                style={{
                  color: active ? def.color : "#334155",
                  transition: "color 250ms ease",
                }}
              >
                {time}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
