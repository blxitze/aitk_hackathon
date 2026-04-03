"use client";

import {
  RiArrowRightSLine,
  RiBrainLine,
  RiCloudLine,
  RiComputerLine,
  RiCloseLine,
  RiErrorWarningLine,
} from "react-icons/ri";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { AIInsightProps, AiMode, AIResponse } from "@/types";

const SECTION_LABEL =
  "font-[family:var(--font-jetbrains-mono)] text-[10px] font-semibold tracking-[0.1em] text-[var(--text-secondary)]";

const DIVIDER = "border-t border-[var(--border)] pt-6";

const MODEL_LINE: Record<AiMode, string> = {
  openai: "gpt-4o mini",
  ollama: "qwen 2.5 3b",
};

/** LLM may return PascalCase, lowercase, or Russian labels — normalize before styling. */
function normalizeCriticalLevel(
  level: string | undefined | null
): AIResponse["critical_level"] {
  if (level == null || typeof level !== "string") return "Low";
  const t = level.trim().toLowerCase();
  if (t === "high" || t === "высокая" || t.startsWith("высок"))
    return "High";
  if (t === "medium" || t === "средняя" || t.startsWith("средн"))
    return "Medium";
  if (t === "low" || t === "низкая" || t.startsWith("низк")) return "Low";
  return "Low";
}

function criticalBadgeStyles(level: string | undefined | null): {
  bg: string;
  color: string;
  border: string;
  label: string;
} {
  const normalized = normalizeCriticalLevel(level);
  switch (normalized) {
    case "High":
      return {
        bg: "color-mix(in srgb, var(--status-crit) 15%, transparent)",
        color: "var(--status-crit)",
        border: "color-mix(in srgb, var(--status-crit) 30%, transparent)",
        label: "Высокая",
      };
    case "Medium":
      return {
        bg: "color-mix(in srgb, var(--status-warn) 15%, transparent)",
        color: "var(--status-warn)",
        border: "color-mix(in srgb, var(--status-warn) 30%, transparent)",
        label: "Средняя",
      };
    case "Low":
    default:
      return {
        bg: "color-mix(in srgb, var(--status-good) 15%, transparent)",
        color: "var(--status-good)",
        border: "color-mix(in srgb, var(--status-good) 30%, transparent)",
        label: "Низкая",
      };
  }
}

function CriticalBadge({ level }: { level: string | undefined | null }) {
  const b = criticalBadgeStyles(level);
  return (
    <span
      className="inline-block rounded-[20px] border border-solid px-6 py-2 font-[family:var(--font-space-grotesk)] text-[14px] font-semibold"
      style={{
        backgroundColor: b.bg,
        color: b.color,
        borderColor: b.border,
      }}
    >
      {b.label}
    </span>
  );
}

function confidenceColor(confidence: string): string {
  const t = confidence.trim().toLowerCase();
  if (t === "высокая" || t === "high" || t.includes("высок"))
    return "var(--status-good)";
  if (t === "низкая" || t === "low" || t.includes("низк"))
    return "var(--status-crit)";
  if (t === "средняя" || t === "medium" || t.includes("средн"))
    return "var(--status-warn)";
  return "var(--text-secondary)";
}

function dataContentKey(data: AIResponse): string {
  return [
    data.what_happening,
    data.critical_level,
    data.actions.join("\u0001"),
    data.reasoning,
    data.confidence,
    data.confidence_basis,
    data.error ?? "",
  ].join("\u0002");
}

const PANEL_GLOW_STYLE: CSSProperties = {
  boxShadow:
    "0 0 0 1px var(--ai-border), -8px 0 32px var(--ai-dim)",
};

export default function AIInsight({
  data,
  loading,
  error,
  onClose,
  scenario,
  aiMode,
  onAIModeChange,
}: AIInsightProps) {
  const panelKey = useMemo(
    () => (data ? dataContentKey(data) : "empty"),
    [data]
  );

  const contentAnimKey = `${data?.critical_level ?? "none"}-${scenario}-${panelKey}`;

  return (
    <div
      className={`flex min-h-[600px] flex-col rounded-[12px] border-l-[3px] border-solid bg-[var(--bg-surface)] p-6 ${
        loading ? "ai-insight-loading-border" : ""
      }`}
      style={{
        borderLeftColor: loading ? undefined : "var(--ai-accent)",
        ...PANEL_GLOW_STYLE,
      }}
    >
      <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-[family:var(--font-space-grotesk)] text-[16px] font-semibold leading-tight text-[var(--text-primary)]">
          <RiBrainLine
            size={18}
            color="var(--ai-accent)"
            style={{ flexShrink: 0 }}
            aria-hidden
          />
          ИИ-анализ
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="flex rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)] p-[3px]">
              <button
                type="button"
                onClick={() => onAIModeChange("openai")}
                className={`flex cursor-pointer items-center gap-1 rounded-[6px] border-none px-[10px] py-[3px] font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium transition-all duration-150 ease-in-out ${
                  aiMode === "openai"
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                    : "bg-transparent text-[var(--text-muted)]"
                }`}
              >
                <RiCloudLine size={12} style={{ flexShrink: 0 }} aria-hidden />
                GPT
              </button>
              <button
                type="button"
                onClick={() => onAIModeChange("ollama")}
                className={`flex cursor-pointer items-center gap-1 rounded-[6px] border-none px-[10px] py-[3px] font-[family:var(--font-jetbrains-mono)] text-[11px] font-medium transition-all duration-150 ease-in-out ${
                  aiMode === "ollama"
                    ? "bg-[color-mix(in_srgb,var(--ai-accent)_12%,transparent)] text-[var(--ai-accent)]"
                    : "bg-transparent text-[var(--text-muted)]"
                }`}
              >
                <RiComputerLine size={12} style={{ flexShrink: 0 }} aria-hidden />
                Local
              </button>
            </div>
            <span className="mt-0.5 text-center font-[family:var(--font-jetbrains-mono)] text-[9px] leading-none text-[var(--text-muted)]">
              {MODEL_LINE[aiMode]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть панель анализа"
            className="cursor-pointer rounded-[6px] p-1 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <RiCloseLine size={16} style={{ flexShrink: 0 }} aria-hidden />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {loading ? (
          <div className="flex flex-1 flex-col">
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-[80%] animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-[60%] animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-[90%] animate-pulse rounded bg-[var(--bg-elevated)]" />
            </div>
            <p className="mt-6 font-[family:var(--font-space-grotesk)] text-[13px] italic leading-snug text-[var(--text-secondary)]">
              Анализирую...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col">
            <p className="flex items-start gap-2 font-[family:var(--font-space-grotesk)] text-[15px] font-medium text-[var(--status-crit)]">
              <RiErrorWarningLine
                size={18}
                color="var(--status-crit)"
                className="mt-0.5"
                style={{ flexShrink: 0 }}
                aria-hidden
              />
              Ошибка анализа ИИ
            </p>
            <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {error}
            </p>
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentAnimKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.2,
                  ease: "easeOut",
                }}
              >
                <p className={SECTION_LABEL}>ЧТО ПРОИСХОДИТ</p>
                <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[15px] leading-[1.6] text-[var(--text-primary)]">
                  {data.what_happening}
                </p>
              </motion.section>

              <motion.section
                className={`${DIVIDER} mt-6`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.28,
                  ease: "easeOut",
                }}
              >
                <p className={SECTION_LABEL}>КРИТИЧНОСТЬ</p>
                <div className="mt-4 flex justify-center">
                  <CriticalBadge level={data.critical_level} />
                </div>
              </motion.section>

              <motion.section
                className={`${DIVIDER} mt-6`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.36,
                  ease: "easeOut",
                }}
              >
                <p className={SECTION_LABEL}>ЧТО ДЕЛАТЬ</p>
                <ul className="mt-2 list-none p-0">
                  {data.actions.slice(0, 3).map((action, i) => (
                    <li
                      key={`${i}-${action.slice(0, 32)}`}
                      className="border-b border-[var(--border)] py-1.5 last:border-b-0"
                    >
                      <div className="flex gap-2 leading-[1.5]">
                        <RiArrowRightSLine
                          size={14}
                          color="var(--ai-accent)"
                          className="mt-0.5"
                          style={{ flexShrink: 0 }}
                          aria-hidden
                        />
                        <span className="font-[family:var(--font-space-grotesk)] text-[14px] text-[var(--text-primary)]">
                          {action}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section
                className={`${DIVIDER} mt-6`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.44,
                  ease: "easeOut",
                }}
              >
                <p className={SECTION_LABEL}>ОБОСНОВАНИЕ</p>
                <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[13px] italic leading-[1.6] text-[var(--text-secondary)]">
                  {data.reasoning}
                </p>
              </motion.section>

              <motion.section
                className={`${DIVIDER} mt-6`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.52,
                  ease: "easeOut",
                }}
              >
                <p className={SECTION_LABEL}>УВЕРЕННОСТЬ</p>
                <p
                  className="mt-2 font-[family:var(--font-jetbrains-mono)] text-[13px] font-medium"
                  style={{ color: confidenceColor(data.confidence) }}
                >
                  {data.confidence}
                </p>
                <p className="mt-1 font-[family:var(--font-space-grotesk)] text-[12px] leading-snug text-[var(--text-secondary)]">
                  {data.confidence_basis}
                </p>
              </motion.section>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p className="font-[family:var(--font-space-grotesk)] text-[13px] text-[var(--text-secondary)]">
            Нет данных ИИ
          </p>
        )}
      </motion.div>
    </div>
  );
}
