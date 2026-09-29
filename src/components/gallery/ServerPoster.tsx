import { siteConfig } from "@/config/site";
import { renderPoster, type Locale } from "@/lib/viz/engine";
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

/** Server-rendered chart poster (no client JS). A chart that fails to render never takes the page down. */
export function ServerPoster({ doc, def, uid, locale }: { doc: ChartDoc; def: ChartDefinition; uid: string; locale: Locale }) {
  try {
    return renderPoster(doc, def, { uid: uid.replace(/[^a-zA-Z0-9]/g, ""), locale, credit: siteConfig.credit }).element;
  } catch {
    const { width, height } = doc.style;
    return <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={doc.title} style={{ background: "#f4f5f7" }} />;
  }
}
