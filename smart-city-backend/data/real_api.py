"""OpenWeatherMap + WAQI clients with httpx; any failure → mock fallback."""

import os
from typing import Any

import httpx

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
WAQI_TOKEN = os.getenv("WAQI_TOKEN")

_FALLBACK_WEATHER: dict[str, Any] = {
    "temperature": 22.0,
    "humidity": 45,
    "wind_speed": 3.2,
    "source": "mock_fallback",
}

_FALLBACK_AQI: dict[str, Any] = {"aqi": 85, "pm25": None, "source": "mock_fallback"}


async def fetch_weather_almaty() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "q": "Almaty,KZ",
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                },
            )
            response.raise_for_status()
            data = response.json()
            main = data.get("main") or {}
            wind = data.get("wind") or {}
            temp = float(main["temp"])
            return {
                "temperature": round(temp, 1),
                "humidity": int(main.get("humidity", 0)),
                "wind_speed": float(wind.get("speed", 0.0)),
                "source": "openweathermap",
            }
    except Exception:
        return dict(_FALLBACK_WEATHER)


async def fetch_aqi_almaty() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.waqi.info/feed/almaty/",
                params={"token": WAQI_TOKEN},
            )
            response.raise_for_status()
            payload = response.json()
            data = payload["data"]
            raw_aqi = data["aqi"]
            if isinstance(raw_aqi, dict):
                aqi_val = int(raw_aqi.get("value", raw_aqi.get("v", 0)))
            else:
                aqi_val = int(raw_aqi)
            iaqi = data.get("iaqi") or {}
            pm25_block = iaqi.get("pm25") or {}
            pm25 = pm25_block.get("v") if isinstance(pm25_block, dict) else None
            return {
                "aqi": aqi_val,
                "pm25": pm25,
                "source": "waqi",
            }
    except Exception:
        return dict(_FALLBACK_AQI)
