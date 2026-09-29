import { isHexColor } from "./scale";
import { DEFAULT_NUMBER_FORMAT } from "./format";
import type { ChartStyle, LText, ResolvedTheme } from "./types";

/* ─────────────────────────────────────────────────────────────
 * Palettes
 * ───────────────────────────────────────────────────────────── */

export interface Palette {
  id: string;
  name: LText;
  colors: string[];
}

export const PALETTES: Palette[] = [
  { id: "vivid", name: { en: "Vivid", es: "Vívida" }, colors: ["#2F6BFF", "#FF6B3D", "#12B886", "#F03E8A", "#7C4DFF", "#FFB400", "#00A6C8", "#8A94A6"] },
  { id: "editorial", name: { en: "Editorial", es: "Editorial" }, colors: ["#D1495B", "#00798C", "#EDAE49", "#30638E", "#003D5B", "#8F2D56", "#6A994E", "#9C8F80"] },
  { id: "sunset", name: { en: "Sunset", es: "Atardecer" }, colors: ["#F94144", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D", "#43AA8B", "#577590", "#277DA1"] },
  { id: "ocean", name: { en: "Ocean", es: "Océano" }, colors: ["#0B4F8A", "#1D8BD1", "#57C4E5", "#0FA3A3", "#7FD8BE", "#315C8C", "#A0D2EB", "#15616D"] },
  { id: "forest", name: { en: "Forest", es: "Bosque" }, colors: ["#2D6A4F", "#E9A03B", "#52B788", "#8C5E3C", "#1B4332", "#B5C99A", "#D4A373", "#74C69D"] },
  { id: "pastel", name: { en: "Pastel", es: "Pastel" }, colors: ["#7FA7E8", "#F29C95", "#8CCFB0", "#F5C66B", "#B39DE8", "#EE9FC6", "#7CC3D4", "#AEB7C2"] },
  { id: "colorblind", name: { en: "Colorblind-safe", es: "Apta daltonismo" }, colors: ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#555555"] },
  { id: "neon", name: { en: "Neon", es: "Neón" }, colors: ["#00E0C6", "#F15BB5", "#FEE440", "#00BBF9", "#9B5DE5", "#FF8C42", "#7AE582", "#E0E6ED"] },
  { id: "mono", name: { en: "Monochrome", es: "Monocromo" }, colors: ["#1F2937", "#6B7280", "#9CA3AF", "#374151", "#D1D5DB", "#4B5563", "#111827", "#E5E7EB"] },
  { id: "newsroom", name: { en: "Newsroom", es: "Redacción" }, colors: ["#C8102E", "#1F1F1F", "#8C8C8C", "#E0A526", "#3E6D9C", "#BFBFBF", "#6E2C2C", "#5C5C5C"] },
  { id: "emerald", name: { en: "Emerald", es: "Esmeralda" }, colors: ["#05BE50", "#0039A6", "#64B4E6", "#FFB406", "#EB0046", "#00863F", "#2F4A9F", "#878C8F"] },
  { id: "blueprint", name: { en: "Blueprint", es: "Plano" }, colors: ["#FFFFFF", "#8FD3FF", "#FFD166", "#5CE1E6", "#FF8FA3", "#B8C0FF", "#C6F6D5", "#9FB3C8"] },
];

/* ─────────────────────────────────────────────────────────────
 * Fonts (self-hosted in /public/fonts so exports can embed them)
 * ───────────────────────────────────────────────────────────── */

export interface FontFace {
  family: string;
  weight: number;
  url: string;
}

export const FONT_FACES: FontFace[] = [
  { family: "Inter", weight: 400, url: "/fonts/inter-latin-400-normal.woff2" },
  { family: "Inter", weight: 700, url: "/fonts/inter-latin-700-normal.woff2" },
  { family: "Space Grotesk", weight: 400, url: "/fonts/space-grotesk-latin-400-normal.woff2" },
  { family: "Space Grotesk", weight: 700, url: "/fonts/space-grotesk-latin-700-normal.woff2" },
  { family: "Fraunces", weight: 400, url: "/fonts/fraunces-latin-400-normal.woff2" },
  { family: "Fraunces", weight: 700, url: "/fonts/fraunces-latin-700-normal.woff2" },
  { family: "Montserrat", weight: 400, url: "/fonts/montserrat-latin-400-normal.woff2" },
  { family: "Montserrat", weight: 700, url: "/fonts/montserrat-latin-700-normal.woff2" },
  { family: "IBM Plex Mono", weight: 400, url: "/fonts/ibm-plex-mono-latin-400-normal.woff2" },
  { family: "IBM Plex Mono", weight: 700, url: "/fonts/ibm-plex-mono-latin-700-normal.woff2" },
  { family: "DM Serif Display", weight: 400, url: "/fonts/dm-serif-display-latin-400-normal.woff2" },
];

const stack = (family: string, generic: "sans-serif" | "serif" | "monospace" = "sans-serif") =>
  `'${family}', ${generic === "monospace" ? "ui-monospace, Menlo, monospace" : generic === "serif" ? "Georgia, 'Times New Roman', serif" : "'Helvetica Neue', Arial, sans-serif"}`;

export interface FontPairing {
  id: string;
  name: LText;
  display: string;
  body: string;
  displayWeight: number;
  families: string[];
  /** Average glyph width relative to Inter (used for text layout). */
  widthFactor: number;
}

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "modern", name: { en: "Modern", es: "Moderna" }, display: stack("Inter"), body: stack("Inter"), displayWeight: 700, families: ["Inter"], widthFactor: 1 },
  { id: "grotesk", name: { en: "Grotesk", es: "Grotesca" }, display: stack("Space Grotesk"), body: stack("Inter"), displayWeight: 700, families: ["Space Grotesk", "Inter"], widthFactor: 1.02 },
  { id: "editorial", name: { en: "Editorial", es: "Editorial" }, display: stack("Fraunces", "serif"), body: stack("Inter"), displayWeight: 700, families: ["Fraunces", "Inter"], widthFactor: 1.06 },
  { id: "classic", name: { en: "Classic serif", es: "Serif clásica" }, display: stack("DM Serif Display", "serif"), body: stack("Inter"), displayWeight: 400, families: ["DM Serif Display", "Inter"], widthFactor: 1.0 },
  { id: "geometric", name: { en: "Geometric", es: "Geométrica" }, display: stack("Montserrat"), body: stack("Montserrat"), displayWeight: 700, families: ["Montserrat"], widthFactor: 1.12 },
  { id: "technical", name: { en: "Technical", es: "Técnica" }, display: stack("IBM Plex Mono", "monospace"), body: stack("IBM Plex Mono", "monospace"), displayWeight: 700, families: ["IBM Plex Mono"], widthFactor: 1.2 },
];

/* ─────────────────────────────────────────────────────────────
 * Themes
 * ───────────────────────────────────────────────────────────── */

export interface Theme {
  id: string;
  name: LText;
  dark: boolean;
  background: string;
  surface: string;
  ink: string;
  text: string;
  muted: string;
  grid: string;
  axis: string;
  positive: string;
  negative: string;
  palette: string;
  fonts: string;
}

export const THEMES: Theme[] = [
  { id: "clean", name: { en: "Clean", es: "Limpio" }, dark: false, background: "#FFFFFF", surface: "#F6F7F9", ink: "#101828", text: "#344054", muted: "#667085", grid: "#EAECF0", axis: "#C4CAD4", positive: "#12B76A", negative: "#F04438", palette: "vivid", fonts: "modern" },
  { id: "paper", name: { en: "Paper", es: "Papel" }, dark: false, background: "#FBF8F1", surface: "#F3EEE2", ink: "#1C1B19", text: "#3D3A35", muted: "#8A857C", grid: "#E9E3D6", axis: "#BDB5A6", positive: "#2E7D4F", negative: "#C0392B", palette: "editorial", fonts: "editorial" },
  { id: "midnight", name: { en: "Midnight", es: "Medianoche" }, dark: true, background: "#0E131F", surface: "#171F2E", ink: "#F5F7FA", text: "#C9D1DC", muted: "#8591A3", grid: "#1E2838", axis: "#3A4556", positive: "#3DDC97", negative: "#FF5C7A", palette: "neon", fonts: "grotesk" },
  { id: "newsprint", name: { en: "Newsprint", es: "Periódico" }, dark: false, background: "#F4F1EA", surface: "#EAE5DA", ink: "#121212", text: "#2B2B2B", muted: "#6F6A62", grid: "#DDD7CB", axis: "#A39E94", positive: "#2F6B3A", negative: "#C8102E", palette: "newsroom", fonts: "classic" },
  { id: "pastel", name: { en: "Soft", es: "Suave" }, dark: false, background: "#FFFBF5", surface: "#F7F0E6", ink: "#2A2433", text: "#4A4453", muted: "#8E8697", grid: "#EFE7DC", axis: "#CFC5B8", positive: "#3CA97A", negative: "#E0655F", palette: "pastel", fonts: "grotesk" },
  { id: "forest", name: { en: "Forest", es: "Bosque" }, dark: false, background: "#F3F6F1", surface: "#E7EDE3", ink: "#14231B", text: "#2F4034", muted: "#6D7C70", grid: "#DDE5D8", axis: "#AAB8A8", positive: "#2D6A4F", negative: "#B5452E", palette: "forest", fonts: "geometric" },
  { id: "blueprint", name: { en: "Blueprint", es: "Plano" }, dark: true, background: "#0B3D91", surface: "#0D4AAE", ink: "#FFFFFF", text: "#DCE8FF", muted: "#9DB7E8", grid: "#2355AC", axis: "#6D90D3", positive: "#9BF6C6", negative: "#FF9AA8", palette: "blueprint", fonts: "technical" },
  { id: "emerald", name: { en: "Emerald", es: "Esmeralda" }, dark: false, background: "#FFFFFF", surface: "#F4F5F7", ink: "#0F191E", text: "#333333", muted: "#878C8F", grid: "#ECEDED", axis: "#D9DADB", positive: "#05BE50", negative: "#EB0046", palette: "emerald", fonts: "geometric" },
];

/* ─────────────────────────────────────────────────────────────
 * Size presets
 * ───────────────────────────────────────────────────────────── */

export interface SizePreset {
  id: string;
  name: LText;
  hint: string;
  width: number;
  height: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "landscape", name: { en: "Landscape", es: "Horizontal" }, hint: "16:9 · X / Twitter, blogs", width: 1200, height: 675 },
  { id: "slide", name: { en: "Slide", es: "Diapositiva" }, hint: "1920×1080 · Keynote, PowerPoint", width: 1920, height: 1080 },
  { id: "square", name: { en: "Square", es: "Cuadrado" }, hint: "1:1 · Instagram", width: 1080, height: 1080 },
  { id: "portrait", name: { en: "Portrait", es: "Vertical" }, hint: "4:5 · Instagram, LinkedIn", width: 1080, height: 1350 },
  { id: "story", name: { en: "Story", es: "Historia" }, hint: "9:16 · Stories, Reels", width: 1080, height: 1920 },
  { id: "og", name: { en: "Link preview", es: "Vista de enlace" }, hint: "1200×630 · Open Graph", width: 1200, height: 630 },
  { id: "a4", name: { en: "A4 landscape", es: "A4 horizontal" }, hint: "Print · 150 dpi", width: 1754, height: 1240 },
  { id: "compact", name: { en: "Compact", es: "Compacto" }, hint: "800×500 · Docs, Notion", width: 800, height: 500 },
];

export const MIN_SIZE = 320;
export const MAX_SIZE = 4000;

/* ─────────────────────────────────────────────────────────────
 * Defaults & resolution
 * ───────────────────────────────────────────────────────────── */

export function defaultStyle(overrides: Partial<ChartStyle> = {}): ChartStyle {
  return {
    theme: "clean",
    palette: null,
    accent: null,
    background: null,
    fonts: null,
    size: "landscape",
    width: 1200,
    height: 675,
    fontScale: 1,
    grid: true,
    labels: true,
    legend: "top",
    titleAlign: "left",
    corners: 4,
    number: { ...DEFAULT_NUMBER_FORMAT },
    branding: true,
    ...overrides,
  };
}

export const findTheme = (id: string | null | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const findPalette = (id: string | null | undefined) => PALETTES.find((p) => p.id === id);
export const findFonts = (id: string | null | undefined) => FONT_PAIRINGS.find((f) => f.id === id);

/** Merges theme + user overrides into concrete colors and fonts. */
export function resolveTheme(style: ChartStyle): ResolvedTheme {
  const t = findTheme(style.theme);
  const palette = [...(findPalette(style.palette)?.colors ?? findPalette(t.palette)?.colors ?? PALETTES[0].colors)];
  if (isHexColor(style.accent)) {
    const existing = palette.findIndex((c) => c.toLowerCase() === style.accent!.toLowerCase());
    if (existing > 0) palette.splice(existing, 1);
    if (existing !== 0) palette.unshift(style.accent!);
  }
  const fonts = findFonts(style.fonts) ?? findFonts(t.fonts) ?? FONT_PAIRINGS[0];
  const background =
    style.background === "transparent" ? "transparent" : isHexColor(style.background) ? style.background! : t.background;
  return {
    id: t.id,
    dark: t.dark,
    background,
    surface: t.surface,
    ink: t.ink,
    text: t.text,
    muted: t.muted,
    grid: t.grid,
    axis: t.axis,
    positive: t.positive,
    negative: t.negative,
    palette,
    fontDisplay: fonts.display,
    fontBody: fonts.body,
    fontNumeric: fonts.body,
    displayWeight: fonts.displayWeight,
  };
}

export function widthFactorFor(style: ChartStyle): number {
  const t = findTheme(style.theme);
  return (findFonts(style.fonts) ?? findFonts(t.fonts) ?? FONT_PAIRINGS[0]).widthFactor;
}

/** Families used by a style (for font embedding in exports). */
export function fontFamiliesFor(style: ChartStyle): string[] {
  const t = findTheme(style.theme);
  return (findFonts(style.fonts) ?? findFonts(t.fonts) ?? FONT_PAIRINGS[0]).families;
}
