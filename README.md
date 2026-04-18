# Plotpaper

A data-visualization playground. Pick a chart type, drop a CSV, publish to an Explore gallery. Ported from a Claude Design prototype (`design_package/`) into a real Next.js + Supabase app.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4.
- **Backend:** Supabase — Postgres + RLS, Auth (email OTP), Edge Functions, Storage.
- **AI:** Supabase Edge Function calling **Claude Opus 4.7** (`claude-opus-4-7`).
- **Hosting:** Netlify (via `@netlify/plugin-nextjs`).

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env — copy and fill
cp .env.local.example .env.local

# 3. Apply the DB schema (either via supabase CLI against your project, or paste into the SQL editor)
#    Files in supabase/migrations/ run in numeric order:
#      0001_schema.sql           # tables + RLS + RPCs
#      0002_seed_viz_types.sql   # 13 built-in viz types
#      0003_ai_storage.sql       # ai-refs storage bucket

# 4. Provision seed user + 9 gallery graphs (requires SUPABASE_SERVICE_ROLE_KEY)
npm run seed

# 5. Deploy the AI edge function + set its secret
supabase functions deploy generate-viz-type
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 6. Run the dev server
npm run dev   # → http://localhost:3000
```

## Environment variables

| Variable                         | Used by                                         |
| -------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Next.js (client + server)                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Next.js (client + server)                       |
| `SUPABASE_SERVICE_ROLE_KEY`      | `scripts/seed.ts` only (never ships to browser) |
| `ANTHROPIC_API_KEY`              | Edge function — set via `supabase secrets set`, **not** Netlify |

## Project layout

```
design_package/              reference prototype (read-only, don't edit)
src/
  app/
    explore/page.tsx         public feed (SSR, anon-readable)
    build/page.tsx           composer (hydrates ?draft / ?fork / ?useData / ?type)
    auth/signin/page.tsx     standalone OTP form
    auth/callback/route.ts   post-OTP redirect handler
    dev/viz-gallery/page.tsx all 13 seed renderers on one page (keep for smoke tests)
  components/
    TopBar.tsx
    chart/{ChartView,ChartPreview}.tsx
    explore/{ExploreView,GraphCard,DetailModal}.tsx
    build/{BuilderView,BuilderSidebar,BuilderCanvas,DataExportModal,CSVPanel,TweaksPanel,AIModal}.tsx
    auth/{SignInModal,SignInForm,UserMenu}.tsx
    icons.tsx                15 inline SVG glyphs
    ui/Button.tsx
  lib/
    viz/helpers.ts           fmt, toNum, niceMax, Palette
    viz/types.ts             VizCatalogEntry, BaseRendererId, VizOpts
    viz/renderers/*.tsx      10 physical renderers (bar, hbar, line, area, pie, scatter,
                             heatmap, radar, kpi, timeline). Multi-line uses line;
                             donut uses pie with donut=true.
    viz/catalog.tsx          13 seed entries with glyphs + sample data
    viz/resolveViz.ts        DB row → renderable VizCatalogEntry
    supabase/{client,server,middleware}.ts
    supabase/types.ts        hand-typed Database schema
    csv.ts, draft.ts, tweaks.ts, export.ts, download.ts, migrate.ts
    ai/generateVizType.ts    client wrapper for the edge function
  hooks/{useUser,useToasts}.ts
supabase/
  config.toml
  migrations/0001_schema.sql 0002_seed_viz_types.sql 0003_ai_storage.sql
  functions/generate-viz-type/index.ts
scripts/seed.ts              provisions esen.espinosa@gmail.com + 9 gallery graphs
```

## Domain model

- **`viz_types`**: renderer definitions. Seeded rows have `owner_id = null, is_public = true`. User-owned customs have `owner_id = user.id, is_public = false`, and become readable to others when referenced by a published graph (via an RLS `EXISTS` subquery).
- **`graphs`**: published data instances. Reference a viz_type. Seed graphs keep their prototype handles (`mara.k`, `jules.t`, …) via the `display_author` column while `author_id` points to Esen for ownership.
- **`saved_types`**: which user has saved which viz type (drives the "Your types" section in the builder sidebar).
- **`likes`**: one row per user-graph pair.

## Auth matrix

| Action                             | Anon | Auth |
| ---------------------------------- | :--: | :--: |
| Browse Explore, open detail modal  | ✓    | ✓    |
| Build (pick viz, upload CSV, tweak)| ✓    | ✓    |
| Export PNG / SVG / PDF / JSON      | ✓    | ✓    |
| Local draft persistence            | localStorage | DB-backed |
| AI generate a new viz type         | —    | ✓    |
| Save a viz type to your library    | —    | ✓    |
| Publish graph to Explore           | —    | ✓    |
| Fork a graph                       | —    | ✓    |
| Like a graph                       | —    | ✓    |

On first successful sign-in, `lib/migrate.ts` copies `pp-draft`, `pp-custom-vizzes`, and `pp-liked-graphs` into the account and clears those keys. `pp-tweaks` is kept (it's a UI preference).

## Security cornerstones

- **No user-authored renderer code.** Claude only returns `{ baseRendererId, name, desc, category, columns, sample }`. Every chart routes through one of 10 hardcoded base renderers in `src/lib/viz/renderers/`.
- **RLS on `viz_types`**: readable iff `is_public = true` OR `owner_id = auth.uid()` OR referenced by a published graph.
- **RLS on `graphs`**: published readable by everyone; drafts only by author.
- **AI edge function verifies JWT** before generating; unauthenticated requests get 401.
- **Reference images** upload to `ai-refs/<user_id>/*` with per-user RLS.

## Netlify

Set in the dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(`SUPABASE_SERVICE_ROLE_KEY` is optional on Netlify — only needed if you want to run `npm run seed` from CI.)

`netlify.toml` already wires `@netlify/plugin-nextjs` and Node 20.

After first deploy, add the Netlify domain to Supabase Auth → URL Configuration → Redirect URLs so OTP magic-links work in prod.

## Dev notes

- **Smoke test page**: `/dev/viz-gallery` renders all 13 seed viz types in one grid — useful after any renderer edit.
- **SVG holder uses `aspect-ratio: 820/460`** so the chart sits at the top of its container instead of stretching centered in dead space.
- **Export functions** (`lib/export.ts`) inline CSS vars as hex when serializing SVG for PNG/SVG/PDF export, so the files look right when opened outside the app.
- **Prompt caching** is enabled on the system prompt of `generate-viz-type` (saves ~70% tokens on repeat calls).

## License

Private — not published.
