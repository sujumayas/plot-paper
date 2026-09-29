import "server-only";
import { isSupabaseConfigured } from "@/config/site";

export type AIProviderName = "anthropic" | "mock" | "none";

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string | null;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens: number;
  /** Server-side refusal fallback (Claude API beta). */
  fallback: boolean;
  requireAuth: boolean;
  /** Requests per user (or IP) per hour. 0 = unlimited. */
  rateLimitPerHour: number;
  timeoutMs: number;
}

export const DEFAULT_MODEL = "claude-opus-5-5";

/**
 * Reads AI settings from the environment:
 *   ANTHROPIC_API_KEY   enables Claude
 *   AI_PROVIDER         anthropic | mock | none   (default: anthropic when a key is set)
 *   ANTHROPIC_MODEL     default claude-opus-5-5
 *   AI_EFFORT           low | medium | high | xhigh | max (default medium)
 *   AI_MAX_TOKENS       default 16000
 *   AI_REFUSAL_FALLBACK true | false (default true)
 *   AI_REQUIRE_AUTH     true | false | auto (auto = required when Supabase is configured; 1/yes/on also mean true)
 *   AI_RATE_LIMIT_PER_HOUR default 20
 *   AI_TIMEOUT_MS       default 120000 (minimum 5000)
 */
export function readAIConfig(env: Record<string, string | undefined> = process.env): AIConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
  const requested = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  let provider: AIProviderName = apiKey ? "anthropic" : "none";
  if (requested === "mock") provider = "mock";
  else if (requested === "none" || requested === "off") provider = "none";
  else if (requested === "anthropic") provider = apiKey ? "anthropic" : "none";
  const effort = ["low", "medium", "high", "xhigh", "max"].includes(env.AI_EFFORT ?? "") ? (env.AI_EFFORT as AIConfig["effort"]) : "medium";
  const auth = (env.AI_REQUIRE_AUTH ?? "").trim().toLowerCase() || "auto";
  const yes = ["1", "true", "yes", "on"].includes(auth);
  // Unset or empty → default (Number("") would be 0).
  const num = (v: string | undefined, d: number) => {
    if (v === undefined || v.trim() === "") return d;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  return {
    provider,
    apiKey,
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    effort,
    maxTokens: Math.min(64000, Math.max(1024, num(env.AI_MAX_TOKENS, 16000))),
    fallback: !["0", "false", "no", "off"].includes((env.AI_REFUSAL_FALLBACK ?? "").trim().toLowerCase()),
    requireAuth: yes || (auth === "auto" && isSupabaseConfigured()),
    rateLimitPerHour: num(env.AI_RATE_LIMIT_PER_HOUR, 20),
    timeoutMs: Math.max(5_000, num(env.AI_TIMEOUT_MS, 120_000)),
  };
}
