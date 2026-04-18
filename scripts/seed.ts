/* eslint-disable no-console */
/*
  Seed script — provisions the seed user esen.espinosa@gmail.com and 9 gallery graphs.
  Idempotent. Requires SUPABASE_SERVICE_ROLE_KEY.

  Run with: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts`
  or set those in .env.local and run `npm run seed` (loads .env.local automatically if you
  use `tsx --env-file=.env.local scripts/seed.ts`).
*/

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SEED_EMAIL = "esen.espinosa@gmail.com";

// Load .env.local without extra deps
try {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  // optional
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local.",
  );
  process.exit(1);
}

const supa = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SeedGraph = {
  id: string;
  title: string;
  description: string;
  vizSlug: string;
  author: string;
  likes: number;
  remixes: number;
  views: number;
  tags: string[];
  data: unknown[];
};

const seedGraphs: SeedGraph[] = [
  {
    id: "g-metro-rents",
    title: "Metro rent index",
    description:
      "Median 1-bedroom rent across 9 metros, Q1 2026. Gathered from local listing boards — directional, not authoritative.",
    vizSlug: "hbar",
    author: "mara.k",
    likes: 184,
    remixes: 22,
    views: 2104,
    tags: ["housing", "geography"],
    data: [
      { label: "San Francisco", score: 3420 },
      { label: "New York", score: 3180 },
      { label: "Boston", score: 2790 },
      { label: "Seattle", score: 2410 },
      { label: "Los Angeles", score: 2380 },
      { label: "Austin", score: 1920 },
      { label: "Denver", score: 1780 },
      { label: "Atlanta", score: 1640 },
      { label: "Pittsburgh", score: 1180 },
    ],
  },
  {
    id: "g-coffee-week",
    title: "One week of coffee",
    description:
      "Self-logged cups of coffee across seven days, broken out by hour. Yes I have a problem.",
    vizSlug: "heatmap",
    author: "jules.t",
    likes: 92,
    remixes: 12,
    views: 803,
    tags: ["personal", "time-series"],
    data: [
      { row: "Mon", column: "7am", value: 1 },
      { row: "Mon", column: "10am", value: 2 },
      { row: "Mon", column: "2pm", value: 1 },
      { row: "Mon", column: "5pm", value: 0 },
      { row: "Tue", column: "7am", value: 1 },
      { row: "Tue", column: "10am", value: 1 },
      { row: "Tue", column: "2pm", value: 2 },
      { row: "Tue", column: "5pm", value: 1 },
      { row: "Wed", column: "7am", value: 2 },
      { row: "Wed", column: "10am", value: 2 },
      { row: "Wed", column: "2pm", value: 2 },
      { row: "Wed", column: "5pm", value: 1 },
      { row: "Thu", column: "7am", value: 1 },
      { row: "Thu", column: "10am", value: 3 },
      { row: "Thu", column: "2pm", value: 1 },
      { row: "Thu", column: "5pm", value: 0 },
      { row: "Fri", column: "7am", value: 2 },
      { row: "Fri", column: "10am", value: 2 },
      { row: "Fri", column: "2pm", value: 0 },
      { row: "Fri", column: "5pm", value: 1 },
      { row: "Sat", column: "7am", value: 0 },
      { row: "Sat", column: "10am", value: 2 },
      { row: "Sat", column: "2pm", value: 0 },
      { row: "Sat", column: "5pm", value: 0 },
      { row: "Sun", column: "7am", value: 0 },
      { row: "Sun", column: "10am", value: 1 },
      { row: "Sun", column: "2pm", value: 0 },
      { row: "Sun", column: "5pm", value: 0 },
    ],
  },
  {
    id: "g-startup-runway",
    title: "Seed-stage burn vs revenue",
    description:
      "Rolling 6-quarter view for a synthetic startup. Good teaching example for unit economics conversations.",
    vizSlug: "multiline",
    author: "finn.v",
    likes: 318,
    remixes: 41,
    views: 4382,
    tags: ["business", "time-series"],
    data: [
      { date: "Q1-24", revenue: 42, cost: 180 },
      { date: "Q2-24", revenue: 68, cost: 195 },
      { date: "Q3-24", revenue: 94, cost: 210 },
      { date: "Q4-24", revenue: 138, cost: 225 },
      { date: "Q1-25", revenue: 201, cost: 240 },
      { date: "Q2-25", revenue: 286, cost: 262 },
      { date: "Q3-25", revenue: 342, cost: 280 },
    ],
  },
  {
    id: "g-election-turnout",
    title: "Youth turnout by region",
    description:
      "Share of 18-29 year-olds voting in the last midterm, aggregated from state records.",
    vizSlug: "bar",
    author: "rina.a",
    likes: 241,
    remixes: 18,
    views: 3010,
    tags: ["politics", "geography"],
    data: [
      { category: "Northeast", value: 48 },
      { category: "Midwest", value: 41 },
      { category: "South", value: 34 },
      { category: "Mountain", value: 37 },
      { category: "Pacific", value: 52 },
    ],
  },
  {
    id: "g-spotify-mood",
    title: "Listening mood profile",
    description:
      "Audio-feature averages across my 2025 most-played. I listen to almost no sad music, apparently.",
    vizSlug: "radar",
    author: "ori.s",
    likes: 156,
    remixes: 9,
    views: 1430,
    tags: ["personal", "music"],
    data: [
      { axis: "Energy", you: 78, benchmark: 62 },
      { axis: "Danceability", you: 68, benchmark: 58 },
      { axis: "Valence", you: 72, benchmark: 50 },
      { axis: "Acoustic", you: 34, benchmark: 48 },
      { axis: "Speechiness", you: 18, benchmark: 22 },
      { axis: "Tempo", you: 66, benchmark: 60 },
    ],
  },
  {
    id: "g-marathon-splits",
    title: "Marathon training splits",
    description:
      "18 weeks of Sunday long runs. Pace in seconds per km — lower is faster.",
    vizSlug: "line",
    author: "dani.o",
    likes: 74,
    remixes: 6,
    views: 612,
    tags: ["fitness", "personal"],
    data: Array.from({ length: 18 }, (_, i) => ({
      date: "W" + (i + 1),
      value: 340 - i * 2.2 + (i % 3 === 0 ? 6 : -3),
    })),
  },
  {
    id: "g-food-budget",
    title: "Where my grocery money goes",
    description:
      "One month of grocery spending categorized by aisle. Produce won, which is a first.",
    vizSlug: "donut",
    author: "sam.l",
    likes: 112,
    remixes: 8,
    views: 840,
    tags: ["personal", "finance"],
    data: [
      { segment: "Produce", share: 32 },
      { segment: "Proteins", share: 24 },
      { segment: "Pantry", share: 18 },
      { segment: "Dairy", share: 12 },
      { segment: "Snacks", share: 8 },
      { segment: "Other", share: 6 },
    ],
  },
  {
    id: "g-happiness-income",
    title: "Happiness vs income, 120 countries",
    description:
      "WHR 2025 life-satisfaction score plotted against log GDP per capita. Bubble size is population.",
    vizSlug: "scatter",
    author: "eli.m",
    likes: 402,
    remixes: 58,
    views: 6130,
    tags: ["economics", "global"],
    // Deterministic variant of the prototype's random scatter — stable across seed runs.
    data: Array.from({ length: 24 }, (_, i) => ({
      x: 8 + i * 1.6 + ((i * 17) % 11) / 5,
      y: 4 + i * 0.22 + ((i * 13) % 9) / 5,
      size: 5 + ((i * 7) % 25),
    })),
  },
  {
    id: "g-product-launch",
    title: "Q2 launch plan",
    description:
      "Cross-functional timeline for the v3 release. Numbers are week-of-quarter.",
    vizSlug: "timeline",
    author: "noa.b",
    likes: 89,
    remixes: 14,
    views: 1120,
    tags: ["product", "planning"],
    data: [
      { task: "Design spike", start: 1, end: 3 },
      { task: "API contracts", start: 2, end: 5 },
      { task: "Frontend build", start: 4, end: 10 },
      { task: "Backend build", start: 4, end: 9 },
      { task: "Beta cohort", start: 9, end: 11 },
      { task: "Marketing prep", start: 8, end: 12 },
      { task: "GA launch", start: 12, end: 13 },
    ],
  },
];

async function ensureSeedUser(): Promise<string> {
  // Look up by email first.
  const { data: existing, error: listErr } = await supa.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;
  const found = existing.users.find((u) => u.email?.toLowerCase() === SEED_EMAIL);
  if (found) {
    console.log(`Seed user already exists: ${SEED_EMAIL} (${found.id})`);
    return found.id;
  }
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: SEED_EMAIL,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  if (!created.user) throw new Error("Could not create seed user");
  console.log(`Created seed user: ${SEED_EMAIL} (${created.user.id})`);
  return created.user.id;
}

async function getVizTypeIdBySlug(slug: string): Promise<string> {
  const { data, error } = await supa
    .from("viz_types")
    .select("id")
    .eq("slug", slug)
    .is("owner_id", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      `Missing seed viz_type for slug='${slug}'. Did you run migration 0002?`,
    );
  return data.id;
}

async function seedGallery(authorId: string): Promise<void> {
  for (const g of seedGraphs) {
    const vizTypeId = await getVizTypeIdBySlug(g.vizSlug);
    // Dedup by unique (author_id, title) — not a DB constraint, we check manually.
    const { data: existing } = await supa
      .from("graphs")
      .select("id")
      .eq("author_id", authorId)
      .eq("title", g.title)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await supa
        .from("graphs")
        .update({
          description: g.description,
          viz_type_id: vizTypeId,
          data: g.data,
          tags: g.tags,
          display_author: g.author,
          likes: g.likes,
          remixes: g.remixes,
          views: g.views,
          is_published: true,
        })
        .eq("id", existing.id);
      if (updErr) throw updErr;
      console.log(`Updated graph: ${g.title}`);
    } else {
      const { error: insErr } = await supa.from("graphs").insert({
        title: g.title,
        description: g.description,
        viz_type_id: vizTypeId,
        data: g.data,
        tags: g.tags,
        author_id: authorId,
        display_author: g.author,
        likes: g.likes,
        remixes: g.remixes,
        views: g.views,
        is_published: true,
      });
      if (insErr) throw insErr;
      console.log(`Inserted graph: ${g.title}`);
    }
  }
}

async function main(): Promise<void> {
  const authorId = await ensureSeedUser();
  await seedGallery(authorId);
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
