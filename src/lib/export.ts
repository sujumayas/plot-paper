import { downloadBlob, downloadText } from "./download";

/**
 * Replaces CSS variable references inside a serialized SVG string with hex/family values,
 * so the SVG is portable outside the browser DOM. Values mirror the tokens in globals.css.
 */
const CSS_VAR_MAP: Record<string, string> = {
  "var(--paper)": "#f4efe6",
  "var(--paper-2)": "#ece6d9",
  "var(--ink)": "#1a1915",
  "var(--ink-2)": "#3a372f",
  "var(--ink-3)": "#6b665a",
  "var(--ink-4)": "#9a9486",
  "var(--rule)": "#cbc4b0",
  "var(--rule-soft)": "#ddd5c2",
  "var(--danger)": "#c24a34",
  "var(--mono)": "ui-monospace, Menlo, monospace",
  "var(--sans)": "Helvetica, Arial, sans-serif",
  "var(--serif)": "Georgia, serif",
};

function serializeWithInlinedVars(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  let s = new XMLSerializer().serializeToString(clone);
  for (const [k, v] of Object.entries(CSS_VAR_MAP)) {
    s = s.split(k).join(v);
  }
  return s;
}

export function exportSVG(svgEl: SVGSVGElement, filename: string) {
  let s = serializeWithInlinedVars(svgEl);
  if (!s.startsWith("<?xml")) s = '<?xml version="1.0" encoding="UTF-8"?>\n' + s;
  downloadText(s, filename, "image/svg+xml");
}

export function exportPNG(svgEl: SVGSVGElement, filename: string, scale = 2) {
  const serialized = serializeWithInlinedVars(svgEl);
  const vb = svgEl.viewBox.baseVal;
  const w = (vb && vb.width) || svgEl.clientWidth || 800;
  const h = (vb && vb.height) || svgEl.clientHeight || 500;
  const img = new Image();
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (b) downloadBlob(b, filename);
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = url;
}

export function exportPDF(svgEl: SVGSVGElement, filename: string, title: string) {
  const serialized = serializeWithInlinedVars(svgEl);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title || filename}</title>
    <style>
      @page { size: A4 landscape; margin: 20mm; }
      body { margin: 0; padding: 32px; font-family: Helvetica, Arial, sans-serif; background: #f4efe6; color: #1a1915; }
      h1 { font-family: Georgia, serif; font-weight: 400; font-size: 32px; margin: 0 0 6px; letter-spacing: -0.01em; }
      .sub { font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b665a; margin-bottom: 24px; }
      svg { max-width: 100%; height: auto; }
      .foot { margin-top: 20px; font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6b665a; letter-spacing: 0.08em; text-transform: uppercase; border-top: 1px solid #cbc4b0; padding-top: 10px; }
    </style></head><body>
    <h1>${title || filename}</h1>
    <div class="sub">Plotpaper · ${new Date().toLocaleDateString()}</div>
    ${serialized}
    <div class="foot">Exported from Plotpaper</div>
    <script>setTimeout(() => { window.print(); }, 350);</script>
    </body></html>`);
  w.document.close();
}

export function exportJSON(
  filename: string,
  payload: Record<string, unknown>,
) {
  downloadText(JSON.stringify(payload, null, 2), filename, "application/json");
}
