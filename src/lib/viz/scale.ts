/** Tick step close to (max-min)/count, snapped to 1, 2, 2.5, 5 × 10^k. */
export function tickStep(min: number, max: number, count: number): number {
  const span = Math.abs(max - min);
  if (!Number.isFinite(span) || span === 0) return 1;
  const raw = span / Math.max(1, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * pow;
}

export type LinearScale = {
  (v: number): number;
  domain: [number, number];
  range: [number, number];
  ticks: number[];
  step: number;
};

export type LinearOpts = {
  /** Include zero in the domain (default true). */
  zero?: boolean;
  /** Round the domain to tick steps (default true). */
  nice?: boolean;
  ticks?: number;
};

/** Min of a large array (`Math.min(...a)` overflows the call stack past ~100k items). */
export function minOf(values: readonly number[], fallback = 0): number {
  let m = Infinity;
  for (const v of values) if (v < m) m = v;
  return m === Infinity ? fallback : m;
}

/** Max of a large array; see minOf. */
export function maxOf(values: readonly number[], fallback = 0): number {
  let m = -Infinity;
  for (const v of values) if (v > m) m = v;
  return m === -Infinity ? fallback : m;
}

/** Linear scale with nice, negative-aware ticks. Never divides by zero. */
export function linear(values: number[], range: [number, number], opts: LinearOpts = {}): LinearScale {
  const { zero = true, nice = true, ticks: tickCount = 5 } = opts;
  const finite = values.filter((v) => Number.isFinite(v));
  let lo = finite.length ? minOf(finite) : 0;
  let hi = finite.length ? maxOf(finite) : 1;
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (lo === hi) {
    if (lo === 0) hi = 1;
    else if (lo > 0) {
      hi = lo * 1.2;
      lo = zero ? 0 : lo * 0.8;
    } else {
      lo = hi * 1.2;
      hi = zero ? 0 : hi * 0.8;
    }
  }
  let step = tickStep(lo, hi, tickCount);
  if (nice) {
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    step = tickStep(lo, hi, tickCount);
    lo = Math.floor(lo / step + 1e-9) * step;
    hi = Math.ceil(hi / step - 1e-9) * step;
  }
  const ticks: number[] = [];
  const first = Math.ceil(lo / step - 1e-9) * step;
  for (let t = first, i = 0; t <= hi + step * 1e-9 && i < 100; t += step, i++) {
    ticks.push(Math.abs(t) < step * 1e-9 ? 0 : +t.toPrecision(12));
  }
  const [r0, r1] = range;
  const span = hi - lo || 1;
  const fn = ((v: number) => r0 + ((v - lo) / span) * (r1 - r0)) as LinearScale;
  fn.domain = [lo, hi];
  fn.range = range;
  fn.ticks = ticks;
  fn.step = step;
  return fn;
}

/** Log10 scale fitted to the data, with 1-2-5 ticks. Values must be > 0. */
export function logScale(values: number[], range: [number, number]): LinearScale {
  const lv = values.filter((v) => v > 0 && Number.isFinite(v)).map(Math.log10);
  let lo = lv.length ? minOf(lv) : 0;
  let hi = lv.length ? maxOf(lv) : 1;
  if (hi - lo < 0.3) {
    lo -= 0.15;
    hi += 0.15;
  }
  const pad = (hi - lo) * 0.04;
  lo -= pad;
  hi += pad;
  const [r0, r1] = range;
  const fn = ((v: number) => r0 + ((Math.log10(v) - lo) / (hi - lo)) * (r1 - r0)) as LinearScale;
  const inRange = (t: number) => Math.log10(t) >= lo - 1e-9 && Math.log10(t) <= hi + 1e-9;
  const pick = (mults: number[]) => {
    const out: number[] = [];
    for (let d = Math.floor(lo); d <= Math.ceil(hi); d++) {
      for (const m of mults) {
        const t = +(m * Math.pow(10, d)).toPrecision(12);
        if (inRange(t)) out.push(t);
      }
    }
    return out;
  };
  let ticks = pick([1, 2, 5]);
  if (ticks.length > 9) ticks = pick([1]);
  if (ticks.length < 3) ticks = pick([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((_, i, a) => a.length <= 10 || i % 2 === 0);
  fn.domain = [Math.pow(10, lo), Math.pow(10, hi)];
  fn.range = range;
  fn.ticks = ticks;
  fn.step = 0;
  return fn;
}

export type BandScale = {
  (key: string): number;
  bandwidth: number;
  step: number;
  domain: string[];
  center: (key: string) => number;
};

/** Evenly spaced bands. `padding` is the fraction of each step left empty. */
export function band(domain: string[], range: [number, number], padding = 0.3, outer = padding / 2): BandScale {
  const n = Math.max(1, domain.length);
  const [r0, r1] = range;
  const step = (r1 - r0) / (n - padding + outer * 2 || 1);
  const bandwidth = step * (1 - padding);
  const start = r0 + step * outer;
  const index = new Map(domain.map((d, i) => [d, i]));
  const fn = ((key: string) => start + (index.get(key) ?? 0) * step) as BandScale;
  fn.bandwidth = Math.max(0, bandwidth);
  fn.step = step;
  fn.domain = domain;
  fn.center = (key: string) => fn(key) + fn.bandwidth / 2;
  return fn;
}

/** Evenly spaced points (for line charts over categories). */
export function point(domain: string[], range: [number, number]): (i: number) => number {
  const [r0, r1] = range;
  const n = domain.length;
  return (i: number) => (n <= 1 ? (r0 + r1) / 2 : r0 + (i / (n - 1)) * (r1 - r0));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Linear interpolation between two hex colors. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(t, 0, 1)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Relative luminance (WCAG). */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white text, whichever reads better on `bg`. */
export function readableOn(bg: string, dark = "#111418", light = "#FFFFFF"): string {
  return luminance(bg) > 0.42 ? dark : light;
}

export function isHexColor(s: unknown): s is string {
  return typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
}
