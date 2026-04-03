/** UI labels for API enum strings — do not use for logic comparisons. */

export type UiLang = "ru" | "kz";

const STATUS_RU: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  good: "Норма",
  moderate: "Умеренно",
  unhealthy: "Опасно",
};

const STATUS_KZ: Record<string, string> = {
  high: "Жоғары",
  medium: "Орташа",
  low: "Төмен",
  good: "Қалыпты",
  moderate: "Орташа",
  unhealthy: "Қауіпті",
};

export function translateStatus(status: string, lang: UiLang = "ru"): string {
  const map = lang === "kz" ? STATUS_KZ : STATUS_RU;
  return map[status.toLowerCase()] ?? status;
}

const SCENARIO_RU: Record<string, string> = {
  normal: "Норма",
  rush_hour: "Час пик",
  emergency: "ЧС",
  morning_peak: "Утренний пик",
  night: "Ночь",
};

const SCENARIO_KZ: Record<string, string> = {
  normal: "Қалыпты",
  rush_hour: "Шың сағат",
  emergency: "ТЖ",
  morning_peak: "Таңғы шың",
  night: "Түн",
};

export function translateScenario(scenario: string, lang: UiLang = "ru"): string {
  const map = lang === "kz" ? SCENARIO_KZ : SCENARIO_RU;
  return map[scenario] ?? scenario;
}

const DOMAIN_RU: Record<string, string> = {
  transport: "Транспорт",
  ecology: "Экология",
};

const DOMAIN_KZ: Record<string, string> = {
  transport: "Көлік",
  ecology: "Экология",
};

export function translateDomain(domain: string, lang: UiLang = "ru"): string {
  const map = lang === "kz" ? DOMAIN_KZ : DOMAIN_RU;
  return map[domain] ?? domain;
}

export function translateSource(source: string): string {
  const map: Record<string, string> = {
    simulated: "Модель",
    mock_fallback: "Резерв",
    emergency_override: "ЧС режим",
    openweathermap: "OpenWeather",
    waqi: "WAQI",
  };
  return map[source.toLowerCase()] ?? source;
}

export function formatAlertTime(isoString: string, lang: UiLang = "ru"): string {
  try {
    const date = new Date(isoString);
    const locale = lang === "kz" ? "kk-KZ" : "ru-RU";
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

/** True when the backend labels this source as simulated / mock (not live API). */
export function isSimulatedSource(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes("simulated") ||
    v.includes("mock_fallback") ||
    v.includes("mock") ||
    v.includes("emergency_override")
  );
}
