import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/viz/engine";
import { LOCALE_COOKIE_NAME, translate } from "./core";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE_NAME)?.value;
  return v === "es" || v === "en" ? v : siteConfig.defaultLocale;
}

export async function getServerT() {
  const locale = await getServerLocale();
  return { locale, t: (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(locale, key, vars) };
}
