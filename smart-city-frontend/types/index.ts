interface TransportMetrics {
  traffic_index: number;
  avg_speed: number;
  incidents: number;
  status: "low" | "medium" | "high";
}

interface EcologyMetrics {
  aqi: number;
  co2: number;
  temperature: number;
  status: "good" | "moderate" | "unhealthy";
}

interface HourlyPoint {
  hour: number;
  traffic_index: number;
  avg_speed: number;
  incidents: number;
  co2: number;
  /** Per-hour AQI when provided by API; otherwise charts may derive a proxy. */
  aqi?: number;
}

interface Alert {
  level: "high" | "medium" | "low";
  domain: "transport" | "ecology";
  message: string;
  time: string;
}

interface Correlation {
  description: string;
  traffic_to_aqi_lag_hours: number;
}

interface DataSources {
  transport: string;
  temperature: string;
  aqi: string;
  co2: string;
}

interface MetricsResponse {
  timestamp: string;
  scenario: string;
  transport: TransportMetrics;
  ecology: EcologyMetrics;
  chart_data: HourlyPoint[];
  alerts: Alert[];
  correlation: Correlation;
  data_sources: DataSources;
}

interface AIResponse {
  what_happening: string;
  critical_level: "Low" | "Medium" | "High";
  critical_reasoning?: string;
  actions: string[];
  reasoning: string;
  warnings?: string[];
  confidence: string;
  confidence_basis: string;
  error?: string | boolean;
}

export type KPICardStatus =
  | "low"
  | "medium"
  | "high"
  | "good"
  | "moderate"
  | "unhealthy";

export type KPICardTrend = "up" | "down" | "stable";

export type UiLanguage = "ru" | "kz";

export type ThemeMode = "dark" | "light";

export interface KPICardProps {
  label: string;
  value: number | string;
  unit: string;
  status: KPICardStatus;
  trend?: KPICardTrend;
  loading?: boolean;
  animate?: boolean;
  language?: UiLanguage;
}

export interface ScenarioSwitcherProps {
  current: string;
  onChange: (scenario: string) => void;
  disabled?: boolean;
  language: UiLanguage;
  showHint?: boolean;
}

export interface ChartSectionProps {
  chartData: HourlyPoint[];
  currentScenario: string;
  language?: UiLanguage;
  theme: ThemeMode;
}

export interface AlertsBlockProps {
  alerts: Alert[];
  loading?: boolean;
  language?: UiLanguage;
}

export type AiActiveModel = "cloud" | "local";

export interface AIInsightProps {
  data: AIResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  /** Used with data to re-run entrance animation on new scenario. */
  currentScenario: string;
  currentMetrics: MetricsResponse | null;
  currentAlerts: Alert[];
  activeModel: AiActiveModel;
  aiMode: AiMode;
  onAIModeChange: (mode: AiMode) => void;
}

export type AiMode = "openai" | "ollama";

export interface ExportPdfPayload {
  scenario: string;
  has_live_data: boolean;
  metrics: {
    transport: TransportMetrics;
    ecology: EcologyMetrics;
  };
  alerts: Alert[];
  ai_insight: AIResponse;
  ai_model: string;
}

export interface HeaderProps {
  language: UiLanguage;
  onLanguageChange: (lang: UiLanguage) => void;
  aiPanelOpen: boolean;
  onToggleAIPanel: () => void;
}

export interface AlmatyMapProps {
  scenario: string;
  language: UiLanguage;
}

export interface FooterProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export type {
  TransportMetrics,
  EcologyMetrics,
  HourlyPoint,
  Alert,
  Correlation,
  DataSources,
  MetricsResponse,
  AIResponse,
};
