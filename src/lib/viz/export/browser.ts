"use client";

import { downloadBlob, downloadText } from "@/lib/download";
import type { Locale } from "../engine";
import type { ChartDefinition, ChartDoc } from "../types";
import { fileBase } from "./filename";
import { browserFontLoader, embeddedFontCSS, posterSVG } from "./svg";

export { fileBase };

export type ExportOptions = {
  locale?: Locale;
  credit?: string;
  /** Pixel density multiplier for PNG (1–4). */
  scale?: number;
};

/** Standalone SVG string with fonts embedded (renders identically anywhere). */
export async function buildSVG(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}): Promise<string> {
  const fontCSS = await embeddedFontCSS(doc, browserFontLoader);
  return posterSVG(doc, def, { locale: opts.locale, credit: opts.credit, fontCSS });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The chart image could not be rendered"));
    img.src = url;
  });
}

export const MAX_PIXELS = 36_000_000; // ~6000×6000, safely below browser canvas limits

/** Renders the chart to a PNG blob at `scale`× resolution. */
export async function buildPNG(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}): Promise<Blob> {
  const svg = await buildSVG(doc, def, opts);
  const { width, height } = doc.style;
  let scale = Math.min(4, Math.max(1, opts.scale ?? 2));
  while (width * height * scale * scale > MAX_PIXELS && scale > 1) scale -= 0.5;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    if ("decode" in img) await img.decode().catch(() => undefined);
    // Give Safari a tick to apply embedded @font-face rules.
    await new Promise((r) => setTimeout(r, 30));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPNG(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}) {
  const blob = await buildPNG(doc, def, opts);
  const scale = opts.scale ?? 2;
  downloadBlob(blob, `${fileBase(doc)}${scale > 1 ? `@${scale}x` : ""}.png`);
}

export async function downloadSVG(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}) {
  downloadText(await buildSVG(doc, def, opts), `${fileBase(doc)}.svg`, "image/svg+xml");
}

/** Copies the PNG to the clipboard. Returns false when the browser can't. */
export async function copyPNG(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
  try {
    // Passing a promise keeps the user-activation window in Safari.
    await navigator.clipboard.write([new ClipboardItem({ "image/png": buildPNG(doc, def, opts) })]);
    return true;
  } catch {
    return false;
  }
}

/** Opens a print-ready page sized to the chart; the user saves it as PDF. */
export async function printPDF(doc: ChartDoc, def: ChartDefinition, opts: ExportOptions = {}): Promise<boolean> {
  const svg = (await buildSVG(doc, def, opts)).replace(/^<\?xml[^>]*>\s*/, "");
  const w = window.open("", "_blank");
  if (!w) return false;
  const { width, height } = doc.style;
  const title = (doc.title || "Chart").replace(/[<>&]/g, "");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: ${width}px ${height}px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  svg { display: block; width: 100vw; height: auto; }
</style></head><body>${svg}
<script>window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 250); });</script>
</body></html>`);
  w.document.close();
  return true;
}

export function downloadDocJSON(doc: ChartDoc) {
  downloadText(JSON.stringify({ plotpaper: 1, ...doc }, null, 2), `${fileBase(doc)}.plotpaper.json`, "application/json");
}
