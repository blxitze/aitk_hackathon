"""Pydantic request/response schemas."""

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class AnalyzeRequest(BaseModel):
    scenario: str
    metrics: dict[str, Any]
    mode: Optional[Literal["openai", "ollama"]] = None
    language: Literal["ru", "kz"] = "ru"


class ForecastResponse(BaseModel):
    horizon_minutes: int
    traffic_index_60: int
    traffic_delta: int
    aqi_60: int
    aqi_delta: int
    co2_60: float
    co2_delta: float
    outlook: str  # "ухудшение" | "стабильно" | "улучшение"
    outlook_level: str  # "high" | "medium" | "low"


class AILLMResponse(BaseModel):
    """LLM JSON payload (no forecast — forecast is computed server-side)."""

    model_config = ConfigDict(extra="ignore")

    what_happening: str
    critical_level: str  # "Low" | "Medium" | "High"
    critical_reasoning: Optional[str] = None
    actions: list[str]
    reasoning: str
    warnings: list[str] = Field(default_factory=list)
    confidence: str
    confidence_basis: str
    error: Optional[Union[str, bool]] = None


class AIResponse(AILLMResponse):
    forecast: ForecastResponse


class TransportMetrics(BaseModel):
    traffic_index: int
    avg_speed: float
    incidents: int
    status: str


class EcologyMetrics(BaseModel):
    aqi: int
    co2: float
    temperature: float
    status: str


class ChartHourlyPoint(BaseModel):
    hour: int
    traffic_index: int
    avg_speed: float
    incidents: int
    co2: float


class AlertItem(BaseModel):
    level: Literal["high", "medium", "low"]
    domain: Literal["transport", "ecology"]
    message: str
    time: str


class CorrelationBlock(BaseModel):
    description: str
    traffic_to_aqi_lag_hours: int = Field(..., ge=0)


class DataSourcesBlock(BaseModel):
    transport: str
    temperature: str
    aqi: str
    co2: str


class MetricsResponse(BaseModel):
    timestamp: str
    scenario: str
    transport: TransportMetrics
    ecology: EcologyMetrics
    chart_data: list[ChartHourlyPoint]
    alerts: list[AlertItem]
    correlation: CorrelationBlock
    data_sources: DataSourcesBlock


class ExportMetricsPayload(BaseModel):
    transport: TransportMetrics
    ecology: EcologyMetrics


class ExportRequest(BaseModel):
    scenario: str
    has_live_data: bool
    metrics: ExportMetricsPayload
    alerts: list[AlertItem]
    ai_insight: AIResponse
    ai_model: str
