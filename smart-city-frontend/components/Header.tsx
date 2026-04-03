"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RiBrainLine, RiBuildingLine, RiLayoutRightLine } from "react-icons/ri";
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

const AI_PANEL_LABEL: Record<UiLanguage, { closed: string; open: string }> = {
  ru: { closed: "Анализ", open: "Скрыть" },
  kz: { closed: "Талдау", open: "Жасыру" },
};

export default function Header({
  language,
  onLanguageChange,
  aiPanelOpen,
  onToggleAIPanel,
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
      className="sticky top-0 z-50 h-14 shrink-0 overflow-hidden border-b border-[var(--border)] backdrop-blur-[16px]"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-page) 92%, transparent)",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1920px] items-center justify-between px-6">
        {/* Left */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="header-live-dot h-2 w-2 shrink-0 rounded-full bg-[var(--status-good)]"
              aria-hidden
            />
            <span
              className="font-[family:var(--font-jetbrains-mono)] text-[10px] font-normal uppercase leading-none text-[var(--status-good)]"
              style={{ letterSpacing: "0.12em" }}
            >
              ОНЛАЙН
            </span>
          </div>
          <span
            className="h-[18px] w-px shrink-0 bg-[var(--border)]"
            aria-hidden
          />
          <div className="flex min-w-0 items-center gap-2">
            <RiBuildingLine
              size={15}
              color="var(--text-secondary)"
              style={{ flexShrink: 0 }}
              aria-hidden
            />
            <span className="truncate font-[family:var(--font-space-grotesk)] text-[15px] font-semibold leading-none text-[var(--text-primary)]">
              Bed Action Inc.
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="flex shrink-0 items-center justify-center px-2">
          <time
            dateTime={now?.toISOString()}
            className="font-[family:var(--font-jetbrains-mono)] text-[20px] font-medium tabular-nums leading-none text-[var(--accent)]"
            style={{ letterSpacing: "0.05em" }}
          >
            {timeStr}
          </time>
        </div>

        {/* Right: panel toggle | divider | language only */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={onToggleAIPanel}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] border border-solid px-3 py-1.5 font-[family:var(--font-space-grotesk)] text-[12px] font-medium transition-all duration-200 ease-in-out"
            style={
              aiPanelOpen
                ? {
                  backgroundColor: "transparent",
                  borderColor: "var(--border-hover)",
                  color: "var(--text-secondary)",
                }
                : {
                  backgroundColor: "var(--ai-dim)",
                  borderColor: "var(--ai-border)",
                  color: "var(--ai-accent)",
                }
            }
          >
            {aiPanelOpen ? (
              <RiLayoutRightLine
                size={14}
                color="var(--text-secondary)"
                style={{ flexShrink: 0 }}
                aria-hidden
              />
            ) : (
              <RiBrainLine
                size={14}
                color="var(--ai-accent)"
                style={{ flexShrink: 0 }}
                aria-hidden
              />
            )}
            <AnimatePresence mode="wait">
              <motion.span
                key={`${aiPanelOpen ? "open" : "closed"}-${language}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="inline-block leading-none"
              >
                {aiPanelOpen
                  ? AI_PANEL_LABEL[language].open
                  : AI_PANEL_LABEL[language].closed}
              </motion.span>
            </AnimatePresence>
          </button>

          <span
            className="h-[18px] w-px shrink-0 bg-[var(--border)]"
            aria-hidden
          />

          <div className="flex shrink-0 rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)] p-[3px]">
            {(["ru", "kz"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`cursor-pointer rounded-[6px] border-none px-2.5 py-1 font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium transition-all duration-150 ease-in-out ${language === lang
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "bg-transparent text-[var(--text-muted)]"
                  }`}
              >
                {LANG_LABEL[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
