"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t, locale } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container cols">
        <div>
          <div className="brand" style={{ fontSize: 16, marginBottom: 8 }}>
            {siteConfig.name}
          </div>
          <p style={{ maxWidth: 360 }}>{siteConfig.tagline[locale]}</p>
          <p style={{ marginTop: 12, color: "var(--faint)" }}>
            © {new Date().getFullYear()} · {t("footer.made")}
          </p>
        </div>
        <div>
          <h4>{t("footer.product")}</h4>
          <ul>
            <li><Link href="/build">{t("nav.create")}</Link></li>
            <li><Link href="/explore">{t("nav.gallery")}</Link></li>
            <li><Link href="/studio">{t("nav.studio")}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{t("footer.resources")}</h4>
          <ul>
            <li><Link href="/guide">{t("footer.guide")}</Link></li>
            <li><Link href={"/guide/plotspec" as never}>{t("footer.plotspec")}</Link></li>
            {siteConfig.links.github && (
              <li><a href={siteConfig.links.github} rel="noopener noreferrer" target="_blank">GitHub</a></li>
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}
