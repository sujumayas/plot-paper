import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";

/** Public guide pages, rendered from markdown files in /docs. */
export const GUIDES = {
  "": { file: "user-guide.md", title: "User guide" },
  plotspec: { file: "plotspec.md", title: "PlotSpec reference" },
  "chart-types": { file: "creating-chart-types.md", title: "Creating chart types" },
  "self-hosting": { file: "self-hosting.md", title: "Self-hosting & configuration" },
  ai: { file: "ai.md", title: "AI features" },
} as const;

export type GuideSlug = keyof typeof GUIDES;

export async function renderGuide(slug: GuideSlug): Promise<{ title: string; html: string }> {
  const g = GUIDES[slug];
  const md = await readFile(join(process.cwd(), "docs", g.file), "utf8");
  // Rewrite links between docs to their /guide URLs.
  const linked = md.replace(/\]\(\.?\/?([a-z-]+)\.md(#[^)]*)?\)/g, (m, name: string, hash = "") => {
    const entry = Object.entries(GUIDES).find(([, v]) => v.file === `${name}.md`);
    return entry ? `](/guide${entry[0] ? "/" + entry[0] : ""}${hash})` : m;
  });
  const html = await marked.parse(linked, { gfm: true });
  // GitHub-style heading ids so `#section` links work in the app too.
  const withIds = html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (_m, level: string, inner: string) => `<h${level} id="${headingId(inner)}">${inner}</h${level}>`);
  return { title: g.title, html: withIds };
}

/** "Before you open AI to the public" → "before-you-open-ai-to-the-public" (like GitHub). */
export function headingId(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}
