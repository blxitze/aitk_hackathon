import type { AIResponse, MetricsResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMetrics(scenario: string): Promise<MetricsResponse> {
  const res = await fetch(`${BASE_URL}/api/metrics?scenario=${scenario}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`);
  return res.json() as Promise<MetricsResponse>;
}

export async function fetchAnalysis(
  scenario: string,
  metrics: MetricsResponse,
  mode: string,
  language: string
): Promise<AIResponse> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, metrics, mode, language }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Analysis fetch failed: ${res.status}`);
  return res.json() as Promise<AIResponse>;
}
