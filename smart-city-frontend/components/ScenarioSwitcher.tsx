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
    color: "var(--status-warn)",
  },
  normal: {
    ru: "Норма",
    kz: "Қалыпты",
    time: "13:00",
    color: "var(--status-good)",
  },
  rush_hour: {
    ru: "Час пик",
    kz: "Шың сағат",
    time: "18:00",
    color: "var(--status-warn)",
  },
  emergency: {
    ru: "ЧС",
    kz: "ТЖ",
    time: "18:45",
    color: "var(--status-crit)",
  },
  night: {
    ru: "Ночь",
    kz: "Түн",
    time: "23:00",
    color: "var(--accent)",
  },
};

const SCENARIO_ORDER = [
  "morning_peak",
  "normal",
  "rush_hour",
  "emergency",
  "night",
] as const;

const HINT_TEXT: Record<ScenarioSwitcherProps["language"], string> = {
  ru: "Выберите сценарий для запуска AI анализа",
  kz: "AI талдауды іске қосу үшін сценарийді таңдаңыз",
};

export default function ScenarioSwitcher({
  current,
  onChange,
  disabled = false,
  language,
  showHint = false,
}: ScenarioSwitcherProps) {
  const SELECT_SCENARIO: Record<typeof language, string> = {
    ru: "выберите сценарий",
    kz: "сценарийді таңдаңыз",
  };

  return (
    <div
      className={`w-full ${disabled ? "pointer-events-none cursor-not-allowed opacity-40" : ""}`}
    >
      <p className="mb-3 text-center font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
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
              ? `color-mix(in srgb, ${def.color} 12%, transparent)`
              : "var(--bg-surface)",
            borderColor: active ? def.color : "var(--border)",
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
                style={{
                  color: active ? def.color : "var(--text-secondary)",
                }}
              >
                {label}
              </span>
              <span
                className="font-[family:var(--font-jetbrains-mono)] text-[20px] font-medium leading-none"
                style={{
                  color: active ? def.color : "var(--text-muted)",
                  transition: "color 250ms ease",
                }}
              >
                {time}
              </span>
            </button>
          );
        })}
      </div>

      {showHint ? (
        <p className="mt-2 text-center font-[family:var(--font-space-grotesk)] text-[11px] italic leading-snug text-[var(--text-muted)]">
          {HINT_TEXT[language]}
        </p>
      ) : null}
    </div>
  );
}
