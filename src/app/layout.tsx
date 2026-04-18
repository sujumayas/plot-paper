import type { Metadata } from "next";
import { instrumentSerif, interTight, jetbrainsMono } from "@/lib/fonts";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plotpaper — a data visualization playground",
  description:
    "Pick a chart type, drop a CSV, publish. Explore graphs other people have made.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
      style={
        {
          ["--font-serif-var" as string]: instrumentSerif.style.fontFamily,
          ["--font-sans-var" as string]: interTight.style.fontFamily,
          ["--font-mono-var" as string]: jetbrainsMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body>
        <div className="app-frame">
          <TopBar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
