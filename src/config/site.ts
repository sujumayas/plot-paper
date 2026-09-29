/**
 * Plotpaper site configuration — the one file to edit when you deploy your own.
 * Every value can also be set with an environment variable (see .env.example).
 */
import type { Locale } from "@/lib/viz/engine";

// Next.js only inlines literal `process.env.NEXT_PUBLIC_*` reads into client
// bundles, so every variable is referenced explicitly here.
const or = (v: string | undefined, fallback: string) => (v === undefined || v === "" ? fallback : v);

export const siteConfig = {
  name: or(process.env.NEXT_PUBLIC_SITE_NAME, "Plotpaper"),
  url: or(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  tagline: {
    en: "Beautiful charts from your spreadsheets — ready for slides, reports and socials.",
    es: "Gráficos hermosos desde tus hojas de cálculo, listos para presentaciones, reportes y redes.",
  } satisfies Record<Locale, string>,
  defaultLocale: (or(process.env.NEXT_PUBLIC_DEFAULT_LOCALE, "en") === "es" ? "es" : "en") as Locale,
  /** Defaults for every new chart. */
  chartDefaults: {
    theme: or(process.env.NEXT_PUBLIC_DEFAULT_THEME, "clean"),
    size: or(process.env.NEXT_PUBLIC_DEFAULT_SIZE, "landscape"),
    branding: or(process.env.NEXT_PUBLIC_CHART_BRANDING, "true") !== "false",
  },
  /** Footer credit printed on exported charts (when branding is on). */
  credit: or(process.env.NEXT_PUBLIC_CHART_CREDIT, "Made with Plotpaper"),
  links: {
    github: or(process.env.NEXT_PUBLIC_GITHUB_URL, "https://github.com/sujumayas/plot-paper"),
    twitter: or(process.env.NEXT_PUBLIC_TWITTER_URL, ""),
  },
};

export type SiteConfig = typeof siteConfig;

/** Supabase is optional: without it Plotpaper runs fully local-first. */
export const isSupabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
