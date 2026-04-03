"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import AIInsight from "@/components/AIInsight";
import AlertsBlock from "@/components/AlertsBlock";
import ChartSection from "@/components/ChartSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import ScenarioSwitcher from "@/components/ScenarioSwitcher";
import { fetchAnalysis, fetchMetrics } from "@/lib/api";
import { translateSource } from "@/lib/utils";
import {
  RiCheckboxBlankCircleFill,
  RiCheckboxBlankCircleLine,
} from "react-icons/ri";
import type {
  AIResponse,
  AiMode,
  DataSources,
  KPICardTrend,
  MetricsResponse,
  ThemeMode,
  UiLanguage,
} from "@/types";

const KPI_LABELS: Record<
  UiLanguage,
  {
    traffic_index: string;
    avg_speed: string;
    incidents: string;
    aqi: string;
    co2: string;
    temperature: string;
  }
> = {
  ru: {
    traffic_index: "Индекс трафика",
    avg_speed: "Средняя скорость",
    incidents: "Инциденты",
    aqi: "ИКВ",
    co2: "CO₂",
    temperature: "Температура",
  },
  kz: {
    traffic_index: "Қозғалыс индексі",
    avg_speed: "Орташа жылдамдық",
    incidents: "Оқиғалар",
    aqi: "АКИ",
    co2: "CO₂",
    temperature: "Температура",
  },
};

const UI_LABELS: Record<
  UiLanguage,
  {
    transport: string;
    ecology: string;
    dataSources: string;
    kpiSectionAria: string;
    loading: string;
    analyzing: string;
  }
> = {
  ru: {
    transport: "Транспорт",
    ecology: "Экология",
    dataSources: "Источники данных",
    kpiSectionAria: "Ключевые показатели",
    loading: "Загрузка...",
    analyzing: "Анализирую...",
  },
  kz: {
    transport: "Көлік",
    ecology: "Экология",
    dataSources: "Деректер көздері",
    kpiSectionAria: "Негізгі көрсеткіштер",
    loading: "Жүктелуде...",
    analyzing: "Талдау...",
  },
};

function dataSourceLineLabel(
  key: keyof DataSources,
  lang: UiLanguage
): string {
  const k = KPI_LABELS[lang];
  const u = UI_LABELS[lang];
  if (key === "transport") return u.transport;
  if (key === "temperature") return k.temperature;
  if (key === "aqi") return k.aqi;
  if (key === "co2") return k.co2;
  return key;
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

function insightAccent(metrics: MetricsResponse): { color: string } {
  const t = metrics.transport.status;
  const e = metrics.ecology.status;
  if (transportRank(t) >= ecologyRank(e)) {
    return {
      color:
        t === "high"
          ? "var(--status-crit)"
          : t === "medium"
            ? "var(--status-warn)"
            : "var(--status-good)",
    };
  }
  return {
    color:
      e === "unhealthy"
        ? "var(--status-crit)"
        : e === "moderate"
          ? "var(--status-warn)"
          : "var(--status-good)",
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
  // Baseline: "normal". Trends describe direction vs that baseline (conceptual).
  if (s === "normal") return undefined;

  if (s === "rush_hour" || s === "morning_peak") {
    if (
      metric === "traffic" ||
      metric === "incidents" ||
      metric === "aqi" ||
      metric === "co2"
    )
      return "up";
    if (metric === "speed") return "down";
    if (metric === "temp") return "stable";
  }

  if (s === "night") {
    if (
      metric === "traffic" ||
      metric === "incidents" ||
      metric === "aqi" ||
      metric === "co2"
    )
      return "down";
    if (metric === "speed") return "up";
    if (metric === "temp") return "stable";
  }

  if (s === "emergency") {
    if (metric === "speed") return "down";
    if (
      metric === "traffic" ||
      metric === "incidents" ||
      metric === "aqi" ||
      metric === "co2" ||
      metric === "temp"
    )
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  /** First mount runs loadScenario("normal") — keep panel hidden; later scenario clicks open the panel. */
  const isFirstScenarioLoadRef = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem("sc-theme") as ThemeMode | null;
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: ThemeMode = t === "dark" ? "light" : "dark";
      localStorage.setItem("sc-theme", next);
      return next;
    });
  }, []);

  const handleAIModeChange = useCallback(
    (mode: AiMode) => {
      setAiMode(mode);
      if (!metrics) return;
      setLoadingAI(true);
      setError(null);
      void fetchAnalysis(scenario, metrics, mode, language)
        .then((ai) => {
          setAiData(ai);
          setError(null);
        })
        .catch((e) => {
          setAiData(null);
          setError(e instanceof Error ? e.message : "Ошибка анализа ИИ");
        })
        .finally(() => setLoadingAI(false));
    },
    [metrics, scenario, language]
  );

  const loadScenario = useCallback(
    async (scenarioKey: string) => {
      if (!isFirstScenarioLoadRef.current) {
        setAiPanelOpen(true);
      } else {
        isFirstScenarioLoadRef.current = false;
      }
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
            aiErr instanceof Error ? aiErr.message : "Ошибка анализа ИИ"
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
          setError(e instanceof Error ? e.message : "Ошибка анализа ИИ");
        }
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Refetch AI when UI language changes; aiMode changes handled in handleAIModeChange
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenario omitted; loadScenario handles scenario changes
  }, [language]);

  const insightAccentStyle = metrics
    ? insightAccent(metrics)
    : { color: "var(--text-secondary)" };

  const showInsightShimmer = loadingAI;
  const ui = UI_LABELS[language];
  const kpi = KPI_LABELS[language];

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--text-primary)] transition-colors duration-200">
      <div className="mx-auto max-w-[1920px]">
        <motion.div
          layout
          className="ai-dashboard-motion-grid"
          style={{
            display: "grid",
            gridTemplateColumns: aiPanelOpen
              ? "minmax(0, 65fr) minmax(0, 35fr)"
              : "minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
          transition={{
            layout: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
          }}
        >
          <motion.div
            layout
            className="flex min-w-0 flex-col gap-6"
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <Header
              language={language}
              onLanguageChange={setLanguage}
              aiPanelOpen={aiPanelOpen}
              onToggleAIPanel={() => setAiPanelOpen((prev) => !prev)}
            />

            <div
              className="w-full px-6 py-2.5"
              style={{
                backgroundColor: metrics
                  ? `color-mix(in srgb, ${insightAccentStyle.color} 8%, transparent)`
                  : "color-mix(in srgb, var(--bg-elevated) 50%, transparent)",
                borderBottom: metrics
                  ? `1px solid color-mix(in srgb, ${insightAccentStyle.color} 20%, transparent)`
                  : "1px solid var(--border)",
              }}
            >
              {showInsightShimmer ? (
                <div
                  className="insight-shimmer h-[18px] w-full max-w-2xl rounded"
                  aria-hidden
                />
              ) : (
                <p
                  className="flex items-start gap-2 font-[family:var(--font-jetbrains-mono)] text-[13px] leading-snug"
                  style={{ color: insightAccentStyle.color }}
                >
                  {metrics ? (
                    <RiCheckboxBlankCircleFill
                      size={16}
                      color={insightAccentStyle.color}
                      className="mt-0.5"
                      style={{ flexShrink: 0 }}
                      aria-hidden
                    />
                  ) : (
                    <RiCheckboxBlankCircleLine
                      size={16}
                      color={insightAccentStyle.color}
                      className="mt-0.5"
                      style={{ flexShrink: 0 }}
                      aria-hidden
                    />
                  )}
                  <span>
                    {aiData?.what_happening ??
                      (loadingMetrics ? ui.loading : ui.analyzing)}
                  </span>
                </p>
              )}
            </div>

            <ScenarioSwitcher
              current={scenario}
              onChange={(s) => void loadScenario(s)}
              disabled={loadingMetrics}
              language={language}
              showHint={!aiPanelOpen && aiData === null}
            />

            <section aria-label={ui.kpiSectionAria}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <KPICard
                  label={kpi.traffic_index}
                  value={metrics?.transport.traffic_index ?? 0}
                  unit=""
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "traffic")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                  language={language}
                />
                <KPICard
                  label={kpi.avg_speed}
                  value={metrics?.transport.avg_speed ?? 0}
                  unit="км/ч"
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "speed")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                  language={language}
                />
                <KPICard
                  label={kpi.incidents}
                  value={metrics?.transport.incidents ?? 0}
                  unit=""
                  status={metrics?.transport.status ?? "low"}
                  trend={kpiTrend(scenario, "incidents")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                  language={language}
                />
                <KPICard
                  label={kpi.aqi}
                  value={metrics?.ecology.aqi ?? 0}
                  unit=""
                  status={metrics?.ecology.status ?? "good"}
                  trend={kpiTrend(scenario, "aqi")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                  language={language}
                />
                <KPICard
                  label={kpi.co2}
                  value={metrics?.ecology.co2 ?? 0}
                  unit="ppm"
                  status={metrics?.ecology.status ?? "good"}
                  trend={kpiTrend(scenario, "co2")}
                  loading={loadingMetrics}
                  animate={animateKPI}
                  language={language}
                />
                <KPICard
                  label={kpi.temperature}
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
                  language={language}
                />
              </div>

              {metrics ? (
                <div className="mt-3">
                  <p className="mb-2 font-[family:var(--font-space-grotesk)] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    {ui.dataSources}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(Object.keys(metrics.data_sources) as (keyof DataSources)[]).map(
                      (key) => {
                        const raw = metrics.data_sources[key];
                        const real = !isSimulatedSource(raw);
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1.5 font-[family:var(--font-jetbrains-mono)] text-[10px] text-[var(--text-secondary)]"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: real
                                  ? "var(--status-good)"
                                  : "var(--text-secondary)",
                              }}
                              aria-hidden
                            />
                            {dataSourceLineLabel(key, language)}:{" "}
                            {translateSource(raw)}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            {metrics ? (
              <ChartSection
                chartData={metrics.chart_data}
                currentScenario={scenario}
                language={language}
                theme={theme}
              />
            ) : null}

            <AlertsBlock
              alerts={metrics?.alerts ?? []}
              loading={loadingMetrics}
              language={language}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {aiPanelOpen ? (
              <motion.div
                key="ai-panel"
                initial={{ opacity: 0, x: 60, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.97 }}
                transition={{
                  duration: 0.45,
                  ease: [0.23, 1, 0.32, 1],
                  opacity: { duration: 0.3 },
                }}
                className="min-w-0 self-start"
                style={{ position: "sticky", top: "56px" }}
              >
                <AIInsight
                  data={aiData}
                  loading={loadingAI}
                  error={error}
                  onClose={() => setAiPanelOpen(false)}
                  scenario={scenario}
                  aiMode={aiMode}
                  onAIModeChange={handleAIModeChange}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
      <Footer theme={theme} onToggleTheme={toggleTheme} />
    </main>
  );
}
