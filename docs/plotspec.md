# PlotSpec reference

PlotSpec is Plotpaper's grammar for **custom chart types**. A spec is plain JSON — it is interpreted, never executed — so specs written by people or by AI are safe to share, store and render.

A spec describes a *type* of chart (its data contract and its marks), not one particular chart. Once saved in the Studio it behaves like any built-in type: it appears in the picker, maps columns, follows the selected theme, palette, fonts and size, and exports to PNG/SVG/PDF.

## Shape

```json
{
  "version": 1,
  "name": "Bullet chart",
  "description": "Actual vs target, with a qualitative range behind each bar",
  "category": "comparison",
  "fields": [
    { "key": "label", "label": "Metric", "type": "string" },
    { "key": "value", "label": "Actual", "type": "number" },
    { "key": "target", "label": "Target", "type": "number" }
  ],
  "sample": {
    "title": "Sales reps vs quota",
    "subtitle": "Closed revenue, $K",
    "rows": [{ "label": "Ana", "value": 262, "target": 240 }]
  },
  "y": { "type": "band" },
  "layers": [
    { "mark": "bar", "encoding": { "y": { "field": "label" }, "x": { "field": "value" } } },
    { "mark": "tick", "encoding": { "y": { "field": "label" }, "x": { "field": "target" } }, "style": { "stroke": "ink" } }
  ]
}
```

| Property | Meaning |
|---|---|
| `name`, `description` | Shown in the chart picker (≤ 40 / 160 characters). |
| `category` | `comparison`, `trend`, `composition`, `relationship`, `distribution`, `headline`, `planning` or `custom`. |
| `fields` | The data contract (max 12). Users map their columns to these. |
| `sample` | `title`, optional `subtitle`/`source`, and `rows` (1–500) used for previews and "Sample data". |
| `coord` | `"cartesian"` (default) or `"polar"` (for `arc` layers). |
| `x`, `y` | Axis settings (below). |
| `layers` | Marks drawn in order (max 12). |
| `legend` | `false` hides the automatic legend. |

### Fields

```json
{ "key": "sales", "label": "Sales", "type": "number", "required": true, "multiple": false }
```

- `type`: `"string"`, `"number"` or `"any"` (dates, years…).
- `required: false` makes a field optional.
- `multiple: true` accepts several numeric columns (one per series). Use it with a layer's `fold`.

### Axes

| Key | Values |
|---|---|
| `type` | `band` (categories, bars), `point` (categories, lines), `linear`, `log`, `time`. Inferred when omitted. |
| `title` | Axis title. |
| `zero` | Force the axis to include 0 (default: true for bars/areas). |
| `grid` | Show gridlines. |
| `hidden` | Hide the axis. |
| `format` | `value` (the user's number format), `percent` (0.25 → 25%), `raw`. |
| `padding` | Band padding 0–0.9. |
| `sort` | `data`, `asc`, `desc`, `value-asc`, `value-desc` (band/point axes). |

## Layers

```json
{
  "mark": "line",
  "encoding": { "x": { "field": "month" }, "y": { "field": "avg" } },
  "style": { "stroke": "accent", "strokeWidth": 3, "curve": "smooth" },
  "stack": false,
  "fold": "series",
  "order": "x",
  "filter": { "field": "change", "op": ">=", "value": 0 }
}
```

### Marks

| Mark | Needs | Notes |
|---|---|---|
| `bar` | `x`, `y` | One axis categorical, the other numeric. `x2`/`y2` set the base. A string `color` field without `stack` makes grouped bars. |
| `rect` | `x`, `y` | With band axes fills the whole cell (heatmaps). `x2`/`y2` for spans. |
| `line` | `x`, `y` | One line per `color` category. Sorted by x unless `order: "data"`. |
| `area` | `x`, `y` | Base is `y2` or 0. `stack: true` stacks by color. |
| `point` | `x`, `y` | `size` channel scales the radius (area-true). |
| `rule` | `x` or `y` | `x` only → vertical line, `y` only → horizontal, both + `x2`/`y2` → segment. Use `{ "value": 0 }` for a zero line. |
| `text` | `x`, `y`, `text` | Direct labels. Style with `anchor`, `dx`, `dy`, `fontSize`, `format`. |
| `tick` | `x`, `y` | A short line across a band — targets, medians. |
| `arc` | `theta` | Pie/ring slices. `color` = category, `style.innerRadius` 0–0.95. |

### Channels

`x`, `x2`, `y`, `y2`, `color`, `size`, `text`, `opacity`, `theta`.

Each channel is either `{ "field": "<field key>" }` or `{ "value": <number | text> }`, optionally with `"aggregate": "sum" | "mean" | "count" | "min" | "max"` (the other field channels become the group-by keys).

Special fields: `$index` (row number); after `"fold": "<multiple field>"`, `$series` (column name) and `$value` (its number).

`color` with a text field uses the palette; with a number field it uses a light→accent gradient; with a `value` it's a color reference.

### Styles & colors

Color references keep custom types on-theme: `accent`, `palette:0`…`palette:7`, `ink`, `text`, `muted`, `grid`, `axis`, `positive`, `negative`, `background`, or a hex color like `#1f77b4`.

| Style | Applies to |
|---|---|
| `fill`, `stroke`, `strokeWidth`, `opacity` | all |
| `radius` | bar, rect (corner radius) |
| `size` | point radius; bar/tick thickness as a fraction of the band |
| `curve` | line, area: `linear`, `smooth`, `step` |
| `dash` | line, rule: e.g. `[6, 5]` |
| `fontSize`, `fontWeight`, `anchor`, `dx`, `dy`, `format` | text |
| `innerRadius` | arc |

Sizes are in pixels at 1200×675 and scale automatically with the export size.

## Recipes

**Diverging bars** — two filtered layers:

```json
"layers": [
  { "mark": "bar", "filter": { "field": "change", "op": ">=", "value": 0 }, "encoding": { "y": { "field": "label" }, "x": { "field": "change" } }, "style": { "fill": "positive" } },
  { "mark": "bar", "filter": { "field": "change", "op": "<", "value": 0 }, "encoding": { "y": { "field": "label" }, "x": { "field": "change" } }, "style": { "fill": "negative" } }
]
```

**Multi-series from wide data** — `fold` a `multiple` field:

```json
"fields": [{ "key": "x", "label": "Year", "type": "any" }, { "key": "series", "label": "Series", "type": "number", "multiple": true }],
"layers": [{ "mark": "line", "fold": "series", "encoding": { "x": { "field": "x" }, "y": { "field": "$value" }, "color": { "field": "$series" } } }]
```

**Range band** — area with `y2`:

```json
{ "mark": "area", "encoding": { "x": { "field": "month" }, "y": { "field": "high" }, "y2": { "field": "low" } }, "style": { "opacity": 0.2, "strokeWidth": 0 } }
```

## Validation

The Studio validates as you type and lists every problem with its path (`layers[1].encoding.x.field "foo" is not one of the declared fields`). Unknown properties are dropped, numbers are clamped, and colors must be color references — which is what makes specs safe to share.
