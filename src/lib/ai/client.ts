"use client";

import type { AIError, AIStatus, ChartSuggestion, SpecRequest, SpecResponse, SuggestRequest } from "./protocol";

let statusPromise: Promise<AIStatus> | null = null;

export function getAIStatus(): Promise<AIStatus> {
  if (!statusPromise) {
    statusPromise = fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : { enabled: false, provider: "none", model: null, requiresAuth: false }))
      .catch(() => ({ enabled: false, provider: "none" as const, model: null, requiresAuth: false }));
  }
  return statusPromise;
}

export class AIRequestError extends Error {
  constructor(
    message: string,
    public code: AIError["code"] | "network",
  ) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new AIRequestError("Network error — check your connection.", "network");
  }
  const data = (await res.json().catch(() => null)) as (T & Partial<AIError>) | null;
  if (!res.ok || !data || data.error) {
    throw new AIRequestError(data?.error ?? `Request failed (${res.status})`, data?.code ?? "upstream");
  }
  return data;
}

export const suggestChart = (req: SuggestRequest, signal?: AbortSignal) => post<ChartSuggestion>("/api/ai/suggest", req, signal);
export const generateSpec = (req: SpecRequest, signal?: AbortSignal) => post<SpecResponse>("/api/ai/chart-type", req, signal);
