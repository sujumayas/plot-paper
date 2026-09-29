import type { Locale } from "@/lib/viz/engine";
import { en, type Messages } from "./en";
import { es } from "./es";

export const DICTS: Record<Locale, Messages> = { en, es };
export const LOCALES: Locale[] = ["en", "es"];
export const LOCALE_COOKIE_NAME = "pp-locale";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

function lookup(dict: Messages, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Translates a key and fills {placeholders}. Falls back to English, then the key. */
export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale] ?? en, key) ?? lookup(en, key) ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : raw;
}
