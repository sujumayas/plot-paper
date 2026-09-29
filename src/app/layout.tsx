import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/shell/Footer";
import { TopNav } from "@/components/shell/TopNav";
import { ToastProvider } from "@/components/ui/Toasts";
import { I18nProvider } from "@/lib/i18n";
import { LOCALE_COOKIE_NAME as LOCALE_COOKIE } from "@/lib/i18n/core";
import type { Locale } from "@/lib/viz/engine";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — beautiful charts from your spreadsheets`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.tagline.en,
  applicationName: siteConfig.name,
  openGraph: {
    title: `${siteConfig.name} — beautiful charts from your spreadsheets`,
    description: siteConfig.tagline.en,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1015" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = fromCookie === "es" || fromCookie === "en" ? fromCookie : siteConfig.defaultLocale;
  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>
          <ToastProvider>
            <TopNav />
            <main id="main">{children}</main>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
