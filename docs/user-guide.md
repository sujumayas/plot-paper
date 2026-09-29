# User guide

Plotpaper turns a table into a presentation-ready chart in about a minute. Everything happens in your browser: your data isn't uploaded anywhere unless you choose to publish it to the gallery.

## 1. Bring your data

Open **Create** and use the **Data** tab:

- **Drop a file** — CSV, TSV (tab-separated) or JSON, up to 20 MB and 50,000 rows.
- **Paste** — copy cells straight from Excel, Google Sheets or Numbers and paste them. Tabs, commas, semicolons and pipes are detected automatically.
- **Sample data** — every chart type ships with a realistic sample so you can see what it expects.
- **Download template** — a small CSV with the right columns for the current chart type.

Plotpaper understands messy numbers: `1,234.5`, `1.234,5`, `1,23,456`, `S/ 1.200`, `USD 3,200`, `$3.2k`, `12%`, `(300)` for negatives, `N/A` or `-` for missing values — and dates like `2024-12-31`, `31/12/2024` or `31.12.2024`. Each column is typed automatically as **number**, **text** or **date** (shown as `123`, `Aa` or 📅 in the table header).

You can edit any cell, rename columns by clicking their header, add or delete rows and columns (**Enter** saves an edit, **Esc** cancels it). Undo / redo with **⌘Z / ⇧⌘Z** (or Ctrl+Z / Ctrl+Y).

### Wide vs. long data

Most charts expect **wide** data — one column per series:

| year | coal | gas | renewables |
|------|------|-----|------------|
| 2020 | 35.1 | 23.5 | 28.2 |

Line and area charts also accept **long** data — one row per point with a column that names the series. Map that column to **Split by**:

| date | symbol | price |
|------|--------|-------|
| 2020-01-01 | AAPL | 77.4 |

## 2. Pick a chart

The left panel lists 26 chart types grouped by what they're good at. A green dot means the chart **fits your current data** without changes.

In the **Chart** tab:

- **Text** — a good title states the takeaway ("Renewables overtook coal in 2024"), the subtitle says what is measured and the units, and the source builds trust.
- **What goes where** — choose which column feeds each part of the chart. Required fields are marked; numeric fields only list numeric columns.
- **Chart options** — sorting, highlighting the largest bar, smooth lines, log scales, 100% stacking and more, depending on the chart.

If your data has duplicate labels (e.g. one row per transaction), category charts **combine duplicates** (sum by default — you can switch to average, max, count…). Long category lists are trimmed to the top items and an "Other" bucket.

## 3. Make it look good

The **Style** tab:

- **Theme** — 8 complete looks (Clean, Paper, Midnight, Newsprint, Soft, Forest, Blueprint, Emerald).
- **Colors** — 12 palettes including a colorblind-safe one, plus a **main color** picker for your brand.
- **Fonts** — 6 font pairings. Fonts are embedded in exports so files look identical everywhere.
- **Size** — presets for slides (16:9, 1920×1080), Instagram square and portrait, stories, link previews, A4 and docs, or any custom size from 320 to 4000 px.
- **Text size**, **gridlines**, **value labels**, **legend** position, **title alignment**, **rounded corners**, **transparent background**.
- **Numbers** — prefix (`$`, `S/`), suffix (`%`, ` km`), decimals, short numbers (12.4K) and thousands/decimal separators for your country.

## 4. Export & share

The blue **PNG** button (or **⌘S / Ctrl+S**) downloads a high-resolution image (2× by default — pick 1×–4× in the menu). The menu also offers:

- **SVG** — a vector file you can edit in Figma, Illustrator or Keynote.
- **PDF** — opens your browser's print dialog at the chart's exact size ("Save as PDF").
- **Copy image** — paste it straight into Slides, Docs, Slack or Notion.
- **Copy share link** — the whole chart is compressed *into the URL*. Nobody's server stores it. Very large datasets don't fit in a link — export a Plotpaper file instead.
- **Plotpaper file (.json)** — the complete chart (data + settings). Open it later with **Open Plotpaper file**.

Your current chart is also saved automatically in this browser. Opening a share link, an example or a gallery remix never throws that work away: the new chart opens on top of it, **Undo** brings your previous chart back, and a **Restore it** button keeps it one click away (even after a reload) until you dismiss it.

## 5. The gallery

The **Gallery** has real-world examples (climate, economics, demographics, business metrics…) with their sources. Open any of them and click **Remix this chart** to load it into the editor with its data.

When the site is connected to Supabase you can also **publish** your charts to the gallery (sign in with an email code — no passwords).

## 6. New chart types (Studio)

Need something the built-ins don't do? The **Studio** lets you create new chart types with [PlotSpec](plotspec.md), a small declarative grammar — or describe the chart and let Claude draft it. Saved types appear under **Your types** in the chart picker. See [Creating chart types](creating-chart-types.md).

## Troubleshooting

| Problem | Fix |
|---|---|
| "Choose a column for …" | Open the **Chart** tab and pick a column for the highlighted field. |
| Numbers show as text | Check the column header shows `123`. Clean stray words from the cells or use a consistent format. |
| Chart looks crowded | Lower **Max items**, switch to **Ranked bars**, pick a bigger size or reduce **Text size**. |
| Copy image doesn't work | Some browsers (Firefox) can't copy images — the PNG downloads instead. |
| Share link too long | Use **Plotpaper file (.json)** or reduce the data. |
