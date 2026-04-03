"""POST /api/analyze — OpenAI or Ollama JSON insight."""

import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter
from openai import AsyncOpenAI

from models.schemas import AIResponse, AnalyzeRequest

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

router = APIRouter(prefix="/api", tags=["analyze"])


def _fallback_ai_response(exc: Exception) -> AIResponse:
    return AIResponse(
        what_happening="Ошибка получения AI анализа",
        critical_level="Low",
        actions=[
            "Повторите запрос",
            "Проверьте подключение к AI",
            "Используйте ручной анализ данных",
        ],
        reasoning="AI анализ временно недоступен",
        confidence="Низкая",
        confidence_basis="Нет данных",
        error=str(exc),
    )


def _build_system_prompt(
    *,
    traffic_index: int,
    avg_speed: float,
    incidents: int,
    aqi: int,
    co2: float,
    temperature: float,
    alerts: list[dict[str, Any]],
    language: str,
) -> str:
    high_count = sum(1 for a in alerts if a["level"] == "high")
    lang_line = (
        "Respond in Kazakh language."
        if language == "kz"
        else "Respond in Russian language."
    )
    return f"""
You are an AI assistant for the Smart City Management Dashboard.
City: Almaty, Kazakhstan
Domains: Transport and Ecology

Current data:
- Traffic index: {traffic_index}/100
- Average speed: {avg_speed} km/h
- Road incidents: {incidents}
- AQI: {aqi} (WHO safe limit: 100)
- CO2: {co2} ppm (normal background: 400 ppm)
- Temperature: {temperature}°C

Active alerts: {len(alerts)} total, {high_count} high priority

Key relationship: traffic congestion causes AQI and CO2 to rise with ~1 hour lag.
Data sources: temperature and AQI are real-time sensor data. Transport and CO2 are modeled.

{lang_line}

Rules:
- Be concise and specific, max 2 sentences per field
- Reference actual numbers from the data above
- Use cause-effect reasoning
- Avoid generic advice

Output ONLY valid JSON, no markdown, no code fences, no extra text:
{{
  "what_happening": "one sentence describing current city state with specific numbers",
  "critical_level": "Low|Medium|High",
  "actions": ["specific action 1", "specific action 2", "specific action 3"],
  "reasoning": "cause-effect explanation referencing actual metric values",
  "confidence": "Низкая|Средняя|Высокая",
  "confidence_basis": "what data supports this assessment"
}}
"""


async def _call_openai(system_prompt: str, scenario: str) -> str:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze scenario: {scenario}"},
        ],
    )
    content = response.choices[0].message.content
    if content is None or not str(content).strip():
        raise ValueError("Empty OpenAI response content")
    return str(content)


async def _call_ollama(system_prompt: str, scenario: str) -> str:
    prompt = system_prompt + "\nAnalyze scenario: " + scenario
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:3b",
                "prompt": prompt,
                "stream": False,
            },
        )
        r.raise_for_status()
        response_json = r.json()
        raw = response_json.get("response")
        if raw is None or not str(raw).strip():
            raise ValueError("Empty Ollama response")
        return str(raw)


def _parse_ai_json(raw: str) -> AIResponse:
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    data = json.loads(cleaned)
    return AIResponse.model_validate(data)


@router.post("/analyze", response_model=AIResponse, response_model_exclude_none=True)
async def analyze(body: AnalyzeRequest) -> AIResponse:
    metrics = body.metrics
    traffic_index = int(metrics["transport"]["traffic_index"])
    avg_speed = float(metrics["transport"]["avg_speed"])
    incidents = int(metrics["transport"]["incidents"])
    aqi = int(metrics["ecology"]["aqi"])
    co2 = float(metrics["ecology"]["co2"])
    temperature = float(metrics["ecology"]["temperature"])
    alerts = list(metrics.get("alerts", []))

    system_prompt = _build_system_prompt(
        traffic_index=traffic_index,
        avg_speed=avg_speed,
        incidents=incidents,
        aqi=aqi,
        co2=co2,
        temperature=temperature,
        alerts=alerts,
        language=body.language,
    )

    try:
        if body.mode == "ollama":
            raw_text = await _call_ollama(system_prompt, body.scenario)
        elif body.mode == "openai" or LLM_PROVIDER == "openai":
            raw_text = await _call_openai(system_prompt, body.scenario)
        else:
            raw_text = await _call_openai(system_prompt, body.scenario)

        return _parse_ai_json(raw_text)
    except Exception as e:
        return _fallback_ai_response(e)
