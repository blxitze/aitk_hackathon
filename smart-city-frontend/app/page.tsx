"use client";

import { useCallback, useEffect, useState } from "react";
import AIInsight from "@/components/AIInsight";
import AlertsBlock from "@/components/AlertsBlock";
import ChartSection from "@/components/ChartSection";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import ScenarioSwitcher from "@/components/ScenarioSwitcher";
import { fetchAnalysis, fetchMetrics } from "@/lib/api";
import type {
  AIResponse,
  AiMode,
  DataSources,
  KPICardTrend,
  MetricsResponse,
  UiLanguage,
} from "@/types";

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function transportRank(s: MetricsResponse["transport"]["status"]): number {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

function ecologyRank(s: MetricsResponse["ecology"]["status"]): number {
  if (s === "unhealthy") return 3;
  if (s === "moderate") return 2;
  return 1;
}

function insightAccent(metrics: MetricsResponse): {
  color: string;
  emoji: string;
} {
  const t = metrics.transport.status;
  const e = metrics.ecology.status;
  if (transportRank(t) >= ecologyRank(e)) {
    return {
      color:
        t === "high" ? "#ef4444" : t === "medium" ? "#f59e0b" : "#10b981",
      emoji: t === "high" ? "🔴" : t === "medium" ? "🟡" : "🟢",
    };
  }
  return {
    color:
      e === "unhealthy" ? "#ef4444" : e === "moderate" ? "#f59e0b" : "#10b981",
    emoji: e === "unhealthy" ? "🔴" : e === "moderate" ? "🟡" : "🟢",
  };
}

function kpiTrend(
  scenarioKey: string,
  metric:
    | "traffic"
    | "speed"
    | "incidents"
    | "aqi"
    | "co2"
    | "temp"
): KPICardTrend | undefined {
  const s = scenarioKey.toLowerCase().replace(/-/g, "_");
  if (s === "normal") return undefined;
  if (s === "rush_hour") {
    if (metric === "traffic" || metric === "incidents" || metric === "aqi" || metric === "co2")
      return "up";
    if (metric === "speed") return "down";
    if (metric === "temp") return "stable";
  }
  if (s === "emergency") {
    return "up";
  }
  return undefined;
}

function isSimulatedSource(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes("simulated") ||
    v.includes("mock_fallback") ||
    v.includes("mock") ||
    v.includes("emergency_override")
  );
}

function sourceDisplayName(key: keyof DataSources, value: string): string {
  const v = value.toLowerCase();
  if (key === "temperature") {
    if (v.includes("openweather")) return "OpenWeatherMap";
    return "Температура";
  }
  if (key === "aqi") {
    if (v.includes("waqi")) return "WAQI";
    return "AQI";
  }
  if (key === "transport") return "Транспорт";
  if (key === "co2") return "CO₂";
  return value;
}

export default function Home() {
  const [scenario, setScenario] = useState<string>("normal");
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>("openai");
  const [language, setLanguage] = useState<UiLanguage>("ru");
  const [animateKPI, setAnimateKPI] = useState(false);

  const loadScenario = useCallback(
    async (scenarioKey: string) => {
      setScenario(scenarioKey);
      setLoadingMetrics(true);
      setLoadingAI(true);
      setError(null);
      setAnimateKPI(false);
      setAiData(null);

      try {
        const metricsData = await fetchMetrics(scenarioKey);
        setMetrics(metricsData);
        setLoadingMetrics(false);
        window.setTimeout(() => setAnimateKPI(true), 100);
        try {
          const ai = await fetchAnalysis(
            scenarioKey,
            metricsData,
            aiMode,
            language
          );
          setAiData(ai);
          setError(null);
        } catch (aiErr) {
          setAiData(null);
          setError(
            aiErr instanceof Error ? aiErr.message : "Ошибка AI анализа"
          );
        }
      } catch (err) {
        setMetrics(null);
        setAiData(null);
        setError(
          err instanceof Error ? err.message : "Ошибка загрузки метрик"
        );
        setAnimateKPI(false);
      } finally {
        setLoadingMetrics(false);
        setLoadingAI(false);
      }
    },
    [aiMode, language]
  );

  useEffect(() => {
    void loadScenario("normal");
    // Initial load only — aiMode/language handled by separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!metrics) return;
    let cancelled = false;
    (async () => {
      setLoadingAI(true);
      setError(null);
      try {
        const ai = await fetchAnalysis(scenario, metrics, aiMode, language);
        if (!cancelled) {
          setAiData(ai);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAiData(null);
          setError(e instanceof Error ? e.message : "Ошибка AI анализа");
        }
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenario omitted; loadScenario handles scenario changes
  }, [aiMode, language]);

  const insightAccentStyle = metrics
    ? insightAccent(metrics)
    : { color: "#64748b", emoji: "⚪" };

  const showInsightShimmer = loadingAI;

  return (
    <main className="min-h-screen px-6 py-6 text-[#f1f5f9]">
      <div className="mx-auto max-w-[1920px]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[65fr_35fr] md:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <Header
              aiMode={aiMode}
              onAiModeChange={setAiMode}
              language={language}
              onLanguageChange={setLanguage}
            />

            <div
              className="w-full px-6 py-2.5"
              style={{
                backgroundColor: metrics
                  ? withAlpha(insightAccentStyle.color, 0.08)
                  : "rgba(15,32,64,0.5)",
                borderBottom: metrics
                  ? `1px solid ${withAlpha(insightAccentStyle.color, 0.2)}`
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {showInsightShimmer ? (
                <div
                  className="insight-shimmer h-[18px] w-full max-w-2xl rounded"
                  aria-hidden
                />
              ) : (
                <p
                  className="font-[family:var(--font-jetbrains-mono)] text-[13px] leading-snug"
                  style={{ color: insightAccentStyle.color }}
                >
                  <span className="mr-2" aria-hidden>
                    {insightAccentStyle.emoji}
                  </span>
                  {aiData?.what_happening ??
                    (loadingMetrics
                      ? "Загрузка…"
                      : "Ожидание анализа…")}
                </p>
              )}
            </div>

            <ScenarioSwitcher
              current={scenario}
              onChange={(s) => void loadScenario(s)}
              disabled={loadingMetrics}
            />

            <section aria-label="Ключевые показатели">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <KPICard
                  label="Индекс трафика"
                  value={metrics?.transport.traffic_index ?? 0}
                  unit=""
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "traffic")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
                <KPICard
                  label="Средняя скорость"
                  value={metrics?.transport.avg_speed ?? 0}
                  unit="km/h"
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "speed")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
                <KPICard
                  label="Инциденты"
                  value={metrics?.transport.incidents ?? 0}
                  unit=""
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "incidents")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
                <KPICard
                  label="AQI"
                  value={metrics?.ecology.aqi ?? 0}
                  unit=""
                  status={metrics?.ecology.status ?? "good"}
                  trend={kpiTrend(scenario, "aqi")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
                <KPICard
                  label="CO₂"
                  value={metrics?.ecology.co2 ?? 0}
                  unit="ppm"
                  status={metrics?.ecology.status ?? "good"}
                  trend={kpiTrend(scenario, "co2")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
                <KPICard
                  label="Температура"
                  value={
                    metrics
                      ? Number(metrics.ecology.temperature.toFixed(1))
                      : 0
                  }
                  unit="°C"
                  status={metrics?.ecology.status ?? "good"}
                  trend={kpiTrend(scenario, "temp")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                />
              </div>

              {metrics ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  {(Object.keys(metrics.data_sources) as (keyof DataSources)[]).map(
                    (key) => {
                      const raw = metrics.data_sources[key];
                      const real = !isSimulatedSource(raw);
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 font-[family:var(--font-jetbrains-mono)] text-[10px] text-[#64748b]"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: real ? "#10b981" : "#64748b",
                            }}
                            aria-hidden
                          />
                          {sourceDisplayName(key, raw)}: {raw}
                        </span>
                      );
                    }
                  )}
                </div>
              ) : null}
            </section>

            {metrics ? (
              <ChartSection
                chartData={metrics.chart_data}
                currentScenario={scenario}
              />
            ) : null}

            <AlertsBlock
              alerts={metrics?.alerts ?? []}
              loading={loadingMetrics}
            />
          </div>

          <aside className="min-w-0 md:sticky md:top-24 md:h-fit">
            <AIInsight
              data={aiData}
              loading={loadingAI}
              error={error}
              model={aiMode === "openai" ? "GPT-4o mini" : "qwen2.5:3b"}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
