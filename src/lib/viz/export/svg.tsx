import { renderToStaticMarkup } from "react-dom/server";
import { renderPoster, type Locale } from "../engine";
import { FONT_FACES, fontFamiliesFor } from "../themes";
import type { ChartDefinition, ChartDoc } from "../types";

/** Loads a font file and returns it base64-encoded. */
export type FontLoader = (url: string) => Promise<string | null>;

const fontCache = new Map<string, Promise<string | null>>();

/** @font-face rules with inlined data: URLs for the families a doc uses. */
export async function embeddedFontCSS(doc: ChartDoc, load: FontLoader): Promise<string> {
  const families = fontFamiliesFor(doc.style);
  const faces = FONT_FACES.filter((f) => families.includes(f.family));
  const rules = await Promise.all(
    faces.map(async (f) => {
      let p = fontCache.get(f.url);
      if (!p) {
        p = load(f.url).catch(() => null);
        fontCache.set(f.url, p);
      }
      const b64 = await p;
      if (!b64) return "";
      return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    }),
  );
  return rules.join("");
}

export type SvgExportOptions = {
  locale?: Locale;
  fontCSS?: string;
  credit?: string;
};

/** Serializes the full poster to a standalone SVG string. */
export function posterSVG(doc: ChartDoc, def: ChartDefinition, opts: SvgExportOptions = {}): string {
  const { element } = renderPoster(doc, def, {
    locale: opts.locale,
    uid: "x",
    credit: opts.credit,
    defs: opts.fontCSS ? <style>{opts.fontCSS}</style> : undefined,
  });
  const markup = renderToStaticMarkup(element);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + markup;
}

/** Browser font loader (fetches from /fonts). */
export const browserFontLoader: FontLoader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  return btoa(bin);
};
