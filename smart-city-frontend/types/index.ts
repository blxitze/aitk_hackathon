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
  actions: string[];
  reasoning: string;
  confidence: string;
  confidence_basis: string;
  error?: string;
}

export type KPICardStatus =
  | "low"
  | "medium"
  | "high"
  | "good"
  | "moderate"
  | "unhealthy";

export type KPICardTrend = "up" | "down" | "stable";

export interface KPICardProps {
  label: string;
  value: number | string;
  unit: string;
  status: KPICardStatus;
  trend?: KPICardTrend;
  loading?: boolean;
  animate?: boolean;
}

export interface ScenarioSwitcherProps {
  current: string;
  onChange: (scenario: string) => void;
  disabled?: boolean;
}

export interface ChartSectionProps {
  chartData: HourlyPoint[];
  currentScenario: string;
}

export interface AlertsBlockProps {
  alerts: Alert[];
  loading?: boolean;
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
