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

from models.schemas import AILLMResponse, AIResponse, AnalyzeRequest, ForecastResponse

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

# Ollama / small models follow the user message language unless forced — keep rules in target language.
SYSTEM_PROMPT_LOCAL_RU = """
Ты — URBAN-AI, аналитическая система для дашборда Алматы. Проанализируй данные и верни ТОЛЬКО JSON, без markdown и без текста до/после JSON.

ЯЗЫК ОТВЕТА (критично):
- Все текстовые значения в JSON — СТРОГО на русском языке: what_happening, critical_reasoning, actions, reasoning, warnings, confidence_basis.
- Поле confidence — только одно из: Низкая | Средняя | Высокая.
- Запрещено писать по-английски в любых строковых полях. Только русский.
- Исключение: ключи JSON и значение critical_level остаются как в схеме (Low, Medium, High — латиница).

Пороги:
- traffic_index: норма<45, предупреждение<70, критично>=70
- aqi: хорошо<50, умеренно<100, опасно>=150
- avg_speed: норма>40 км/ч, предупреждение<40, критично<25

Правило: высокий трафик ухудшает AQI с лагом ~30 минут.

Формат ответа (только такой JSON):
{
  "what_happening": "2–3 предложения по-русски, с цифрами из данных.",
  "critical_level": "Low|Medium|High",
  "critical_reasoning": "Одно предложение по-русски: почему такой уровень.",
  "actions": ["действие 1 по-русски", "действие 2 по-русски", "действие 3 по-русски"],
  "reasoning": "Причинно-следственная связь транспорт↔экология по-русски, с числами.",
  "warnings": ["риск 1 по-русски", "риск 2 по-русски"],
  "confidence": "Низкая|Средняя|Высокая",
  "confidence_basis": "Кратко по-русски: на чём основана уверенность."
}
"""

SYSTEM_PROMPT_LOCAL_KZ = """
You are an urban analytics assistant for Almaty city dashboard.
Analyze the data below and respond ONLY in JSON format.

LANGUAGE (critical): All narrative string values must be in KAZAKH (қазақ тілі). Do not use English.
Exception: JSON keys and critical_level values remain Low|Medium|High as in the schema.
confidence: use Низкая|Средняя|Высокая exactly as shown (dashboard convention).

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
"""

RETRY_JSON_SUFFIX = "\n\nRespond only with valid JSON, no markdown or code fences."

_JSON_PARSE_FALLBACK = AILLMResponse(
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


def _fallback_ai_response(exc: Exception, forecast: ForecastResponse) -> AIResponse:
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
        forecast=forecast,
    )


def calculate_forecast(metrics: dict[str, Any], scenario: str) -> ForecastResponse:
    """Rule-based 60-minute horizon forecast (no ML)."""
    transport = metrics.get("transport") or {}
    ecology = metrics.get("ecology") or {}
    traffic = int(transport.get("traffic_index") or 0)
    aqi = int(ecology.get("aqi") or 0)
    co2 = float(ecology.get("co2") or 400.0)

    key = (scenario or "normal").strip().lower().replace("-", "_")

    if key == "rush_hour":
        traffic_delta = round(traffic * 0.12)
        aqi_delta = round(aqi * 0.15)
        co2_delta = float(round(co2 * 0.08))
    elif key == "emergency":
        traffic_delta = round(traffic * 0.05)
        aqi_delta = round(aqi * 0.18)
        co2_delta = float(round(co2 * 0.10))
    else:
        traffic_delta = -round(traffic * 0.08)
        aqi_delta = -round(aqi * 0.05)
        co2_delta = float(-round(co2 * 0.03))

    traffic_60 = min(100, max(0, traffic + traffic_delta))
    aqi_60 = max(0, aqi + aqi_delta)
    co2_60 = max(350.0, co2 + co2_delta)

    if traffic_60 > 85 or aqi_60 > 170:
        outlook = "ухудшение"
        outlook_level = "high"
    elif traffic_delta < 0 and aqi_delta < 0:
        outlook = "улучшение"
        outlook_level = "low"
    else:
        outlook = "стабильно"
        outlook_level = "medium"

    return ForecastResponse(
        horizon_minutes=60,
        traffic_index_60=traffic_60,
        traffic_delta=traffic_delta,
        aqi_60=aqi_60,
        aqi_delta=aqi_delta,
        co2_60=co2_60,
        co2_delta=co2_delta,
        outlook=outlook,
        outlook_level=outlook_level,
    )


def _effective_llm_provider(body: AnalyzeRequest) -> Literal["openai", "ollama"]:
    """Request `mode` selects API; env `LLM_PROVIDER` is fallback when mode is absent."""
    if body.mode is not None:
        return body.mode
    return "ollama" if LLM_PROVIDER == "ollama" else "openai"


def _system_prompt_for_provider(
    provider: Literal["openai", "ollama"],
    language: Literal["ru", "kz"],
) -> str:
    if provider == "openai":
        return SYSTEM_PROMPT_CLOUD
    return SYSTEM_PROMPT_LOCAL_RU if language == "ru" else SYSTEM_PROMPT_LOCAL_KZ


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


def _forecast_block_ru(forecast: ForecastResponse) -> str:
    td = forecast.traffic_delta
    ad = forecast.aqi_delta
    td_s = f"+{td}" if td > 0 else str(td)
    ad_s = f"+{ad}" if ad > 0 else str(ad)
    return f"""
ПРОГНОЗ НА 60 МИНУТ (расчётный):
- Индекс трафика: {forecast.traffic_index_60} ({td_s})
- AQI: {forecast.aqi_60} ({ad_s})
- CO₂: {forecast.co2_60} ppm
- Общий прогноз: {forecast.outlook}

Учти прогноз при формировании warnings и actions.
Если ситуация ухудшается — actions должны быть превентивными.
"""


def _forecast_block_kz(forecast: ForecastResponse) -> str:
    td = forecast.traffic_delta
    ad = forecast.aqi_delta
    td_s = f"+{td}" if td > 0 else str(td)
    ad_s = f"+{ad}" if ad > 0 else str(ad)
    return f"""
60 МИНУТТЫҚ БОЛЖАМ (есептелген):
- Трафик индексі: {forecast.traffic_index_60} ({td_s})
- AQI: {forecast.aqi_60} ({ad_s})
- CO₂: {forecast.co2_60} ppm
- Жалпы болжам: {forecast.outlook}

warnings және actions қалыптастыруда болжамды ескер.
Жағдай нашарласа — actions алдын ала сипатта болуы керек.
"""


def _forecast_block_en(forecast: ForecastResponse) -> str:
    td = forecast.traffic_delta
    ad = forecast.aqi_delta
    td_s = f"+{td}" if td > 0 else str(td)
    ad_s = f"+{ad}" if ad > 0 else str(ad)
    return f"""
60-MINUTE FORECAST (rule-based):
- Traffic index: {forecast.traffic_index_60} ({td_s})
- AQI: {forecast.aqi_60} ({ad_s})
- CO₂: {forecast.co2_60} ppm
- Outlook: {forecast.outlook}

Factor this forecast into warnings and actions; if outlook worsens, actions must be preventive.
"""


def _build_user_message(
    scenario: str,
    metrics: dict[str, Any],
    language: str,
    forecast: ForecastResponse,
) -> str:
    transport = metrics.get("transport") or {}
    ecology = metrics.get("ecology") or {}
    chart = list(metrics.get("chart_data") or [])
    traffic_trend = _chart_trend(chart, "traffic_index")
    ecology_trend = _chart_trend(chart, "co2")
    ts = metrics.get("timestamp", "")

    if language == "ru":
        trend_ru = {"up": "рост", "down": "снижение", "stable": "стабильно"}.get(
            traffic_trend, traffic_trend
        )
        eco_trend_ru = {"up": "рост", "down": "снижение", "stable": "стабильно"}.get(
            ecology_trend, ecology_trend
        )
        msg = f"""Данные по городу (сценарий: {scenario}):

ТРАНСПОРТ:
- Индекс трафика: {transport.get("traffic_index")} (статус: {transport.get("status")})
- Средняя скорость: {transport.get("avg_speed")} км/ч
- Инциденты: {transport.get("incidents")}
- Тренд трафика: {trend_ru}

ЭКОЛОГИЯ:
- AQI: {ecology.get("aqi")} (статус: {ecology.get("status")})
- CO₂: {ecology.get("co2")} ppm
- Температура: {ecology.get("temperature")}°C
- Тренд CO₂: {eco_trend_ru}

Время среза: {ts}
{_forecast_block_ru(forecast)}
ОБЯЗАТЕЛЬНО: весь текст в JSON-ответе — только на русском языке. Не используй английский в строковых полях.
"""
        return msg

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

Time: {ts}
{_forecast_block_en(forecast) if language != "kz" else _forecast_block_kz(forecast)}
"""
    if language == "kz":
        msg += "\nRespond in Kazakh language. Do not use English for narrative text."
    return msg


def _strip_json_fences(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def _parse_ai_json(raw: str) -> AILLMResponse:
    cleaned = _strip_json_fences(raw)
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    data = json.loads(cleaned)
    return AILLMResponse.model_validate(data)


def _parse_ai_json_safe(raw: str) -> Optional[AILLMResponse]:
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


def _llm_to_response(llm: AILLMResponse, forecast: ForecastResponse) -> AIResponse:
    return AIResponse(**llm.model_dump(), forecast=forecast)


async def _analyze_and_parse(
    provider: Literal["openai", "ollama"],
    system_prompt: str,
    user_message: str,
    forecast: ForecastResponse,
) -> AIResponse:
    raw_text = await _invoke_llm(provider, system_prompt, user_message)
    parsed = _parse_ai_json_safe(raw_text)
    if parsed is not None:
        return _llm_to_response(parsed, forecast)

    raw_retry = await _invoke_llm(
        provider,
        system_prompt,
        user_message + RETRY_JSON_SUFFIX,
    )
    parsed_retry = _parse_ai_json_safe(raw_retry)
    if parsed_retry is not None:
        return _llm_to_response(parsed_retry, forecast)
    return _llm_to_response(_JSON_PARSE_FALLBACK, forecast)


@router.post("/analyze", response_model=AIResponse, response_model_exclude_none=True)
async def analyze(body: AnalyzeRequest) -> AIResponse:
    metrics = body.metrics
    forecast = calculate_forecast(metrics, body.scenario)
    provider = _effective_llm_provider(body)
    system_prompt = _system_prompt_for_provider(provider, body.language)
    user_message = _build_user_message(body.scenario, metrics, body.language, forecast)

    try:
        return await _analyze_and_parse(
            provider, system_prompt, user_message, forecast
        )
    except Exception as e:
        return _fallback_ai_response(e, forecast)
