import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/shell/Footer";
import { ServerPoster } from "@/components/gallery/ServerPoster";
import { ExampleActions } from "@/components/gallery/ExampleActions";
import { getCommunityChart } from "@/lib/community";
import { EXAMPLES, getExample } from "@/lib/examples/server";
import { getServerT } from "@/lib/i18n/server";
import { lt } from "@/lib/viz/engine";
import { resolveDefinition } from "@/lib/resolveDef";

type Params = Promise<{ id: string }>;

async function load(id: string) {
  if (id.startsWith("g-")) {
    const c = await getCommunityChart(id.slice(2));
    return c ? { doc: c.doc, def: c.def, description: c.doc.subtitle, author: c.author, sourceUrl: "", tags: [] as string[], exampleId: null as string | null } : null;
  }
  const e = getExample(id);
  if (!e) return null;
  return { doc: e.doc, def: resolveDefinition(e.doc.chartType), description: e.description, author: e.author, sourceUrl: e.sourceUrl, tags: e.tags, exampleId: e.id };
}

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const item = await load(id);
  if (!item) return { title: "Not found" };
  return { title: item.doc.title, description: item.description || item.doc.subtitle };
}

export default async function ExampleDetail({ params }: { params: Params }) {
  const { id } = await params;
  const item = await load(id);
  if (!item) notFound();
  const { locale, t } = await getServerT();
  const { doc, def } = item;
  return (
    <>
      <div className="container" style={{ paddingTop: 28 }}>
        <p className="hint" style={{ marginBottom: 14 }}>
          <Link href="/explore">← {t("gallery.title")}</Link>
        </p>
        <div className="card detail">
          <div className="detail-stage">
            <ServerPoster doc={doc} def={def} uid={`d${id}`} locale={locale} />
          </div>
          <div className="detail-side">
            <span className="badge">{lt(def.name, locale)}</span>
            <h2>{doc.title}</h2>
            {item.description && <p className="hint" style={{ fontSize: 14 }}>{item.description}</p>}
            <p className="hint">{t("gallery.by", { author: item.author })}</p>
            {doc.source && (
              <p className="hint">
                {t("gallery.source")}:{" "}
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {doc.source}
                  </a>
                ) : (
                  doc.source
                )}
              </p>
            )}
            {item.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.tags.map((tag) => (
                  <span key={tag} className="badge gray">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <ExampleActions doc={doc} exampleId={item.exampleId} spec={null} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
