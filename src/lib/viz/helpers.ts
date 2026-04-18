export const Palette = (accent: string): string[] => [
  accent,
  "oklch(64% 0.16 240)",
  "oklch(64% 0.16 150)",
  "oklch(64% 0.16 340)",
  "oklch(64% 0.16 80)",
  "oklch(50% 0.12 280)",
  "oklch(72% 0.14 25)",
  "oklch(56% 0.14 190)",
];

export const niceMax = (max: number): number => {
  if (max <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  let m: number;
  if (n <= 1) m = 1;
  else if (n <= 2) m = 2;
  else if (n <= 5) m = 5;
  else m = 10;
  return m * pow;
};

export const fmt = (n: unknown): string => {
  if (n === null || n === undefined || n === "") return "";
  if (typeof n !== "number") return String(n);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
};

export const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,\s$€£]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
