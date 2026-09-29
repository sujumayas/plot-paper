import Link from "next/link";
import { Footer } from "@/components/shell/Footer";
import { GUIDES, renderGuide, type GuideSlug } from "@/lib/docs";

export async function GuidePage({ slug }: { slug: GuideSlug }) {
  const { html } = await renderGuide(slug);
  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <nav className="filters" aria-label="Guide">
          {Object.entries(GUIDES).map(([s, g]) => (
            <Link key={s} className="chip" aria-current={s === slug ? "page" : undefined} href={(s ? `/guide/${s}` : "/guide") as never} style={{ textDecoration: "none" }}>
              {g.title}
            </Link>
          ))}
        </nav>
      </div>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <Footer />
    </>
  );
}
