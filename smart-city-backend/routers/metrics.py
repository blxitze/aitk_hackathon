"""GET /api/metrics — full implementation in a later step."""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics")
async def get_metrics(scenario: str = "normal") -> dict:
    """Stub response shape per API.md; wired to real/mock data later."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "timestamp": now,
        "scenario": scenario,
        "transport": {
            "traffic_index": 0,
            "avg_speed": 0.0,
            "incidents": 0,
            "status": "low",
        },
        "ecology": {
            "aqi": 0,
            "co2": 0.0,
            "temperature": 0.0,
            "status": "good",
        },
        "chart_data": [],
        "alerts": [],
        "correlation": {
            "description": "",
            "traffic_to_aqi_lag_hours": 1,
        },
        "data_sources": {
            "transport": "simulated",
            "temperature": "mock_fallback",
            "aqi": "mock_fallback",
            "co2": "simulated",
        },
    }
