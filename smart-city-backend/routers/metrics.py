"""GET /api/metrics — mock transport + real/fallback weather & AQI."""

import asyncio
from typing import Any

from fastapi import APIRouter

from data.mock import get_scenario
from data.real_api import fetch_aqi_almaty, fetch_weather_almaty
from models.schemas import (
    AlertItem,
    CorrelationBlock,
    DataSourcesBlock,
    EcologyMetrics,
    MetricsResponse,
    TransportMetrics,
)

router = APIRouter(prefix="/api", tags=["metrics"])

_CORRELATION = CorrelationBlock(
    description="Трафик влияет на экологию с задержкой ~1 час",
    traffic_to_aqi_lag_hours=1,
)

_LEVEL_ORDER = {"high": 0, "medium": 1, "low": 2}


def _ecology_status(aqi: int) -> str:
    if aqi > 150:
        return "unhealthy"
    if 100 <= aqi <= 150:
        return "moderate"
    return "good"


def _build_alerts(
    traffic_index: int,
    incidents: int,
    aqi: int,
    co2: float,
    timestamp: str,
) -> list[AlertItem]:
    raw: list[dict[str, Any]] = []

    if traffic_index > 70:
        raw.append(
            {
                "level": "high",
                "domain": "transport",
                "message": "Высокая загруженность дорог. Пробки на основных магистралях.",
                "time": timestamp,
            }
        )

    if incidents > 15:
        raw.append(
            {
                "level": "high",
                "domain": "transport",
                "message": "Критическое количество инцидентов на дорогах.",
                "time": timestamp,
            }
        )
    elif 8 <= incidents <= 15:
        raw.append(
            {
                "level": "medium",
                "domain": "transport",
                "message": "Повышенное количество инцидентов на дорогах.",
                "time": timestamp,
            }
        )

    if 40 <= traffic_index <= 70:
        raw.append(
            {
                "level": "medium",
                "domain": "transport",
                "message": "Умеренная загруженность трафика.",
                "time": timestamp,
            }
        )

    if aqi > 150:
        raw.append(
            {
                "level": "high",
                "domain": "ecology",
                "message": "Качество воздуха опасно для здоровья. AQI превышает норму ВОЗ.",
                "time": timestamp,
            }
        )
    elif 100 <= aqi <= 150:
        raw.append(
            {
                "level": "medium",
                "domain": "ecology",
                "message": "Умеренное загрязнение воздуха. Связано с транспортной нагрузкой.",
                "time": timestamp,
            }
        )

    if co2 > 500:
        raw.append(
            {
                "level": "high",
                "domain": "ecology",
                "message": "Критический уровень CO2. Прямое следствие транспортных пробок.",
                "time": timestamp,
            }
        )

    raw.sort(key=lambda a: _LEVEL_ORDER.get(a["level"], 99))
    return [AlertItem.model_validate(x) for x in raw]


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(scenario: str = "normal") -> MetricsResponse:
    base = get_scenario(scenario)
    ts = str(base["timestamp"])
    scen = str(base["scenario"])
    transport_in = base["transport"]
    eco_base = base["ecology"]
    chart_data = base["chart_data"]

    ti = int(transport_in["traffic_index"])
    incidents = int(transport_in["incidents"])
    co2 = float(eco_base["co2"])

    # Emergency: hardcoded extremes only. All other scenarios (normal, rush_hour,
    # morning_peak, night) use live weather + AQI with mock fallback inside fetch_*.
    if scen == "emergency":
        temperature = 34.0
        aqi = 210
        weather_src = "emergency_override"
        aqi_src = "emergency_override"
    else:
        weather, aqi_data = await asyncio.gather(
            fetch_weather_almaty(),
            fetch_aqi_almaty(),
        )
        temperature = float(weather["temperature"])
        aqi = int(aqi_data["aqi"])
        weather_src = str(weather["source"])
        aqi_src = str(aqi_data["source"])

    eco_status = _ecology_status(aqi)
    alerts = _build_alerts(ti, incidents, aqi, co2, ts)

    return MetricsResponse(
        timestamp=ts,
        scenario=scen,
        transport=TransportMetrics.model_validate(transport_in),
        ecology=EcologyMetrics(
            aqi=aqi,
            co2=co2,
            temperature=temperature,
            status=eco_status,
        ),
        chart_data=chart_data,
        alerts=alerts,
        correlation=_CORRELATION,
        data_sources=DataSourcesBlock(
            transport="simulated",
            temperature=weather_src,
            aqi=aqi_src,
            co2="simulated",
        ),
    )
