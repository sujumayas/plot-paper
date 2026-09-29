"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/viz/engine";
import { lt } from "@/lib/viz/engine";
import type { LText } from "@/lib/viz/types";
import { LOCALE_COOKIE_NAME, translate, type MessageKey } from "./core";

export { DICTS, LOCALES, translate, type MessageKey } from "./core";
export const LOCALE_COOKIE = LOCALE_COOKIE_NAME;

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  /** Localizes chart-library text ({en, es} objects). */
  l: (text: LText | undefined) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      l: (text) => lt(text, locale),
    }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Outside the provider (tests, isolated renders): English.
    return {
      locale: "en",
      setLocale: () => undefined,
      t: (key, vars) => translate("en", key, vars),
      l: (text) => lt(text, "en"),
    };
  }
  return ctx;
}
