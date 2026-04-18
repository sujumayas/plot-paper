import Link from "next/link";
import { ExploreView } from "@/components/explore/ExploreView";
import { getServerClient } from "@/lib/supabase/server";
import type { GraphWithVizType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  let graphs: GraphWithVizType[] = [];
  let error: string | null = null;

  try {
    const supa = await getServerClient();
    const { data, error: dbErr } = await supa
      .from("graphs")
      .select("*, viz_types(*)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(120);
    if (dbErr) throw dbErr;
    graphs = (data ?? []) as GraphWithVizType[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  if (error) {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="eyebrow">setup required</div>
            <h1>
              Connect <em>Supabase</em> to see Explore.
            </h1>
            <p>
              The Explore feed reads from Postgres. Set{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
              <code>.env.local</code>, run the migrations in{" "}
              <code>supabase/migrations/</code>, then run{" "}
              <code>npm run seed</code> to provision Esen&rsquo;s seed user and
              9 gallery graphs.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/build" prefetch={false}>
                <button className="btn primary" type="button">
                  Or jump straight to Build →
                </button>
              </Link>
            </div>
            <details
              style={{
                marginTop: 24,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--ink-3)",
              }}
            >
              <summary>Error detail</summary>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{error}</pre>
            </details>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <ExploreView graphs={graphs} />
    </section>
  );
}
