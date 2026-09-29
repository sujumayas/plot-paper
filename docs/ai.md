# AI features

Plotpaper uses Claude (Anthropic) for two things. Both are optional — without an API key the rest of the app works exactly the same, and the AI boxes are simply hidden.

## 1. Suggest a chart (editor)

In the **Chart** tab, *Ask AI to design it* takes a sentence like "the top 5 products by revenue, highlight the best one". Claude sees your **column names, types and the first 30 rows** (never the full dataset), picks a built-in chart type, maps your columns, sets options and writes an insight-driven title in your language.

## 2. Create chart types (Studio)

In the **Studio**, *Create with AI* turns a description — optionally with a **reference image** of a chart you like — into a [PlotSpec](plotspec.md). Tick **Refine current spec** to ask for changes to the spec in the editor.

Claude never writes code: it returns a spec that Plotpaper **validates** before showing it. If the first draft has errors, the server sends the errors back to Claude once for a repair. The result is editable JSON you can inspect.

## Setup

```bash
# .env.local (or your host's environment variables)
ANTHROPIC_API_KEY=sk-ant-...
```

That's it. Optional tuning:

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | e.g. `claude-sonnet-5-5` for lower cost. |
| `AI_EFFORT` | `medium` | Higher = more thorough, slower. |
| `AI_REQUIRE_AUTH` | `auto` | Require sign-in (auto when Supabase is configured). Recommended for public sites. |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | Per user or IP. |
| `AI_REFUSAL_FALLBACK` | `true` | Uses the Claude API's server-side fallback if a request is declined. |

> **Going public?** Set a spend limit on the key in the Anthropic Console and require sign-in — see [Before you open AI to the public](self-hosting.md#before-you-open-ai-to-the-public).

Check it's working: `GET /api/ai/status` returns `{"enabled": true, "provider": "anthropic", ...}`.

### Demo mode without a key

Set `AI_PROVIDER=mock`. Answers are simulated deterministically (heuristic chart picking, template-based chart types, keyword-driven refinements like "rounded", "horizontal", "labels"). The UI shows a *demo* badge. The automated tests use this mode and a fake Anthropic client, so the whole pipeline is tested without a key.

## How it works

- Routes: `GET /api/ai/status`, `POST /api/ai/suggest`, `POST /api/ai/chart-type` (Node runtime).
- Requests use **structured outputs** (`output_config.format` with a JSON schema) so answers are valid JSON; if a model or proxy doesn't support them, the server retries once in plain-JSON mode.
- System prompts are static and marked for **prompt caching**.
- If a generated chart type fails validation, the errors are sent back for **one repair round** (it counts against the rate limit like any other call).
- Errors are mapped to friendly messages: invalid key, rate limits (429 with `Retry-After`), timeouts, refusals, cut-off answers, invalid specs. Unexpected errors are logged on the server and never shown verbatim to the browser.
- The API key stays on the server; the browser only talks to `/api/ai/*`.

## Privacy

Only what's needed is sent: your prompt, the optional image, and — for suggestions — column names/types plus up to 30 sample rows. Nothing is stored by Plotpaper. See Anthropic's commercial terms for how API data is handled.
