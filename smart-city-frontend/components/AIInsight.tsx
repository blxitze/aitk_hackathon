"use client";

import { AlertCircle, Brain, ChevronRight, X } from "lucide-react";
import { useMemo } from "react";
import type { AIInsightProps, AIResponse } from "@/types";

const SECTION_LABEL =
  "font-[family:var(--font-jetbrains-mono)] text-[10px] font-semibold tracking-[0.1em] text-[#64748b]";

const DIVIDER = "border-t border-[rgba(255,255,255,0.06)] pt-6";

const DEFAULT_MODEL_LABEL = "GPT-4o mini";

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
        bg: "rgba(239,68,68,0.15)",
        color: "#ef4444",
        border: "rgba(239,68,68,0.3)",
        label: "Высокая",
      };
    case "Medium":
      return {
        bg: "rgba(245,158,11,0.15)",
        color: "#f59e0b",
        border: "rgba(245,158,11,0.3)",
        label: "Средняя",
      };
    case "Low":
    default:
      return {
        bg: "rgba(16,185,129,0.15)",
        color: "#10b981",
        border: "rgba(16,185,129,0.3)",
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
  if (t === "высокая" || t === "high" || t.includes("высок")) return "#10b981";
  if (t === "низкая" || t === "low" || t.includes("низк")) return "#ef4444";
  if (t === "средняя" || t === "medium" || t.includes("средн")) return "#f59e0b";
  return "#64748b";
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

export default function AIInsight({
  data,
  loading,
  error,
  model,
  onClose,
}: AIInsightProps) {
  const modelLabel = model ?? DEFAULT_MODEL_LABEL;

  const panelKey = useMemo(
    () => (data ? dataContentKey(data) : "empty"),
    [data]
  );

  return (
    <div
      className={`flex min-h-[600px] flex-col rounded-[12px] border-l-[3px] border-solid bg-[#0a1628] p-6 ${
        loading ? "ai-insight-loading-border" : ""
      }`}
      style={{
        borderLeftColor: loading ? undefined : "#8b5cf6",
      }}
    >
      <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-[family:var(--font-space-grotesk)] text-[16px] font-semibold leading-tight text-[#f1f5f9]">
          <Brain
            size={18}
            className="shrink-0 text-[#8b5cf6]"
            strokeWidth={2}
            aria-hidden
          />
          ИИ-анализ
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 font-[family:var(--font-jetbrains-mono)] text-[10px] font-medium"
            style={{
              backgroundColor: "rgba(139,92,246,0.15)",
              color: "#8b5cf6",
            }}
          >
            {modelLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть панель анализа"
            className="cursor-pointer rounded-[6px] p-1 text-[#64748b] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f1f5f9]"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col">
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#0f2040]" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-[#0f2040]" />
            <div className="h-4 w-[60%] animate-pulse rounded bg-[#0f2040]" />
            <div className="h-4 w-[90%] animate-pulse rounded bg-[#0f2040]" />
          </div>
          <p className="mt-6 font-[family:var(--font-space-grotesk)] text-[13px] italic leading-snug text-[#64748b]">
            Анализирую...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col">
          <p className="flex items-start gap-2 font-[family:var(--font-space-grotesk)] text-[15px] font-medium text-[#ef4444]">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-[#ef4444]"
              strokeWidth={2}
              aria-hidden
            />
            Ошибка анализа ИИ
          </p>
          <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[13px] leading-relaxed text-[#64748b]">
            {error}
          </p>
        </div>
      ) : data ? (
        <div key={panelKey} className="ai-panel-fade-in flex flex-1 flex-col">
          <section>
            <p className={SECTION_LABEL}>ЧТО ПРОИСХОДИТ</p>
            <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[15px] leading-[1.6] text-[#f1f5f9]">
              {data.what_happening}
            </p>
          </section>

          <section className={`${DIVIDER} mt-6`}>
            <p className={SECTION_LABEL}>КРИТИЧНОСТЬ</p>
            <div className="mt-4 flex justify-center">
              <CriticalBadge level={data.critical_level} />
            </div>
          </section>

          <section className={`${DIVIDER} mt-6`}>
            <p className={SECTION_LABEL}>ЧТО ДЕЛАТЬ</p>
            <ul className="mt-2 list-none p-0">
              {data.actions.slice(0, 3).map((action, i) => (
                <li
                  key={`${i}-${action.slice(0, 32)}`}
                  className="border-b border-[rgba(255,255,255,0.04)] py-1.5 last:border-b-0"
                >
                  <div className="flex gap-2 leading-[1.5]">
                    <ChevronRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[#8b5cf6]"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="font-[family:var(--font-space-grotesk)] text-[14px] text-[#f1f5f9]">
                      {action}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${DIVIDER} mt-6`}>
            <p className={SECTION_LABEL}>ОБОСНОВАНИЕ</p>
            <p className="mt-2 font-[family:var(--font-space-grotesk)] text-[13px] italic leading-[1.6] text-[#64748b]">
              {data.reasoning}
            </p>
          </section>

          <section className={`${DIVIDER} mt-6`}>
            <p className={SECTION_LABEL}>УВЕРЕННОСТЬ</p>
            <p
              className="mt-2 font-[family:var(--font-jetbrains-mono)] text-[13px] font-medium"
              style={{ color: confidenceColor(data.confidence) }}
            >
              {data.confidence}
            </p>
            <p className="mt-1 font-[family:var(--font-space-grotesk)] text-[12px] leading-snug text-[#64748b]">
              {data.confidence_basis}
            </p>
          </section>
        </div>
      ) : (
        <p className="font-[family:var(--font-space-grotesk)] text-[13px] text-[#64748b]">
          Нет данных ИИ
        </p>
      )}
    </div>
  );
}
