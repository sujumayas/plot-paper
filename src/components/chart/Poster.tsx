"use client";

import { memo, useId, useMemo } from "react";
import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import { renderPoster, type PosterResult } from "@/lib/viz/engine";
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

/** Renders a chart poster (element + issues) localized to the current UI language. */
export function usePoster(doc: ChartDoc, def: ChartDefinition): PosterResult {
  const { locale, t } = useI18n();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return useMemo(
    () =>
      renderPoster(doc, def, {
        locale,
        uid: `p${uid}`,
        credit: siteConfig.credit,
        messages: {
          mapField: (f) => t("builder.issueMapping", { field: f }),
          needRows: (n) => t("builder.issueRows", { n }),
          error: t("builder.issueError", { message: "" }).replace(/[:：]\s*$/, ""),
        },
      }),
    [doc, def, locale, uid, t],
  );
}

/** The full chart poster SVG, scaled to its container width. */
export const Poster = memo(function Poster({ doc, def, className }: { doc: ChartDoc; def: ChartDefinition; className?: string }) {
  const { element } = usePoster(doc, def);
  return <div className={className}>{element}</div>;
});
