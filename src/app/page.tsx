import Link from "next/link";
import { Footer } from "@/components/shell/Footer";
import { ServerPoster } from "@/components/gallery/ServerPoster";
import { IconCode, IconImage, IconLayout, IconShield, IconSparkle, IconType } from "@/components/icons";
import { getExample } from "@/lib/examples/server";
import { getServerT } from "@/lib/i18n/server";
import { resolveDefinition } from "@/lib/resolveDef";
import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { lt } from "@/lib/viz/engine";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import { THEMES } from "@/lib/viz/themes";

const HERO = "co2-mauna-loa";
const MINIS = ["world-electricity-mix", "saas-monthly-kpis"];
const SHOWCASE = ["wealth-and-health", "electricity-mix-by-country", "co2-emitters-treemap", "saas-arr-bridge", "inflacion-lima", "imdb-rating-by-genre"];

function Chart({ id, locale }: { id: string; locale: "en" | "es" }) {
  const ex = getExample(id);
  if (!ex) return null;
  return <ServerPoster doc={ex.doc} def={resolveDefinition(ex.doc.chartType)} uid={`h${id}`} locale={locale} />;
}

export default async function Home() {
  const { locale, t } = await getServerT();
  const bullet = SPEC_TEMPLATES.find((s) => s.id === "bullet")!.spec;
  const specPreview = JSON.stringify({ ...bullet, sample: { ...bullet.sample, rows: bullet.sample.rows.slice(0, 2) } }, null, 2);
  const features = [
    { icon: <IconLayout />, title: t("landing.f1Title"), body: t("landing.f1Body") },
    { icon: <IconImage />, title: t("landing.f2Title"), body: t("landing.f2Body") },
    { icon: <IconType />, title: t("landing.f3Title"), body: t("landing.f3Body") },
    { icon: <IconSparkle />, title: t("landing.f4Title"), body: t("landing.f4Body") },
    { icon: <IconShield />, title: t("landing.f5Title"), body: t("landing.f5Body") },
    { icon: <IconCode />, title: t("landing.f6Title"), body: t("landing.f6Body") },
  ];
  return (
    <>
      <div className="container">
        <section className="hero">
          <span className="eyebrow">✦ {t("landing.eyebrow")}</span>
          <h1>
            {t("landing.title")} <em>{t("landing.titleEm")}</em>
          </h1>
          <p className="lead">{t("landing.subtitle", { n: BUILTIN_CHARTS.length })}</p>
          <div className="ctas">
            <Link className="btn primary lg" href="/build" data-testid="cta-create">
              {t("landing.ctaCreate")}
            </Link>
            <Link className="btn lg" href="/explore">
              {t("landing.ctaGallery")}
            </Link>
          </div>
          <p className="trust">{t("landing.trust")}</p>
          <div className="hero-stage">
            <div className="frame">
              <Chart id={HERO} locale={locale} />
            </div>
            <div className="hero-mini" style={{ left: "-4%", bottom: "-8%", width: "26%" }}>
              <Chart id={MINIS[0]} locale={locale} />
            </div>
            <div className="hero-mini" style={{ right: "-4%", bottom: "-10%", width: "28%" }}>
              <Chart id={MINIS[1]} locale={locale} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>{t("landing.stepsTitle")}</h2>
          </div>
          <div className="steps">
            {[
              [t("landing.step1Title"), t("landing.step1Body")],
              [t("landing.step2Title"), t("landing.step2Body", { charts: BUILTIN_CHARTS.length, themes: THEMES.length })],
              [t("landing.step3Title"), t("landing.step3Body")],
            ].map(([h, p], i) => (
              <div className="card step" key={i}>
                <div className="num">{i + 1}</div>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="type-strip">
            {BUILTIN_CHARTS.map((c) => (
              <Link key={c.id} href={`/build?type=${c.id}` as never} className="type-tile">
                <svg viewBox="0 0 22 22">{c.glyph}</svg>
                {lt(c.name, locale)}
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>{t("landing.featuresTitle")}</h2>
          </div>
          <div className="features">
            {features.map((f) => (
              <div className="card feature" key={f.title}>
                <div className="ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>{t("landing.galleryTitle")}</h2>
            <p>{t("landing.galleryBody")}</p>
          </div>
          <div className="gallery-grid">
            {SHOWCASE.map((id) => {
              const ex = getExample(id);
              if (!ex) return null;
              return (
                <Link key={id} href={`/explore/${id}` as never} className="gcard">
                  <div className="thumb">
                    <Chart id={id} locale={locale} />
                  </div>
                  <div className="meta">
                    <h3>{ex.doc.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
          <p style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/explore">{t("landing.seeAll")}</Link>
          </p>
        </section>

        <section className="section">
          <div className="card creator">
            <div>
              <span className="badge">PlotSpec · AI</span>
              <h2 style={{ fontSize: 32, margin: "12px 0" }}>{t("landing.creatorTitle")}</h2>
              <p style={{ color: "var(--muted)", fontSize: 15.5 }}>{t("landing.creatorBody")}</p>
              <Link className="btn dark" href="/studio" style={{ marginTop: 20 }}>
                {t("landing.creatorCta")}
              </Link>
            </div>
            <pre aria-label="PlotSpec example">{specPreview}</pre>
          </div>
        </section>

        <section className="final-cta">
          <h2>{t("landing.finalTitle")}</h2>
          <Link className="btn primary lg" href="/build">
            {t("landing.finalCta")}
          </Link>
        </section>
      </div>
      <Footer />
    </>
  );
}
