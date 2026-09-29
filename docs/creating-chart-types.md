# Creating chart types

There are two ways to add a chart type to Plotpaper:

| | **PlotSpec (Studio)** | **TypeScript plugin** |
|---|---|---|
| Who | Anyone, in the browser | Developers, in this repo |
| How | JSON grammar, or ask Claude | A `ChartDefinition` module |
| Power | Layers of standard marks | Anything SVG can draw |
| Ships to | Your browser (or the gallery) | Every user of your deployment |

## With the Studio (no code)

1. Open **Studio**.
2. Start from a template, write a spec (see the [PlotSpec reference](plotspec.md)), or describe the chart in the **Create with AI** box — e.g. *"bullet chart comparing each region to its target with a grey range behind"*. Attach a screenshot of a chart you like for extra guidance.
3. Tweak the JSON. The preview updates live and the validation panel explains any problem.
4. To iterate with AI, tick **Refine current spec** and ask for changes ("make the bars rounded and add value labels").
5. **Save to my types**. The type appears under **Your types** in the editor's chart picker; **Use in editor** opens it with its sample data.

Specs can be downloaded and imported as `.plotspec.json` files, so you can share them with your team or commit them to a repo.

## As a TypeScript plugin

Every built-in chart is a small module in `src/lib/viz/charts/`. A chart is a `ChartDefinition`:

```tsx
import type { ChartDefinition } from "../types";
import { band, linear } from "../scale";
import { Bar, YAxis, CategoryLabels, fs, layoutCategoryLabels, tickLabelWidth } from "../parts";

export const myChart: ChartDefinition = {
  id: "my-chart",                       // unique, stable (stored in saved charts)
  name: { en: "My chart", es: "Mi gráfico" },
  description: { en: "What it's good for", es: "Para qué sirve" },
  category: "comparison",
  glyph: <rect x="3" y="3" width="16" height="16" rx="3" fill="currentColor" />, // 22×22 icon
  fields: [
    { key: "label", label: "Labels", type: "string" },
    { key: "value", label: "Values", type: "number" },
  ],
  options: [
    { key: "highlight", label: "Highlight max", type: "boolean", default: false },
  ],
  sample: {
    title: "A headline that states the takeaway",
    source: "Where the sample comes from",
    rows: [{ label: "A", value: 3 }, { label: "B", value: 5 }],
  },
  render: (c) => {
    // c.width × c.height is the plot area (title, legend and footer are handled for you).
    // c.u is the typography unit — multiply every size by it so charts scale with the export size.
    const rows = c.rows.map((r) => ({ label: c.str(r, "label"), value: c.num(r, "value") ?? 0 }));
    let y = linear(rows.map((r) => r.value), [c.height, 0]);
    const left = tickLabelWidth(c, y) + 14 * c.u;
    const x = band(rows.map((r) => r.label), [left, c.width]);
    const layout = layoutCategoryLabels(c, rows.map((r) => r.label), x.step);
    y = linear(rows.map((r) => r.value), [c.height - layout.height, 0]);
    return (
      <g>
        <YAxis c={c} scale={y} x0={left} x1={c.width} />
        {rows.map((r, i) => (
          <Bar key={i} x={x(r.label)} y={y(r.value)} width={x.bandwidth} height={y(0) - y(r.value)} radius={c.corners} fill={c.color(0)} />
        ))}
        <CategoryLabels c={c} labels={rows.map((r) => r.label)} xFor={(i) => x.center(rows[i].label)} y={c.height - layout.height} layout={layout} />
      </g>
    );
  },
};
```

Then register it in `src/lib/viz/charts/index.ts` (the array order is the picker order) and run:

```bash
npm run render:gallery -- --only my-chart   # renders .render/my-chart.png with its sample
npm test                                    # the chart is automatically included in the robustness suite
```

### The render context

| Member | Use |
|---|---|
| `rows` | Data rows (blank rows removed). |
| `col(key)`, `cols(key)` | Column(s) mapped to a field. |
| `num(row, key)`, `str(row, key)` | Parsed value of a field for a row (`num` → `number \| null`). |
| `width`, `height`, `u` | Plot area and typography unit. |
| `theme` | Resolved colors (`ink`, `text`, `muted`, `grid`, `axis`, `positive`, `negative`, `background`, `surface`) and fonts. |
| `color(i)` | i-th palette color (respects the user's main color). |
| `opt(key, fallback)` | Option value. |
| `fmt(n)`, `fmtTick(n, step)` | Numbers in the user's format. |
| `grid`, `labels`, `corners` | User style toggles. |
| `uid` | Prefix for SVG ids (gradients, clip paths). |
| `words` | Localized words charts print themselves ("Other", "Total"…). |

Helpers in `src/lib/viz/parts.tsx` (`YAxis`, `XAxis`, `CategoryLabels`, `Bar`, `HaloText`, `EmptyState`, `linePath`, `arcPath`), `scale.ts` (`linear`, `band`, `logScale`, color mixing) and `text.ts` (`textWidth`, `truncate`, `wrapText`) cover most needs. `charts/common.ts` has shared options (sort, highlight, aggregate, max items) and `categoryItems()` for grouping + top-N.

### Rules of thumb

- Never throw on bad data — return `<EmptyState c={c} message={c.words.noData} />`. The robustness tests feed every chart empty, negative, huge, unicode and 10k-row data.
- Use `c.u` for every size and `c.theme` for every color — no hardcoded hex values.
- Measure text with `textWidth` and `truncate` long labels.
- Provide a `legend()` when color encodes something that isn't labelled directly.
- Keep the sample real (or clearly illustrative) with a source — it's the first thing users see.
