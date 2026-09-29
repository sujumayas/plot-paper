"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconPlus } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { autoMap, mappingIssues } from "@/lib/viz/data";
import { CHART_CATEGORIES, type ChartDefinition, type ColumnInfo } from "@/lib/viz/types";

type Props = {
  charts: ChartDefinition[];
  selected: string;
  columns: ColumnInfo[];
  onSelect: (def: ChartDefinition) => void;
};

export function ChartPicker({ charts, selected, columns, onSelect }: Props) {
  const { t, l } = useI18n();
  const [q, setQ] = useState("");
  const fits = useMemo(() => {
    const set = new Set<string>();
    if (!columns.length) return set;
    for (const def of charts) if (!mappingIssues(def, autoMap(def, columns), columns).length) set.add(def.id);
    return set;
  }, [charts, columns]);

  const query = q.trim().toLowerCase();
  const match = (d: ChartDefinition) =>
    !query ||
    [l(d.name), l(d.description), d.id, ...(d.keywords ?? [])].some((s) => s.toLowerCase().includes(query));
  const custom = charts.filter((d) => d.isCustom && match(d));
  const builtin = charts.filter((d) => !d.isCustom && match(d));

  const button = (d: ChartDefinition) => (
    <button
      key={d.id}
      type="button"
      className="type-btn"
      aria-pressed={d.id === selected}
      onClick={() => onSelect(d)}
      title={l(d.description)}
      data-chart={d.id}
    >
      <span className="g">
        <svg viewBox="0 0 22 22" width="20" height="20">
          {d.glyph}
        </svg>
      </span>
      <span>{l(d.name)}</span>
      {fits.has(d.id) && <span className="fit" title={t("builder.fitsData")} />}
    </button>
  );

  return (
    <nav className="picker" aria-label={t("builder.chartTypes")}>
      <input className="input sm search" type="search" placeholder={t("builder.searchCharts")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("builder.searchCharts")} />
      {custom.length > 0 && (
        <div className="cat">
          <h4>{t("builder.yourTypes")}</h4>
          {custom.map(button)}
        </div>
      )}
      {CHART_CATEGORIES.filter((c) => c !== "custom").map((cat) => {
        const items = builtin.filter((d) => d.category === cat);
        if (!items.length) return null;
        return (
          <div className="cat" key={cat}>
            <h4>{t(`categories.${cat}`)}</h4>
            {items.map(button)}
          </div>
        );
      })}
      {!custom.length && !builtin.length && <p className="hint" style={{ padding: "8px" }}>{t("builder.noMatches", { q })}</p>}
      <div className="cat">
        <h4>{t("categories.custom")}</h4>
        <Link href="/studio" className="type-btn" style={{ textDecoration: "none" }}>
          <span className="g">
            <IconPlus />
          </span>
          <span>{t("builder.newFromStudio")}</span>
        </Link>
      </div>
    </nav>
  );
}
