# Self-hosting & configuration

Plotpaper is a Next.js 15 app. With **zero configuration** it runs fully local-first: creating charts, exports, share links, the example gallery and the Studio all work. Two integrations are optional:

- **Anthropic API key** → AI chart suggestions and AI-generated chart types.
- **Supabase** → accounts (email codes) and a community gallery people can publish to.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

Requires Node 20+.

## Configuration

Copy `.env.example` to `.env.local` and set what you need. Every setting is optional.

### Branding & defaults

| Variable | Default | |
|---|---|---|
| `NEXT_PUBLIC_SITE_NAME` | `Plotpaper` | Product name in the UI. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URL (Open Graph). |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` | `en` or `es`. Users can switch; the choice is remembered. |
| `NEXT_PUBLIC_DEFAULT_THEME` | `clean` | Theme for new charts: `clean`, `paper`, `midnight`, `newsprint`, `pastel`, `forest`, `blueprint`, `emerald`. |
| `NEXT_PUBLIC_DEFAULT_SIZE` | `landscape` | `landscape`, `slide`, `square`, `portrait`, `story`, `og`, `a4`, `compact`. |
| `NEXT_PUBLIC_CHART_BRANDING` | `true` | Default for the "Made with …" credit on charts. |
| `NEXT_PUBLIC_CHART_CREDIT` | `Made with Plotpaper` | The credit text. |
| `NEXT_PUBLIC_GITHUB_URL` | repo URL | Footer link (empty to hide). |

Deeper changes live in code, in one place each:

- **App colors / fonts** — the tokens at the top of `src/app/globals.css`.
- **Chart themes, palettes, font pairings, size presets** — `src/lib/viz/themes.ts`.
- **UI text** — `src/lib/i18n/en.ts` and `es.ts` (TypeScript enforces that both have the same keys).
- **Gallery examples** — JSON files in `src/lib/examples/datasets/` (run `npm run gen:examples` after adding one).

### AI

See [AI features](ai.md).

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Enables Claude. Server-side only — never exposed to the browser. |
| `AI_PROVIDER` | `anthropic` if a key is set | `anthropic`, `mock` (simulated answers for demos/tests) or `none`. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Any Claude model id. |
| `AI_EFFORT` | `medium` | `low` … `max`. |
| `AI_MAX_TOKENS` | `16000` | |
| `AI_REFUSAL_FALLBACK` | `true` | Server-side fallback model if a request is declined. |
| `AI_REQUIRE_AUTH` | `auto` | `auto` = require sign-in when Supabase is configured. |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | Per user (or IP). `0` = unlimited. |
| `AI_TIMEOUT_MS` | `120000` | |

### Supabase (optional)

| Variable | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Only for `npm run seed` — never set it on the web host |

1. Create a project at supabase.com.
2. Run the migrations in `supabase/migrations/` in order (SQL editor or `supabase db push`).
3. Enable **Email** auth with OTP codes; add your site URL to **Auth → URL configuration → Redirect URLs**.
4. Optionally seed the community gallery with the bundled examples: `npm run seed`.

Row-level security is on for every table: anyone can read published charts; only authors can edit their own.

## Deploying

### Netlify

`netlify.toml` is included. Set the environment variables above in **Site settings → Environment variables** (at minimum nothing!). Add `ANTHROPIC_API_KEY` there to enable AI — it's only read by the `/api/ai/*` server routes.

### Vercel / any Node host

`npm run build` then `npm start` (or deploy with the platform's Next.js preset). The AI routes need a Node.js runtime (not the edge runtime) and allow up to 300 s for chart-type generation.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=3000
CMD ["npm", "start"]
```

## Security notes

- Custom chart types are declarative JSON (PlotSpec), validated and rendered as React elements — no user or AI code ever runs.
- Share links keep the chart inside the URL fragment (`#d=…`), which browsers never send to the server.
- Security headers (CSP, frame, referrer, permissions) are set in `next.config.ts`.
- The AI routes validate inputs (prompt ≤ 2,000 chars, images ≤ 4 MB of PNG/JPEG/WebP/GIF, request ≤ 6 MB) and are rate limited. The in-memory limiter is per server instance; put a shared store in front for strict global limits.
