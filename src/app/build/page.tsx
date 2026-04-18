import { Suspense } from "react";
import { BuilderView } from "@/components/build/BuilderView";
import { getServerClient } from "@/lib/supabase/server";
import { resolveVizFromRow } from "@/lib/viz/resolveViz";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BuildPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const draftId = typeof sp.draft === "string" ? sp.draft : undefined;
  const forkId = typeof sp.fork === "string" ? sp.fork : undefined;
  const useDataId = typeof sp.useData === "string" ? sp.useData : undefined;
  const typeSlug = typeof sp.type === "string" ? sp.type : undefined;

  let initialVizId: string | undefined;
  let initialTitle: string | undefined;
  let initialData: VizRow[] | undefined;

  try {
    const supa = await getServerClient();

    if (draftId || forkId || useDataId) {
      const id = draftId ?? forkId ?? useDataId;
      const { data } = await supa
        .from("graphs")
        .select("*, viz_types(*)")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const graph = data as {
          title: string;
          data: VizRow[];
          viz_types: Parameters<typeof resolveVizFromRow>[0];
        };
        initialTitle = useDataId ? `${graph.title} (new lens)` : graph.title;
        initialData = graph.data;
        if (!useDataId) {
          const viz = resolveVizFromRow(graph.viz_types);
          initialVizId = viz.id;
        }
      }
    } else if (typeSlug) {
      const { data } = await supa
        .from("viz_types")
        .select("*")
        .eq("slug", typeSlug)
        .is("owner_id", null)
        .maybeSingle();
      if (data) {
        const viz = resolveVizFromRow(data as never);
        initialVizId = viz.id;
      }
    }
  } catch {
    // Supabase may be unconfigured — fall through to fully client-side builder.
  }

  const initialOwnedTypes: VizCatalogEntry[] = [];

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">compose · the workbench</div>
          <h1>
            Pick a type. <em>Drop data.</em>
          </h1>
          <p>
            Download a CSV template for any chart, fill it in, drop it back.
            Tweak the accent and publish to Explore.
          </p>
        </div>
      </div>

      <Suspense fallback={<div style={{ padding: 48 }}>Loading…</div>}>
        <BuilderView
          initialVizId={initialVizId}
          initialTitle={initialTitle}
          initialData={initialData}
          initialOwnedTypes={initialOwnedTypes}
        />
      </Suspense>
    </section>
  );
}
