import type { Metadata } from "next";
import { inter, montserrat } from "@/lib/fonts";
import { FooterIBK } from "@/components/shell/FooterIBK";
import { SideNav } from "@/components/shell/SideNav";
import { TopBar } from "@/components/shell/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plotpaper · Visualiza tus datos",
  description:
    "Elige un tipo de gráfico, arrastra tu CSV y publica en la galería. Explora gráficos creados por otros.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable}`}
      style={
        {
          ["--font-body-var" as string]: montserrat.style.fontFamily,
          ["--font-num-var" as string]: inter.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body>
        <div className="app-shell">
          <SideNav />
          <div className="app-body">
            <TopBar />
            <main className="page-shell">{children}</main>
            <FooterIBK />
          </div>
        </div>
      </body>
    </html>
  );
}
