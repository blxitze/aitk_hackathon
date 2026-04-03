"use client";

import type { CSSProperties } from "react";
import type { ScenarioSwitcherProps } from "@/types";

type ScenarioDef = {
  id: string;
  label: string;
  time: string;
  color: string;
};

const SCENARIOS: ScenarioDef[] = [
  { id: "normal", label: "Normal", time: "13:00", color: "#10b981" },
  { id: "rush_hour", label: "Rush Hour", time: "18:00", color: "#f59e0b" },
  { id: "emergency", label: "Emergency", time: "18:45", color: "#ef4444" },
];

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
}: ScenarioSwitcherProps) {
  return (
    <div
      className={`w-full ${disabled ? "pointer-events-none cursor-not-allowed opacity-40" : ""}`}
    >
      <p className="mb-3 text-center font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
        выберите сценарий
      </p>
      <div className="flex w-full justify-center gap-3">
        {SCENARIOS.map((scenario) => {
          const active = current === scenario.id;
          const isEmergency = scenario.id === "emergency";
          const pulseEmergency = active && isEmergency;

          const style: CSSProperties & {
            "--scenario-emergency-color"?: string;
          } = {
            backgroundColor: active
              ? withAlpha(scenario.color, 0.12)
              : "#0a1628",
            borderColor: active ? scenario.color : "rgba(255,255,255,0.06)",
            transition: "all 250ms ease",
          };

          if (pulseEmergency) {
            style["--scenario-emergency-color"] = scenario.color;
          }

          return (
            <button
              key={scenario.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(scenario.id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] border border-solid px-5 py-3 ${
                pulseEmergency ? "scenario-emergency-border-pulse" : ""
              }`}
              style={style}
            >
              <span
                className="mb-1 font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase tracking-[0.08em]"
                style={{ color: active ? scenario.color : "#64748b" }}
              >
                {scenario.label}
              </span>
              <span
                className="font-[family:var(--font-jetbrains-mono)] text-[20px] font-medium leading-none"
                style={{
                  color: active ? scenario.color : "#334155",
                  transition: "color 250ms ease",
                }}
              >
                {scenario.time}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
