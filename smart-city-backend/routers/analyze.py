"""POST /api/analyze — OpenAI or Ollama JSON insight."""

import json
import os
import re
from typing import Any, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter
from openai import AsyncOpenAI
from pydantic import ValidationError

from models.schemas import AIResponse, AnalyzeRequest

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

SYSTEM_PROMPT_CLOUD = """
You are URBAN-AI, an expert analytical system for smart city management.
You are embedded in a real-time dashboard used by city officials in Almaty, Kazakhstan.

Your role: analyze incoming sensor data and deliver precise, actionable intelligence.

CONTEXT:
- City: Almaty, Kazakhstan
- Active domains: Transport + Ecology
- Data sources: Live AQI/weather API + simulated traffic patterns
- Decision-makers read your output under time pressure

ANALYTICAL FRAMEWORK:
1. Detect anomalies: compare current values against normal baselines
   - Traffic index normal: 20-45 | warning: 46-70 | critical: 71+
   - AQI normal: <50 | warning: 50-100 | moderate: 101-150 | critical: 151+
   - avg_speed normal: >40 km/h | warning: 25-40 | critical: <25

2. Identify cross-domain causality:
   - High traffic → CO2 rises with ~30min lag → AQI degrades
   - If traffic_index > 70 AND aqi > 100: treat as compound crisis
   - Always explain the cause-effect chain explicitly

3. Assess severity with precision:
   - Low: single metric slightly above threshold, no cascading effects
   - Medium: multiple metrics elevated OR one critically high
   - High: compound crisis OR any metric in danger zone with trend worsening

OUTPUT FORMAT (respond ONLY with this JSON, no markdown, no extra text):
{
  "what_happening": "2-3 sentence factual description of current city state. Mention specific values.",
  "critical_level": "Low|Medium|High",
  "critical_reasoning": "One sentence explaining WHY this severity level was chosen.",
  "actions": [
    "Specific action 1 with concrete detail (who does what)",
    "Specific action 2 with concrete detail",
    "Specific action 3 with concrete detail"
  ],
  "reasoning": "Explain the cause-effect chain between transport and ecology data. Reference specific numbers.",
  "warnings": [
    "Warning about what could worsen in next 30-60 minutes if no action taken",
    "Secondary risk to monitor"
  ],
  "confidence": "Низкая|Средняя|Высокая",
  "confidence_basis": "Brief explanation: what data supports this confidence level"
}

RULES:
- Never give generic advice ("increase awareness", "monitor situation")
- Always name specific streets, districts, or systems when inferring from Almaty context
- Actions must have an implied owner (traffic police, city transport dept, ecological service)
- If data looks normal: still provide value by noting positive trends or preventive recommendations
- Respond in Russian language
"""

SYSTEM_PROMPT_LOCAL = """
You are an urban analytics assistant for Almaty city dashboard.
Analyze the data below and respond ONLY in JSON format.

Baseline thresholds:
- traffic_index: normal<45, warning<70, critical>=70
- aqi: good<50, moderate<100, unhealthy>=150
- avg_speed: good>40km/h, warning<40, critical<25

Key rule: high traffic causes AQI to worsen after 30 minutes.

Respond ONLY with this JSON (no markdown, no preamble):
{
  "what_happening": "What is currently happening in the city. Include key numbers.",
  "critical_level": "Low|Medium|High",
  "critical_reasoning": "Why this severity level.",
  "actions": ["action1", "action2", "action3"],
  "reasoning": "Cause-effect between transport and ecology.",
  "warnings": ["risk1", "risk2"],
  "confidence": "Низкая|Средняя|Высокая",
  "confidence_basis": "Data basis for confidence."
}

Answer in Russian.
"""

RETRY_JSON_SUFFIX = "\n\nRespond only with valid JSON, no markdown or code fences."

_JSON_PARSE_FALLBACK = AIResponse(
    what_happening="Анализ временно недоступен",
    critical_level="Medium",
    actions=["Проверить подключение к AI сервису"],
    reasoning="Ошибка парсинга ответа модели",
    warnings=[],
    confidence="Низкая",
    confidence_basis="Fallback режим",
    error=True,
)

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


def _effective_llm_provider(body: AnalyzeRequest) -> Literal["openai", "ollama"]:
    """Request `mode` selects API; env `LLM_PROVIDER` is fallback when mode is absent."""
    if body.mode is not None:
        return body.mode
    return "ollama" if LLM_PROVIDER == "ollama" else "openai"


def _system_prompt_for_provider(provider: Literal["openai", "ollama"]) -> str:
    return SYSTEM_PROMPT_CLOUD if provider == "openai" else SYSTEM_PROMPT_LOCAL


def _chart_trend(chart: list[dict[str, Any]], key: str) -> str:
    if len(chart) < 2:
        return "stable"
    first = float(chart[0].get(key, 0))
    last = float(chart[-1].get(key, 0))
    if first == 0:
        return "stable" if last == 0 else "up"
    delta = (last - first) / max(abs(first), 1e-6)
    if delta > 0.05:
        return "up"
    if delta < -0.05:
        return "down"
    return "stable"


def _build_user_message(
    scenario: str,
    metrics: dict[str, Any],
    language: str,
) -> str:
    transport = metrics.get("transport") or {}
    ecology = metrics.get("ecology") or {}
    chart = list(metrics.get("chart_data") or [])
    traffic_trend = _chart_trend(chart, "traffic_index")
    ecology_trend = _chart_trend(chart, "co2")

    msg = f"""Current city data (scenario: {scenario}):

TRANSPORT:
- Traffic Index: {transport.get("traffic_index")} ({transport.get("status")})
- Average Speed: {transport.get("avg_speed")} km/h
- Incidents today: {transport.get("incidents")}
- Trend: {traffic_trend}

ECOLOGY:
- AQI: {ecology.get("aqi")} ({ecology.get("status")})
- CO2: {ecology.get("co2")} ppm
- Temperature: {ecology.get("temperature")}°C
- Trend: {ecology_trend}

Time: {metrics.get("timestamp", "")}
"""
    if language == "kz":
        msg += "\nRespond in Kazakh language."
    return msg


def _strip_json_fences(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def _parse_ai_json(raw: str) -> AIResponse:
    cleaned = _strip_json_fences(raw)
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    data = json.loads(cleaned)
    return AIResponse.model_validate(data)


def _parse_ai_json_safe(raw: str) -> Optional[AIResponse]:
    try:
        return _parse_ai_json(raw)
    except (json.JSONDecodeError, ValueError, ValidationError):
        return None


async def _call_openai(system_prompt: str, user_message: str) -> str:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    content = response.choices[0].message.content
    if content is None or not str(content).strip():
        raise ValueError("Empty OpenAI response content")
    return str(content)


async def _call_ollama(system_prompt: str, user_message: str) -> str:
    prompt = f"{system_prompt}\n\n{user_message}"
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


async def _invoke_llm(
    provider: Literal["openai", "ollama"],
    system_prompt: str,
    user_message: str,
) -> str:
    if provider == "ollama":
        return await _call_ollama(system_prompt, user_message)
    return await _call_openai(system_prompt, user_message)


async def _analyze_and_parse(
    provider: Literal["openai", "ollama"],
    system_prompt: str,
    user_message: str,
) -> AIResponse:
    raw_text = await _invoke_llm(provider, system_prompt, user_message)
    parsed = _parse_ai_json_safe(raw_text)
    if parsed is not None:
        return parsed

    raw_retry = await _invoke_llm(
        provider,
        system_prompt,
        user_message + RETRY_JSON_SUFFIX,
    )
    parsed_retry = _parse_ai_json_safe(raw_retry)
    if parsed_retry is not None:
        return parsed_retry
    return _JSON_PARSE_FALLBACK


@router.post("/analyze", response_model=AIResponse, response_model_exclude_none=True)
async def analyze(body: AnalyzeRequest) -> AIResponse:
    metrics = body.metrics
    provider = _effective_llm_provider(body)
    system_prompt = _system_prompt_for_provider(provider)
    user_message = _build_user_message(body.scenario, metrics, body.language)

    try:
        return await _analyze_and_parse(provider, system_prompt, user_message)
    except Exception as e:
        return _fallback_ai_response(e)
