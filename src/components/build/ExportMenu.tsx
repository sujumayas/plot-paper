"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { IconChevron, IconCopy, IconDownload, IconImage, IconJson, IconLink, IconPrinter, IconUpload, IconVector } from "@/components/icons";
import { Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toasts";
import { useI18n } from "@/lib/i18n";
import { shareURL } from "@/lib/share";
import { fileBase } from "@/lib/viz/export/filename";

/** The exporter (incl. react-dom/server) is only downloaded when first used. */
const exporter = () => import("@/lib/viz/export/browser");
const downloadPNG: typeof import("@/lib/viz/export/browser").downloadPNG = async (...a) => (await exporter()).downloadPNG(...a);
const downloadSVG: typeof import("@/lib/viz/export/browser").downloadSVG = async (...a) => (await exporter()).downloadSVG(...a);
const printPDF: typeof import("@/lib/viz/export/browser").printPDF = async (...a) => (await exporter()).printPDF(...a);
const downloadDocJSON = async (...a: Parameters<typeof import("@/lib/viz/export/browser").downloadDocJSON>) => (await exporter()).downloadDocJSON(...a);
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

type Props = {
  doc: ChartDoc;
  def: ChartDefinition;
  onImport: (file: File) => void;
};

export function ExportMenu({ doc, def, onImport }: Props) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Warm the exporter in the background so the first export is instant.
  useEffect(() => {
    const id = setTimeout(() => void exporter(), 1500);
    return () => clearTimeout(id);
  }, []);
  const opts = { locale, credit: siteConfig.credit, scale };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(t("export.failed", { message: err instanceof Error ? err.message : String(err) }), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex" }}>
        <button
          className="btn primary"
          type="button"
          disabled={busy}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() =>
            run(async () => {
              await downloadPNG(doc, def, opts);
              toast(t("export.done", { name: `${fileBase(doc)}@${scale}x.png` }));
            })
          }
          data-testid="export-png"
        >
          <IconDownload /> {busy ? t("export.downloading") : `PNG ${scale}×`}
        </button>
        <Popover
          label={t("export.button")}
          trigger={({ toggle, open }) => (
            <button
              className="btn primary icon"
              type="button"
              aria-expanded={open}
              aria-label={t("export.button")}
              onClick={toggle}
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "1px solid rgb(255 255 255 / .3)" }}
              data-testid="export-menu"
            >
              <IconChevron />
            </button>
          )}
        >
          {(close) => (
            <>
              <div style={{ padding: "6px 10px 8px" }}>
                <div className="label" style={{ marginBottom: 6 }}>{t("export.scale")}</div>
                <div className="seg">
                  {[1, 2, 3, 4].map((s) => (
                    <button key={s} type="button" aria-pressed={scale === s} onClick={() => setScale(s)}>
                      {s}× <span className="hint">{Math.round(doc.style.width * s)}px</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="menu-item" type="button" onClick={() => { close(); run(async () => { await downloadPNG(doc, def, opts); toast(t("export.done", { name: `${fileBase(doc)}.png` })); }); }}>
                <IconImage /> <span><strong>{t("export.png")}</strong><span className="sub">{t("export.pngHint")}</span></span>
              </button>
              <button className="menu-item" type="button" data-testid="export-svg" onClick={() => { close(); run(async () => { await downloadSVG(doc, def, opts); toast(t("export.done", { name: `${fileBase(doc)}.svg` })); }); }}>
                <IconVector /> <span><strong>{t("export.svg")}</strong><span className="sub">{t("export.svgHint")}</span></span>
              </button>
              <button className="menu-item" type="button" onClick={() => { close(); run(async () => { if (!(await printPDF(doc, def, opts))) toast(t("export.popupBlocked"), "error"); }); }}>
                <IconPrinter /> <span><strong>{t("export.pdf")}</strong><span className="sub">{t("export.pdfHint")}</span></span>
              </button>
              <div className="menu-sep" />
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  close();
                  run(async () => {
                    if (await (await exporter()).copyPNG(doc, def, opts)) toast(t("export.copiedImage"));
                    else {
                      await downloadPNG(doc, def, opts);
                      toast(t("export.copyUnsupported"));
                    }
                  });
                }}
              >
                <IconCopy /> {t("export.copyImage")}
              </button>
              <button
                className="menu-item"
                type="button"
                data-testid="copy-link"
                onClick={() => {
                  close();
                  run(async () => {
                    const { url, tooLong } = await shareURL(doc, window.location.origin);
                    if (tooLong) {
                      toast(t("export.linkTooLong"), "error");
                      return;
                    }
                    await navigator.clipboard?.writeText(url).catch(() => undefined);
                    window.history.replaceState(null, "", url.slice(window.location.origin.length));
                    toast(t("export.copiedLink"));
                  });
                }}
              >
                <IconLink /> {t("export.copyLink")}
              </button>
              <div className="menu-sep" />
              <button className="menu-item" type="button" onClick={() => { close(); downloadDocJSON(doc); }}>
                <IconJson /> {t("export.json")}
              </button>
              <button className="menu-item" type="button" onClick={() => { close(); fileRef.current?.click(); }}>
                <IconUpload /> {t("export.importJson")}
              </button>
            </>
          )}
        </Popover>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
