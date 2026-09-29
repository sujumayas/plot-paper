import type { NumberFormat } from "./types";

export const DEFAULT_NUMBER_FORMAT: NumberFormat = {
  decimals: null,
  compact: true,
  prefix: "",
  suffix: "",
  locale: "en-US",
};

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, opts);
    } catch {
      f = new Intl.NumberFormat("en-US", opts);
    }
    cache.set(key, f);
  }
  return f;
}

function autoDecimals(n: number): number {
  const a = Math.abs(n);
  if (a === 0 || a >= 100) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 2;
  return Math.min(6, Math.max(2, -Math.floor(Math.log10(a)) + 2));
}

function wrap(s: string, f: NumberFormat, negative: boolean): string {
  // Keep the minus sign before the prefix: -$1.2k, not $-1.2k.
  const body = negative && s.startsWith("-") ? s.slice(1) : s;
  return (negative ? "−" : "") + f.prefix + body + f.suffix;
}

/** Formats a data value according to the user's number format. */
export function formatValue(n: number, f: NumberFormat = DEFAULT_NUMBER_FORMAT): string {
  if (!Number.isFinite(n)) return "–";
  const negative = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (f.compact && a >= 10_000) {
    s = nf(f.locale, {
      notation: "compact",
      maximumFractionDigits: f.decimals ?? (a >= 1e5 && a < 1e6 ? 0 : 1),
      minimumFractionDigits: f.decimals ?? 0,
    }).format(a);
  } else {
    const d = f.decimals ?? autoDecimals(a);
    s = nf(f.locale, {
      maximumFractionDigits: d,
      minimumFractionDigits: f.decimals ?? 0,
    }).format(a);
  }
  return wrap(s, f, negative);
}

/** Formats an axis tick; precision follows the tick step so labels don't repeat. */
export function formatTick(n: number, step: number, f: NumberFormat = DEFAULT_NUMBER_FORMAT): string {
  if (!Number.isFinite(n)) return "";
  const negative = n < 0;
  const a = Math.abs(n);
  const stepDecimals = decimalsOf(step);
  let s: string;
  if (f.compact && Math.max(a, step) >= 10_000) {
    s = nf(f.locale, { notation: "compact", maximumFractionDigits: 1 }).format(a);
  } else {
    const d = f.decimals ?? stepDecimals;
    s = nf(f.locale, { maximumFractionDigits: d, minimumFractionDigits: f.decimals !== null ? d : 0 }).format(a);
  }
  return wrap(s, f, negative && a !== 0);
}

/** Number of decimals needed to print `step` exactly (0.25 → 2, 5 → 0). */
export function decimalsOf(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = (+step.toPrecision(10)).toFixed(10).replace(/0+$/, "");
  const i = s.indexOf(".");
  return i < 0 ? 0 : Math.min(6, s.length - i - 1);
}

export function formatPercent(p: number, decimals = 0, locale = "en-US"): string {
  if (!Number.isFinite(p)) return "–";
  return nf(locale, { style: "percent", maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(p);
}
