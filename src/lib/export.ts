import { downloadBlob, downloadText } from "./download";

/**
 * Replaces CSS variable references inside a serialized SVG string with hex/family values,
 * so the SVG is portable outside the browser DOM. Values mirror the IBK tokens in globals.css.
 */
const CSS_VAR_MAP: Record<string, string> = {
  "var(--bg-page)": "#F4F5F7",
  "var(--bg-card)": "#FFFFFF",
  "var(--bg-card-muted)": "#FBFBFB",
  "var(--fg-1)": "#0F191E",
  "var(--fg-2)": "#333333",
  "var(--fg-3)": "#4A4A4A",
  "var(--fg-4)": "#878C8F",
  "var(--fg-5)": "#9B9B9B",
  "var(--fg-6)": "#B7BABC",
  "var(--line-strong)": "#D9DADB",
  "var(--line)": "#ECEDED",
  "var(--line-soft)": "#F0F0F0",
  "var(--ibk-green)": "#05BE50",
  "var(--ibk-green-dark)": "#00A94F",
  "var(--ibk-green-soft)": "#CDF2DC",
  "var(--ibk-blue)": "#0039A6",
  "var(--ibk-blue-deep)": "#2F4A9F",
  "var(--ibk-blue-sky)": "#64B4E6",
  "var(--red)": "#EB0046",
  "var(--amber)": "#FFB406",
  "var(--orange)": "#F99100",
  "var(--display)": "Geometria, Helvetica, Arial, sans-serif",
  "var(--body)": "Montserrat, Helvetica, Arial, sans-serif",
  "var(--num)": "Inter, ui-monospace, Menlo, monospace",
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
    ctx.fillStyle = "#FFFFFF";
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
      body { margin: 0; padding: 32px; font-family: Helvetica, Arial, sans-serif; background: #FFFFFF; color: #0F191E; }
      h1 { font-family: Helvetica, Arial, sans-serif; font-weight: 500; font-size: 26px; margin: 0 0 4px; letter-spacing: -0.4px; color: #0039A6; }
      .sub { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #878C8F; margin-bottom: 22px; }
      svg { max-width: 100%; height: auto; }
      .foot { margin-top: 20px; font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #878C8F; border-top: 1px solid #ECEDED; padding-top: 10px; }
      .strip { height: 6px; background: #00A94F; margin-top: 18px; }
    </style></head><body>
    <h1>${title || filename}</h1>
    <div class="sub">Plotpaper · ${new Date().toLocaleDateString("es-PE")}</div>
    ${serialized}
    <div class="foot">Exportado desde Plotpaper</div>
    <div class="strip"></div>
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
