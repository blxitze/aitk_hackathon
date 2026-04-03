"use client";

import { useEffect, useState } from "react";
import type { AiMode, HeaderProps, UiLanguage } from "@/types";

function formatClock(ts: Date): string {
  return ts.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function Header({
  aiMode,
  onAiModeChange,
  language,
  onLanguageChange,
}: HeaderProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex flex-col gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <h1 className="font-[family:var(--font-space-grotesk)] text-xl font-semibold tracking-tight text-[#f1f5f9] md:text-2xl">
          Smart City Almaty
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] px-2 py-0.5">
          <span
            className="relative flex h-2 w-2"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
          </span>
          <span className="font-[family:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">
            LIVE
          </span>
        </span>
        <span className="font-[family:var(--font-jetbrains-mono)] text-[11px] tabular-nums text-[#64748b]">
          Обновлено: {formatClock(now)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] p-0.5">
          {(["openai", "ollama"] as AiMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onAiModeChange(m)}
              className={`rounded-md px-2.5 py-1 font-[family:var(--font-space-grotesk)] text-[11px] font-medium transition-colors ${
                aiMode === m
                  ? "bg-[#0f2040] text-[#f1f5f9]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              {m === "openai" ? "OpenAI" : "Ollama"}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] p-0.5">
          {(["ru", "kz"] as UiLanguage[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLanguageChange(l)}
              className={`rounded-md px-2.5 py-1 font-[family:var(--font-space-grotesk)] text-[11px] font-medium uppercase transition-colors ${
                language === l
                  ? "bg-[#0f2040] text-[#f1f5f9]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
