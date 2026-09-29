import type { Metadata } from "next";
import { Footer } from "@/components/shell/Footer";
import { GalleryGrid, type GalleryItem } from "@/components/gallery/GalleryGrid";
import { ServerPoster } from "@/components/gallery/ServerPoster";
import { listCommunityCharts } from "@/lib/community";
import { EXAMPLES } from "@/lib/examples/server";
import { getServerT } from "@/lib/i18n/server";
import { lt } from "@/lib/viz/engine";
import { resolveDefinition } from "@/lib/resolveDef";

export const metadata: Metadata = { title: "Gallery", description: "Real-world charts to learn from and remix." };
export const revalidate = 300;

export default async function ExplorePage() {
  const { locale, t } = await getServerT();
  const community = await listCommunityCharts();
  const items: GalleryItem[] = [
    ...community.map((c) => ({
      id: `g-${c.id}`,
      href: `/explore/g-${c.id}`,
      title: c.doc.title || lt(c.def.name, locale),
      description: c.doc.subtitle,
      chartName: lt(c.def.name, locale),
      category: c.def.category,
      tags: ["community"],
      author: c.author,
      search: `${c.doc.subtitle} ${c.doc.source}`,
      thumb: <ServerPoster doc={c.doc} def={c.def} uid={`g${c.id}`} locale={locale} />,
    })),
    // Examples in the reader's language first.
    ...[...EXAMPLES]
      .sort((a, b) => Number(b.lang === locale) - Number(a.lang === locale))
      .map((e) => {
        const def = resolveDefinition(e.doc.chartType);
        return {
          id: e.id,
          href: `/explore/${e.id}`,
          title: e.doc.title,
          description: e.description,
          chartName: lt(def.name, locale),
          category: def.category,
          tags: e.tags,
          author: e.author,
          search: `${e.doc.subtitle} ${e.doc.source}`,
          thumb: <ServerPoster doc={e.doc} def={def} uid={e.id} locale={locale} />,
        };
      }),
  ];
  return (
    <>
      <div className="container">
        <div className="page-head">
          <div>
            <h1>{t("gallery.title")}</h1>
            <p>{t("gallery.subtitle")}</p>
          </div>
        </div>
        <GalleryGrid items={items} />
      </div>
      <Footer />
    </>
  );
}
