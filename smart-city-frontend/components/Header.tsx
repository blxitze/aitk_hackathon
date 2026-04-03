"use client";

import { Building2, Cloud, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import type { HeaderProps, UiLanguage } from "@/types";

function formatHMS(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const LANG_LABEL: Record<UiLanguage, string> = {
  ru: "RU",
  kz: "ҚЗ",
};

export default function Header({
  aiMode,
  onAIModeChange,
  language,
  onLanguageChange,
}: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeStr = now ? formatHMS(now) : "--:--:--";

  return (
    <header
      className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] px-6 py-[14px] backdrop-blur-[12px]"
      style={{ backgroundColor: "rgba(2, 8, 23, 0.85)" }}
    >
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 items-center gap-y-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-4">
        <div className="flex min-w-0 items-center">
          <span
            className="live-indicator-dot h-2 w-2 shrink-0 rounded-full bg-[#10b981]"
            aria-hidden
          />
          <span className="ml-1.5 font-[family:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#10b981]">
            ОНЛАЙН
          </span>
          <span
            className="mx-4 h-4 w-px shrink-0 bg-[rgba(255,255,255,0.08)]"
            aria-hidden
          />
          <Building2
            size={16}
            className="mr-2 shrink-0 text-[#f1f5f9]"
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="font-[family:var(--font-space-grotesk)] text-[18px] font-semibold leading-tight text-[#f1f5f9]">
              Умный город Алматы
            </h1>
            <p className="mt-0.5 font-[family:var(--font-space-grotesk)] text-[11px] leading-snug text-[#64748b]">
              Панель управленческих решений
            </p>
          </div>
        </div>

        <div className="flex justify-center md:px-2">
          <time
            dateTime={now?.toISOString()}
            className="font-[family:var(--font-jetbrains-mono)] text-[22px] font-medium tabular-nums leading-none text-[#3b82f6]"
          >
            {timeStr}
          </time>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 md:justify-self-end">
          <div className="flex rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-0.5">
            {(["ru", "kz"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`rounded-[6px] px-3 py-1.5 font-[family:var(--font-space-grotesk)] text-[12px] font-medium transition-all duration-150 ${
                  language === lang
                    ? "bg-[#0f2040] text-[#f1f5f9]"
                    : "text-[#334155] hover:text-[#64748b]"
                }`}
              >
                {LANG_LABEL[lang]}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <div className="flex rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#0a1628] p-0.5">
              <button
                type="button"
                onClick={() => onAIModeChange("openai")}
                className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-[family:var(--font-space-grotesk)] text-[12px] font-medium transition-all duration-150 ${
                  aiMode === "openai"
                    ? "bg-[rgba(59,130,246,0.2)] text-[#93c5fd]"
                    : "text-[#334155] hover:text-[#64748b]"
                }`}
              >
                <Cloud size={16} className="shrink-0" strokeWidth={2} />
                Облако
              </button>
              <button
                type="button"
                onClick={() => onAIModeChange("ollama")}
                className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-[family:var(--font-space-grotesk)] text-[12px] font-medium transition-all duration-150 ${
                  aiMode === "ollama"
                    ? "bg-[rgba(139,92,246,0.2)] text-[#c4b5fd]"
                    : "text-[#334155] hover:text-[#64748b]"
                }`}
              >
                <Monitor size={16} className="shrink-0" strokeWidth={2} />
                Локально
              </button>
            </div>
            <span className="font-[family:var(--font-jetbrains-mono)] text-[9px] leading-tight text-[#64748b]">
              {aiMode === "openai" ? "GPT-4o mini" : "Qwen 2.5 3B"}
            </span>
          </div>

          <p className="font-[family:var(--font-jetbrains-mono)] text-[10px] tabular-nums leading-tight text-[#334155]">
            Обновлено {timeStr}
          </p>
        </div>
      </div>
    </header>
  );
}
