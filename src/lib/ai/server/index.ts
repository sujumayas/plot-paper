import "server-only";
import { headers } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";
import { readAIConfig } from "./config";
import type { Deps } from "./handlers";
import { createMockProvider } from "./mock";
import { createAnthropicProvider, type AIProvider } from "./provider";
import { RateLimiter } from "./rateLimit";

const config = readAIConfig();
let provider: AIProvider | null = null;
if (config.provider === "anthropic") provider = createAnthropicProvider(config);
else if (config.provider === "mock") provider = createMockProvider();
const limiter = new RateLimiter(config.rateLimitPerHour);

/** Production dependencies for the AI route handlers. */
export async function aiDeps(): Promise<Deps> {
  const h = await headers();
  // Prefer headers set by the hosting platform (they can't be spoofed by the client);
  // the first X-Forwarded-For entry is client-controlled, so it comes last.
  const ip =
    h.get("x-nf-client-connection-ip")?.trim() ||
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip")?.trim() ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "local";
  return {
    config,
    provider,
    limiter,
    clientKey: ip,
    getUserId: async () => {
      const supa = await getServerClient();
      if (!supa) return null;
      const { data } = await supa.auth.getUser();
      return data.user?.id ?? null;
    },
  };
}
