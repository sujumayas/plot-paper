/*
  Seeds the Supabase community gallery with the bundled example charts.
  Idempotent: re-running replaces the seed user's charts.

    npm run seed

  Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the
  environment). Optional: SEED_EMAIL (default gallery@plotpaper.local).
  The service-role key bypasses row-level security — only use it locally or in CI.
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { EXAMPLES } from "../src/lib/examples/server";

try {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  // .env.local is optional
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_EMAIL ?? "gallery@plotpaper.local";

if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see docs/self-hosting.md).");
  process.exit(1);
}

const supa = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

async function seedUserId(): Promise<string> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await supa.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("could not create seed user");
  return data.user.id;
}

async function main() {
  const authorId = await seedUserId();
  console.log(`Seed user ${email} → ${authorId}`);
  const { error: delErr } = await supa.from("graphs").delete().eq("author_id", authorId);
  if (delErr) throw delErr;

  const rows = EXAMPLES.map((ex, i) => {
    const { data, ...config } = ex.doc;
    return {
      title: ex.doc.title.slice(0, 200),
      description: ex.description || ex.doc.subtitle,
      chart_type: ex.doc.chartType,
      config,
      data,
      tags: ex.tags,
      author_id: authorId,
      display_author: ex.author,
      is_published: true,
      // Spread creation times so "newest" ordering is stable.
      created_at: new Date(Date.now() - i * 3_600_000).toISOString(),
    };
  });
  for (let i = 0; i < rows.length; i += 10) {
    const { error } = await supa.from("graphs").insert(rows.slice(i, i + 10));
    if (error) throw error;
  }
  console.log(`Inserted ${rows.length} published charts.`);
}

main().catch((err) => {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
});
