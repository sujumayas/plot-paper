"use client";

import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { IconArrowRight, IconDownload, IconVector } from "@/components/icons";
import { useToast } from "@/components/ui/Toasts";
import { useI18n } from "@/lib/i18n";
import { resolveDefinition } from "@/lib/resolveDef";
import { KEYS, writeJSON } from "@/lib/storage";
const exporter = () => import("@/lib/viz/export/browser");
import type { ChartDoc } from "@/lib/viz/types";

export function ExampleActions({ doc, exampleId, spec }: { doc: ChartDoc; exampleId: string | null; spec: unknown }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const def = resolveDefinition(doc.chartType, spec);
  const opts = { locale, credit: siteConfig.credit, scale: 2 };
  const fail = (err: unknown) => toast(t("export.failed", { message: err instanceof Error ? err.message : String(err) }), "error");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      <button
        className="btn primary block"
        type="button"
        onClick={() => {
          if (exampleId) router.push(`/build?example=${encodeURIComponent(exampleId)}` as never);
          else {
            writeJSON(KEYS.doc, doc);
            router.push("/build" as never);
          }
        }}
      >
        {t("gallery.remix")} <IconArrowRight />
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button className="btn" type="button" onClick={() => exporter().then((m) => m.downloadPNG(doc, def, opts)).catch(fail)}>
          <IconDownload /> PNG
        </button>
        <button className="btn" type="button" onClick={() => exporter().then((m) => m.downloadSVG(doc, def, opts)).catch(fail)}>
          <IconVector /> SVG
        </button>
      </div>
    </div>
  );
}
