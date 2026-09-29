import { describe, expect, it } from "vitest";
import { decimalsOf, formatPercent, formatTick, formatValue } from "@/lib/viz/format";
import { band, hexToRgb, isHexColor, linear, logScale, mixHex, readableOn, tickStep } from "@/lib/viz/scale";
import { pretty, textWidth, truncate, wrapText, withMeasureFactor } from "@/lib/viz/text";

const nf = (o: Partial<Parameters<typeof formatValue>[1]> = {}) => ({ decimals: null, compact: true, prefix: "", suffix: "", locale: "en-US", ...o });

describe("linear scale", () => {
  it("includes zero and produces nice ticks", () => {
    const s = linear([3, 47], [100, 0]);
    expect(s.domain).toEqual([0, 50]);
    expect(s.ticks).toEqual([0, 10, 20, 30, 40, 50]);
    expect(s(0)).toBe(100);
    expect(s(50)).toBe(0);
  });

  it("handles negatives", () => {
    const s = linear([-12, 30], [0, 1]);
    expect(s.domain[0]).toBeLessThanOrEqual(-12);
    expect(s.ticks).toContain(0);
  });

  it("never divides by zero on constant or empty data", () => {
    for (const vals of [[5, 5], [0, 0], [-3, -3], [], [NaN, Infinity]]) {
      const s = linear(vals, [0, 100]);
      expect(Number.isFinite(s(0))).toBe(true);
      expect(s.domain.every(Number.isFinite)).toBe(true);
      expect(s.ticks.length).toBeGreaterThan(1);
    }
  });

  it("can skip zero", () => {
    expect(linear([310, 425], [0, 1], { zero: false }).domain[0]).toBeGreaterThan(250);
  });

  it("handles tiny and huge magnitudes", () => {
    expect(linear([0.0001, 0.0009], [0, 1]).ticks.length).toBeGreaterThan(2);
    expect(linear([1e14, 9e14], [0, 1]).ticks.every(Number.isFinite)).toBe(true);
  });

  it("tickStep snaps to 1-2-2.5-5", () => {
    expect(tickStep(0, 100, 5)).toBe(20);
    expect(tickStep(0, 1, 4)).toBe(0.25);
    expect(tickStep(0, 0, 5)).toBe(1);
  });
});

describe("log & band scales", () => {
  it("fits the data range", () => {
    const s = logScale([1.2, 7.5], [0, 100]);
    expect(s.domain[0]).toBeGreaterThan(0.9);
    expect(s.domain[1]).toBeLessThan(10);
    expect(s.ticks.length).toBeGreaterThanOrEqual(2);
  });

  it("ignores non-positive values", () => {
    const s = logScale([0, -5, 10, 1000], [0, 100]);
    expect(s.ticks.every((t) => t > 0)).toBe(true);
  });

  it("band spaces categories", () => {
    const b = band(["a", "b", "c"], [0, 300], 0.2);
    expect(b("a")).toBeLessThan(b("b"));
    expect(b.bandwidth).toBeGreaterThan(0);
    expect(b("zzz")).toBe(b("a"));
    expect(band([], [0, 100]).bandwidth).toBeGreaterThanOrEqual(0);
  });
});

describe("number formatting", () => {
  it("formats compactly with locale, prefix and suffix", () => {
    expect(formatValue(1234, nf())).toBe("1,234");
    expect(formatValue(12_400, nf())).toBe("12.4K");
    expect(formatValue(2_480_000, nf({ prefix: "$" }))).toBe("$2.5M");
    expect(formatValue(-1500, nf({ prefix: "$", compact: false }))).toBe("−$1,500");
    expect(formatValue(12.345, nf({ suffix: "%" }))).toBe("12.3%");
    expect(formatValue(1234.5, nf({ locale: "es-ES", compact: false, decimals: 1 }))).toBe("1234,5");
    expect(formatValue(1234567.8, nf({ locale: "de-DE", compact: false, decimals: 1 }))).toBe("1.234.567,8");
    expect(formatValue(0.00042, nf())).toBe("0.00042");
    expect(formatValue(NaN, nf())).toBe("–");
  });

  it("tick precision follows the step", () => {
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(2.5)).toBe(1);
    expect(decimalsOf(5)).toBe(0);
    expect(formatTick(17.5, 2.5, nf())).toBe("17.5");
    expect(formatTick(20, 2.5, nf())).toBe("20");
    expect(formatTick(0.3, 0.1, nf())).toBe("0.3");
    expect(formatTick(-5, 5, nf())).toBe("−5");
    expect(formatTick(0, 5, nf({ prefix: "$" }))).toBe("$0");
  });

  it("formats percents", () => {
    expect(formatPercent(0.256)).toBe("26%");
    expect(formatPercent(Infinity)).toBe("–");
  });
});

describe("colors", () => {
  it("parses and mixes hex colors", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("nope")).toBeNull();
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(isHexColor("#12ab9F")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#12345")).toBe(false);
    expect(readableOn("#ffffff")).toBe("#111418");
    expect(readableOn("#000000")).toBe("#FFFFFF");
  });
});

describe("text measurement", () => {
  it("truncates with an ellipsis and wraps", () => {
    const long = "A very long label that will never fit in a narrow slot";
    const t = truncate(long, 80, 14);
    expect(t.endsWith("…")).toBe(true);
    expect(textWidth(t, 14)).toBeLessThanOrEqual(80);
    expect(truncate("short", 200, 14)).toBe("short");
    expect(truncate("x", 0, 14)).toBe("");
    const lines = wrapText(long, 150, 14, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((l) => expect(textWidth(l, 14)).toBeLessThanOrEqual(150.5));
    expect(wrapText("", 100, 14)).toEqual([]);
  });

  it("scales with the active font width factor", () => {
    const base = textWidth("Hello", 10);
    expect(withMeasureFactor(1.2, () => textWidth("Hello", 10))).toBeCloseTo(base * 1.2);
    expect(textWidth("Hello", 10)).toBe(base);
  });

  it("prettifies column names", () => {
    expect(pretty("gdp_per_capita")).toBe("gdp per capita");
    expect(pretty(undefined)).toBe("");
  });
});
