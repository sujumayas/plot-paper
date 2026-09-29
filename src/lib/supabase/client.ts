"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/config/site";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Returns the browser Supabase client, or null when Supabase isn't configured. */
export function getBrowserClient() {
  if (cached) return cached;
  if (!isSupabaseConfigured()) return null;
  cached = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return cached;
}
