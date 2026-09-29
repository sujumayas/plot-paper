import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_ROWS,
  autoMap,
  coerceRows,
  detectDecimal,
  detectDelimiter,
  groupRows,
  inferType,
  mappingIssues,
  parseDate,
  parseDelimited,
  parseJSONRows,
  parseNumber,
  parseTextToTable,
  toCSV,
  topN,
  typeTable,
} from "@/lib/viz/data";
import { barChart } from "@/lib/viz/charts/bars";
import { lineChart } from "@/lib/viz/charts/lines";
import { scatterChart } from "@/lib/viz/charts/relations";

describe("parseNumber", () => {
  it.each([
    [42, 42],
    ["42", 42],
    ["1,234.5", 1234.5],
    ["1.234,5", 1234.5],
    ["1,234,567", 1234567],
    ["1.234.567", 1234567],
    ["3,5", 3.5],
    ["$1,200", 1200],
    ["S/ 1,200.50", 1200.5],
    ["US$ 2.310,75", 2310.75],
    ["€ 99", 99],
    ["1 234", 1234],
    ["12%", 12],
    ["(300)", -300],
    ["−4.5", -4.5],
    ["-4.5", -4.5],
    ["+7", 7],
    ["2.5k", 2500],
    ["3M", 3_000_000],
    ["1e3", 1000],
    ["  17  ", 17],
    ["12 USD", 12],
  ])("%s → %s", (input, expected) => {
    expect(parseNumber(input as string)).toBeCloseTo(expected as number, 9);
  });

  it.each(["", "  ", "N/A", "n/a", "-", "—", "NaN", "null", "abc", "12abc", "1-2", "#N/A", "?"])("%s → null", (input) => {
    expect(parseNumber(input)).toBeNull();
  });

  it("rejects non-finite numbers and nullish values", () => {
    expect(parseNumber(Infinity)).toBeNull();
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });

  it("honors an explicit decimal separator", () => {
    expect(parseNumber("1.200", ",")).toBe(1200);
    expect(parseNumber("1.200", ".")).toBe(1.2);
    expect(parseNumber("1,200", ".")).toBe(1200);
  });
});

describe("detectDecimal", () => {
  it("detects comma decimals from unambiguous values", () => {
    expect(detectDecimal(["S/ 1.200", "980,40", "1.234,5"])).toBe(",");
  });
  it("detects dot decimals", () => {
    expect(detectDecimal(["1,200", "980.40", "12.5"])).toBe(".");
  });
  it("returns null when ambiguous", () => {
    expect(detectDecimal(["1.200", "3.400"])).toBeNull();
  });
});

describe("parseDelimited", () => {
  it("detects delimiters", () => {
    expect(detectDelimiter("a,b\n1,2")).toBe(",");
    expect(detectDelimiter("a;b\n1;2")).toBe(";");
    expect(detectDelimiter("a\tb\n1\t2")).toBe("\t");
    expect(detectDelimiter("a|b|c\n1|2|3")).toBe("|");
  });

  it("handles quotes, escaped quotes, embedded newlines, CRLF and BOM", () => {
    const t = parseDelimited('﻿name,note\r\n"Smith, J","said ""hi""\nthen left"\r\nAna,ok\r\n');
    expect(t.headers).toEqual(["name", "note"]);
    expect(t.rows).toEqual([
      ["Smith, J", 'said "hi"\nthen left'],
      ["Ana", "ok"],
    ]);
  });

  it("dedupes and fills empty headers", () => {
    const t = parseDelimited("a,,a,a\n1,2,3,4");
    expect(t.headers).toEqual(["a", "column_2", "a_2", "a_3"]);
  });

  it("pads ragged rows and warns", () => {
    const t = parseDelimited("a,b,c\n1,2\n1,2,3,4");
    expect(t.rows).toEqual([
      ["1", "2", ""],
      ["1", "2", "3"],
    ]);
    expect(t.warnings).toContain("ragged-rows");
  });

  it("skips blank lines and survives empty input", () => {
    expect(parseDelimited("a,b\n\n1,2\n\n").rows).toHaveLength(1);
    expect(parseDelimited("").headers).toEqual([]);
    expect(parseDelimited("\n\n  \n").rows).toEqual([]);
  });

  it("warns on an unterminated quote instead of crashing", () => {
    const t = parseDelimited('a,b\n1,"oops\n2,3');
    expect(t.warnings).toContain("unterminated-quote");
  });

  it("truncates huge inputs", () => {
    const big = "v\n" + Array.from({ length: MAX_ROWS + 50 }, (_, i) => i).join("\n");
    const t = parseDelimited(big);
    expect(t.rows).toHaveLength(MAX_ROWS);
    expect(t.warnings).toContain("truncated-rows");
  });

  it("round-trips through toCSV", () => {
    const rows = [{ a: 'x, "y"', b: 1 }, { a: "line\nbreak", b: null }];
    const csv = toCSV(["a", "b"], rows);
    const back = parseDelimited(csv);
    expect(back.rows).toEqual([
      ['x, "y"', "1"],
      ["line\nbreak", ""],
    ]);
  });
});

describe("messy real-world CSV fixture", () => {
  const text = readFileSync("tests/fixtures/messy.csv", "utf8");
  const expected = JSON.parse(readFileSync("tests/fixtures/messy.expected.json", "utf8")) as { row: number; column: string; value: number }[];
  const { columns, rows, warnings } = parseTextToTable(text);

  it("parses every expected cell", () => {
    for (const e of expected) {
      expect(rows[e.row][e.column], `${e.column}[${e.row}]`).toBeCloseTo(e.value, 6);
    }
  });

  it("types columns sensibly and reports problems", () => {
    const type = (n: string) => columns.find((c) => c.name === n)?.type;
    expect(type("Ventas")).toBe("number");
    expect(type("Costo")).toBe("number");
    expect(type("Unidades")).toBe("number");
    expect(type("Tienda")).toBe("string");
    expect(type("Fecha")).toBe("date");
    expect(columns.some((c) => c.name === "Ventas_2")).toBe(true);
    expect(warnings).toContain("ragged-rows");
    expect(rows.length).toBeGreaterThan(20);
  });

  it("treats N/A and dashes as missing", () => {
    const margen = rows.map((r) => r.Margen);
    expect(margen).toContain(null);
  });
});

describe("type inference", () => {
  it("infers numbers, dates and strings", () => {
    expect(inferType([1, "2", "3,5", null, ""])).toBe("number");
    expect(inferType(["2024-01-01", "2024-02-01"])).toBe("date");
    expect(inferType(["a", "b", "3"])).toBe("string");
    expect(inferType([])).toBe("string");
  });

  it("typeTable converts numeric columns", () => {
    const t = typeTable({ headers: ["k", "v"], rows: [["a", "1,5"], ["b", ""]] });
    expect(t.rows).toEqual([
      { k: "a", v: 1.5 },
      { k: "b", v: null },
    ]);
  });

  it("parses dates in common formats", () => {
    expect(parseDate("2024")).toBe(Date.UTC(2024, 0, 1));
    expect(parseDate("2024-03")).toBe(Date.UTC(2024, 2, 1));
    expect(parseDate("2024-03-05")).toBe(Date.UTC(2024, 2, 5));
    expect(parseDate("not a date")).toBeNull();
  });
});

describe("JSON input", () => {
  it("accepts arrays, {data} and {columns, rows}", () => {
    expect(parseJSONRows('[{"a":1},{"a":2}]')?.rows).toHaveLength(2);
    expect(parseJSONRows('{"data":[{"a":1}]}')?.rows).toHaveLength(1);
    const t = parseJSONRows('{"columns":["x","y"],"rows":[[1,2],[3,4]]}');
    expect(t?.rows).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it("rejects garbage and flattens nested values", () => {
    expect(parseJSONRows("{not json")).toBeNull();
    expect(parseJSONRows('"just a string"')).toBeNull();
    const t = parseJSONRows('[{"a":{"b":1}}, 5, null]');
    expect(t?.rows).toEqual([{ a: "[object Object]" }]);
  });

  it("parseTextToTable detects JSON vs CSV", () => {
    expect(parseTextToTable('[{"a":1}]').columns[0]).toEqual({ name: "a", type: "number" });
    expect(parseTextToTable("a\tb\n1\t2").columns.map((c) => c.name)).toEqual(["a", "b"]);
  });
});

describe("mapping", () => {
  const cols = [
    { name: "Country", type: "string" as const },
    { name: "GDP", type: "number" as const },
    { name: "Population", type: "number" as const },
  ];

  it("maps by type when names don't match", () => {
    expect(autoMap(barChart, cols)).toEqual({ label: "Country", value: "GDP" });
  });

  it("prefers exact name matches", () => {
    const m = autoMap(barChart, [
      { name: "value", type: "number" },
      { name: "label", type: "string" },
    ]);
    expect(m).toEqual({ label: "label", value: "value" });
  });

  it("gives multiple fields every remaining numeric column", () => {
    const m = autoMap(lineChart, [{ name: "year", type: "number" }, ...cols.slice(1)]);
    expect(m.x).toBe("year");
    expect(m.series).toEqual(["GDP", "Population"]);
  });

  it("keeps valid previous choices", () => {
    expect(autoMap(barChart, cols, { label: "Country", value: "Population" }).value).toBe("Population");
    expect(autoMap(barChart, cols, { value: "Deleted" }).value).toBe("GDP");
  });

  it("reports missing and wrongly-typed fields", () => {
    expect(mappingIssues(barChart, {}, cols).map((i) => i.field)).toEqual(["label", "value"]);
    expect(mappingIssues(barChart, { label: "Country", value: "Country" }, cols)).toEqual([{ field: "value", kind: "type" }]);
    expect(mappingIssues(scatterChart, autoMap(scatterChart, cols), cols)).toEqual([]);
  });
});

describe("aggregation", () => {
  const rows = [
    { k: "a", v: 1 },
    { k: "b", v: 2 },
    { k: "a", v: 3 },
    { k: "a", v: null },
  ];
  it("groups preserving order", () => {
    const g = groupRows(rows, (r) => String(r.k), [(r) => (typeof r.v === "number" ? r.v : null)], "sum");
    expect(g.map((x) => [x.label, x.values[0], x.count])).toEqual([
      ["a", 4, 3],
      ["b", 2, 1],
    ]);
    expect(groupRows(rows, (r) => String(r.k), [(r) => (r.v as number) ?? null], "mean")[0].values[0]).toBe(2);
    expect(groupRows(rows, (r) => String(r.k), [(r) => (r.v as number) ?? null], "count")[0].values[0]).toBe(3);
  });

  it("topN folds the rest into Other", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ label: `i${i}`, values: [i + 1], count: 1 }));
    const top = topN(items, 4, "Other");
    expect(top).toHaveLength(4);
    expect(top.find((t) => t.label === "Other")?.values[0]).toBe(1 + 2 + 3 + 4 + 5 + 6 + 7);
  });

  it("coerceRows converts numeric columns", () => {
    expect(coerceRows([{ a: "1,5", b: "x" }], [{ name: "a", type: "number" }, { name: "b", type: "string" }])).toEqual([{ a: 1.5, b: "x" }]);
  });
});
