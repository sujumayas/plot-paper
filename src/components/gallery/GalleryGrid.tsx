"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { ChartCategory } from "@/lib/viz/types";

export type GalleryItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  chartName: string;
  category: ChartCategory;
  tags: string[];
  author: string;
  /** Extra searchable text (subtitle, source…). */
  search?: string;
  thumb: ReactNode;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const { t } = useI18n();
  const [cat, setCat] = useState<ChartCategory | "all">("all");
  const [q, setQ] = useState("");
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const query = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (cat === "all" || i.category === cat) &&
      (!query || [i.title, i.description, i.chartName, i.author, i.search ?? "", ...i.tags].some((s) => s.toLowerCase().includes(query))),
  );
  return (
    <>
      <div className="filters" role="toolbar">
        <button className="chip" type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          {t("gallery.all")}
        </button>
        {cats.map((c) => (
          <button key={c} className="chip" type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {t(`categories.${c}`)}
          </button>
        ))}
        <input className="input search" type="search" placeholder={t("gallery.search")} aria-label={t("gallery.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>{t("gallery.results", { n: shown.length })}</p>
      {shown.length === 0 ? (
        <p className="hint" style={{ padding: "60px 0", textAlign: "center" }}>{t("gallery.empty")}</p>
      ) : (
        <div className="gallery-grid">
          {shown.map((i) => (
            <Link key={i.id} href={i.href as never} className="gcard" data-example={i.id}>
              <div className="thumb">{i.thumb}</div>
              <div className="meta">
                <h3>{i.title}</h3>
                <p className="desc">{i.description}</p>
                <div className="row">
                  <span className="badge gray">{i.chartName}</span>
                  <span>{t("gallery.by", { author: i.author })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
