import { siteConfig } from "@/config/site";
import { renderPoster, type Locale } from "@/lib/viz/engine";
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

/** Server-rendered chart poster (no client JS). */
export function ServerPoster({ doc, def, uid, locale }: { doc: ChartDoc; def: ChartDefinition; uid: string; locale: Locale }) {
  return renderPoster(doc, def, { uid: uid.replace(/[^a-zA-Z0-9]/g, ""), locale, credit: siteConfig.credit }).element;
}
