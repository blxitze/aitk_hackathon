"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RiArrowLeftLine, RiMapPin2Line } from "react-icons/ri";
import ScenarioSwitcher from "@/components/ScenarioSwitcher";
import { DISTRICTS } from "@/lib/almatyDistricts";
import "leaflet/dist/leaflet.css";
import type { UiLanguage } from "@/types";

const AlmatyMap = dynamic(() => import("@/components/AlmatyMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0c1420",
        color: "#5a7a96",
        fontFamily: "var(--font-space-grotesk), Space Grotesk, sans-serif",
        fontSize: "14px",
      }}
    >
      Загрузка карты...
    </div>
  ),
});

const MAP_LABELS: Record<
  UiLanguage,
  {
    back: string;
    title: string;
    legend: [string, string, string, string];
    overlayTitle: string;
    footer: string;
  }
> = {
  ru: {
    back: "Дашборд",
    title: "Карта города",
    legend: ["Норма", "Умеренно", "Высокий", "Критично"] as const,
    overlayTitle: "Транспортная нагрузка",
    footer: "Данные смоделированы · Алматы, Казахстан",
  },
  kz: {
    back: "Бақылау тақтасы",
    title: "Қала картасы",
    legend: ["Қалыпты", "Орташа", "Жоғары", "Критикалық"] as const,
    overlayTitle: "Көлік жүктемесі",
    footer: "Деректер модельденген · Алматы, Қазақстан",
  },
};

function intensityColor(intensity: number): string {
  if (intensity >= 0.8) return "#ff4444";
  if (intensity >= 0.5) return "#f0a500";
  return "#00d47e";
}

export default function MapPage() {
  const [scenario, setScenario] = useState<string>("normal");
  const [language, setLanguage] = useState<UiLanguage>("ru");
  const labels = MAP_LABELS[language];

  const topDistricts = useMemo(() => {
    const rows = DISTRICTS.map((d) => {
      const raw = d.scenario_intensity[
        scenario as keyof (typeof d)["scenario_intensity"]
      ];
      const intensity = raw ?? 0.3;
      const name = language === "kz" ? d.name_kz : d.name_ru;
      return { name, intensity, color: intensityColor(intensity) };
    });
    return [...rows].sort((a, b) => b.intensity - a.intensity).slice(0, 3);
  }, [scenario, language]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-6 backdrop-blur-[16px]"
        style={{
          backgroundColor: "rgba(6,10,15,0.92)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 font-[family:var(--font-space-grotesk)] text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          >
            <RiArrowLeftLine
              size={16}
              className="shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              aria-hidden
            />
            {labels.back}
          </Link>
          <span
            className="h-[18px] w-px shrink-0 bg-[var(--border)]"
            aria-hidden
          />
          <div className="flex min-w-0 items-center gap-2">
            <RiMapPin2Line
              size={16}
              color="var(--accent)"
              className="shrink-0"
              aria-hidden
            />
            <span className="truncate font-[family:var(--font-space-grotesk)] text-[15px] font-semibold text-[var(--text-primary)]">
              {labels.title}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
          <div className="flex shrink-0 rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)] p-[3px]">
            {(["ru", "kz"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`cursor-pointer rounded-[6px] border-none px-2.5 py-1 font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium transition-all duration-150 ease-in-out ${
                  language === lang
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "bg-transparent text-[var(--text-muted)]"
                }`}
              >
                {lang === "ru" ? "RU" : "ҚЗ"}
              </button>
            ))}
          </div>

          <div
            className="hidden font-[family:var(--font-jetbrains-mono)] text-[10px] text-[var(--text-secondary)] sm:flex sm:items-center sm:gap-3"
            aria-label="Intensity legend"
          >
            <span className="inline-flex items-center gap-1">
              <span className="text-[#00d47e]">●</span>
              {labels.legend[0]}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[#f0a500]">●</span>
              {labels.legend[1]}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[#ff6600]">●</span>
              {labels.legend[2]}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[#ff4444]">●</span>
              {labels.legend[3]}
            </span>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-4">
        <ScenarioSwitcher
          current={scenario}
          onChange={setScenario}
          language={language}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 z-0">
          <AlmatyMap scenario={scenario} language={language} />
        </div>

        <div
          className="pointer-events-none absolute bottom-6 left-6 z-[1000] min-w-[220px] rounded-xl border border-[var(--border)] p-4 pl-5"
          style={{
            backgroundColor: "rgba(6,10,15,0.88)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="pointer-events-auto mb-3 font-[family:var(--font-space-grotesk)] text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            {labels.overlayTitle}
          </p>
          <ul className="pointer-events-auto space-y-2">
            {topDistricts.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-2 font-[family:var(--font-jetbrains-mono)] text-[12px] text-[var(--text-primary)]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {Math.round(row.intensity * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <div
            className="pointer-events-auto my-3 h-px bg-[var(--border)]"
            aria-hidden
          />
          <p className="pointer-events-auto font-[family:var(--font-space-grotesk)] text-[10px] italic text-[var(--text-muted)]">
            {labels.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
