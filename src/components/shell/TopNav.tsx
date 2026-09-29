"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { LogoMark } from "@/components/icons";
import { UserMenu } from "@/components/auth/UserMenu";
import { LOCALES, useI18n } from "@/lib/i18n";

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const links = [
    { href: "/explore", label: t("nav.gallery"), match: (p: string) => p.startsWith("/explore") },
    { href: "/build", label: t("nav.create"), match: (p: string) => p.startsWith("/build") },
    { href: "/studio", label: t("nav.studio"), match: (p: string) => p.startsWith("/studio") },
    { href: "/guide", label: t("nav.guide"), match: (p: string) => p.startsWith("/guide"), hideSm: true },
  ];
  return (
    <header className="topnav">
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      <Link href="/" className="brand" aria-label={`${siteConfig.name} — ${t("nav.home")}`}>
        <span style={{ color: "var(--ink)", display: "inline-flex" }}>
          <LogoMark />
        </span>
        <span>{siteConfig.name}</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href as never} className={l.hideSm ? "hide-sm" : undefined} aria-current={l.match(pathname) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="nav-right">
        <div className="lang-toggle" role="group" aria-label={t("nav.language")}>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={locale === l}
              onClick={() => {
                if (l === locale) return;
                setLocale(l);
                // Server-rendered pages (gallery, guide) need a fresh render in the new language.
                router.refresh();
                window.location.reload();
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
