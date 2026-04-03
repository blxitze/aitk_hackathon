"""Pydantic request/response schemas."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    scenario: str
    metrics: dict[str, Any]
    mode: Literal["openai", "ollama"] = "openai"
    language: Literal["ru", "kz"] = "ru"


class AIResponse(BaseModel):
    what_happening: str
    critical_level: str  # "Low" | "Medium" | "High"
    actions: list[str]
    reasoning: str
    confidence: str
    confidence_basis: str
    error: Optional[str] = None


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
