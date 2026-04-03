"""Pattern-based mock transport + CO2 time series (24h). Temperature/AQI come from real API."""

from datetime import datetime, timezone
from typing import Any

# Hourly traffic_index bands: night 00–06, morning 07–09, midday 11–14, evening 17–19, interpolated elsewhere.
_TRAFFIC_BY_HOUR: list[int] = [
    18,
    17,
    16,
    15,
    17,
    22,
    24,  # 0–6 night 15–25
    78,
    85,
    82,  # 7–9 morning peak 75–90
    48,  # 10 transition
    38,
    35,
    32,
    42,  # 11–14 midday 30–45
    52,
    68,  # 15–16 build-up
    88,
    92,
    86,  # 17–19 evening peak 80–95
    65,
    45,
    28,
    20,  # 20–23 wind down
]

# Incidents: night 0–3, peak hours 8–20, midday 2–8 (deterministic per hour).
_INCIDENTS_BY_HOUR: list[int] = [
    1,
    0,
    2,
    1,
    1,
    2,
    2,
    12,
    16,
    14,
    6,
    4,
    3,
    5,
    6,
    10,
    14,
    18,
    20,
    16,
    8,
    5,
    2,
    1,
]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _avg_speed(traffic_index: int) -> float:
    return round(_clamp(65.0 - (traffic_index * 0.55), 15.0, 60.0), 1)


def _transport_status(traffic_index: int) -> str:
    if traffic_index > 70:
        return "high"
    if traffic_index >= 40:
        return "medium"
    return "low"


def _build_hourly_data() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for hour in range(24):
        ti = _TRAFFIC_BY_HOUR[hour]
        inc = _INCIDENTS_BY_HOUR[hour]
        lag_ti = _TRAFFIC_BY_HOUR[max(0, hour - 2)]
        co2 = 350.0 + (lag_ti * 2.0)
        co2 = _clamp(co2, 350.0, 550.0)
        rows.append(
            {
                "hour": hour,
                "traffic_index": ti,
                "avg_speed": _avg_speed(ti),
                "incidents": inc,
                "co2": round(co2, 1),
            }
        )
    return rows


HOURLY_DATA: list[dict[str, Any]] = _build_hourly_data()


def _iso_timestamp_utc(hour: int, minute: int = 0) -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()


def get_scenario(scenario: str) -> dict[str, Any]:
    """
    Snapshot for normal (13:00), rush_hour (18:00), or emergency (extreme overrides).
    Ecology temperature/aqi/status are None here — merged later from real API.
    """
    s = (scenario or "normal").lower().replace("-", "_")
    if s == "rush_hour":
        h = 18
        m = 0
        row = HOURLY_DATA[h]
    elif s == "emergency":
        h = 18
        m = 45
        return {
            "timestamp": _iso_timestamp_utc(h, m),
            "scenario": "emergency",
            "transport": {
                "traffic_index": 95,
                "avg_speed": 12.0,
                "incidents": 25,
                "status": _transport_status(95),
            },
            "ecology": {
                "co2": 580.0,
                "temperature": None,
                "aqi": None,
                "status": None,
            },
            "chart_data": HOURLY_DATA,
        }
    else:
        # normal (default)
        h = 13
        m = 0
        row = HOURLY_DATA[h]

    ti = int(row["traffic_index"])
    scenario_name = "rush_hour" if s == "rush_hour" else "normal"
    return {
        "timestamp": _iso_timestamp_utc(h, m),
        "scenario": scenario_name,
        "transport": {
            "traffic_index": ti,
            "avg_speed": float(row["avg_speed"]),
            "incidents": int(row["incidents"]),
            "status": _transport_status(ti),
        },
        "ecology": {
            "co2": float(row["co2"]),
            "temperature": None,
            "aqi": None,
            "status": None,
        },
        "chart_data": HOURLY_DATA,
    }
