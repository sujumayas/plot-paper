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
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  if (error) {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="eyebrow">Configuración requerida</div>
            <h1>
              Conecta <em>Supabase</em> para ver la galería.
            </h1>
            <p>
              La galería lee de Postgres. Configura{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
              <code>.env.local</code>, corre las migraciones de{" "}
              <code>supabase/migrations/</code> y luego{" "}
              <code>npm run seed</code> para provisionar el usuario semilla y
              9 gráficos de muestra.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/build" prefetch={false}>
                <button className="btn primary" type="button">
                  O salta directo a Construir →
                </button>
              </Link>
            </div>
            <details
              style={{
                marginTop: 24,
                fontFamily: "var(--num)",
                fontSize: 11,
                color: "var(--fg-4)",
              }}
            >
              <summary>Detalle del error</summary>
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
