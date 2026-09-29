export const Palette = (accent: string): string[] => [
  accent,
  "#0039A6",
  "#64B4E6",
  "#FFB406",
  "#EB0046",
  "#00863F",
  "#2F4A9F",
  "#878C8F",
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
