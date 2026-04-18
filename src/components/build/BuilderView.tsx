"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AIModal } from "./AIModal";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderSidebar } from "./BuilderSidebar";
import { DataExportModal } from "./DataExportModal";
import { TweaksPanel } from "./TweaksPanel";
import { SignInModal } from "@/components/auth/SignInModal";
import { useToasts } from "@/hooks/useToasts";
import { getBrowserClient } from "@/lib/supabase/client";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { useTweaks } from "@/lib/tweaks";
import { SEED_CATALOG } from "@/lib/viz/catalog";
import { resolveVizFromRow } from "@/lib/viz/resolveViz";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type Props = {
  initialVizId?: string;
  initialTitle?: string;
  initialData?: VizRow[];
  initialOwnedTypes?: VizCatalogEntry[];
};

export function BuilderView({
  initialVizId,
  initialTitle,
  initialData,
  initialOwnedTypes,
}: Props) {
  const search = useSearchParams();
  const router = useRouter();
  const { toast, node: toastNode } = useToasts();
  const [tweaks, setTweaks] = useTweaks();

  const [ownedTypes, setOwnedTypes] = useState<VizCatalogEntry[]>(
    initialOwnedTypes ?? [],
  );
  const [userId, setUserId] = useState<string | null>(null);
  const allTypes = useMemo(
    () => [...ownedTypes, ...SEED_CATALOG],
    [ownedTypes],
  );

  const initial: VizCatalogEntry =
    allTypes.find((v) => v.id === initialVizId) ?? SEED_CATALOG[0];

  const [viz, setViz] = useState<VizCatalogEntry>(initial);
  const [title, setTitle] = useState<string>(initialTitle ?? "Untitled graph");
  const [data, setData] = useState<VizRow[]>(
    initialData?.length ? initialData : viz.sample,
  );
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hydrated = useRef(false);

  // Hydrate auth + owned types + localStorage draft (only if there was no server-provided initial).
  useEffect(() => {
    const supa = getBrowserClient();
    supa.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: saved } = await supa
          .from("saved_types")
          .select("viz_types (*)")
          .eq("user_id", uid);
        if (Array.isArray(saved)) {
          const types = saved
            .map((row) => {
              const v = (row as { viz_types: unknown }).viz_types;
              return v ? resolveVizFromRow(v as never) : null;
            })
            .filter((v): v is VizCatalogEntry => v !== null);
          setOwnedTypes(types);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (initialData?.length) {
      hydrated.current = true;
      return;
    }
    const draft = loadDraft();
    if (draft) {
      const maybe = allTypes.find((v) => v.id === draft.vizId);
      if (maybe) {
        setViz(maybe);
        setTitle(draft.title || "Untitled graph");
        setData(draft.data.length ? draft.data : maybe.sample);
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft on changes.
  useEffect(() => {
    if (!hydrated.current) return;
    const id = setTimeout(() => {
      saveDraft({ vizId: viz.id, title, data });
    }, 200);
    return () => clearTimeout(id);
  }, [viz.id, title, data]);

  const handleSelectViz = (next: VizCatalogEntry) => {
    setViz(next);
    // If current data doesn't match the new viz's column schema, fall back to its sample.
    const neededCols = next.columns.map((c) => c.name);
    const first = data[0] ?? {};
    const compatible = neededCols.every((c) => c in first);
    if (!compatible || data.length === 0) {
      setData(next.sample);
    }
  };

  const handlePublish = async () => {
    if (!userId) {
      setSignInReason("Sign in to publish.");
      return;
    }
    if (data.length === 0) {
      toast("Load some data first");
      return;
    }
    const supa = getBrowserClient();
    // If the viz is a seed, use its DB slug to find the row. Otherwise use its own id.
    let vizTypeId: string | null = null;
    if (viz.isCustom) {
      vizTypeId = viz.id;
    } else {
      const { data: vt } = await supa
        .from("viz_types")
        .select("id")
        .eq("slug", viz.baseRendererId)
        .is("owner_id", null)
        .maybeSingle();
      vizTypeId = (vt as { id: string } | null)?.id ?? null;
    }
    if (!vizTypeId) {
      toast("Could not resolve viz type");
      return;
    }
    const { data: inserted, error } = await supa
      .from("graphs")
      .insert({
        title: title || "Untitled graph",
        viz_type_id: vizTypeId,
        data,
        author_id: userId,
        is_published: true,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      toast("Could not publish — " + (error?.message ?? "unknown error"));
      return;
    }
    toast("Published!");
    clearDraft();
    router.push("/explore");
  };

  const handleOpenAI = () => {
    if (!userId) {
      setSignInReason("Sign in to generate with AI.");
      return;
    }
    setAiOpen(true);
  };

  return (
    <>
      <div className="builder">
        <BuilderSidebar
          seedTypes={SEED_CATALOG}
          ownedTypes={ownedTypes}
          selectedId={viz.id}
          onSelect={handleSelectViz}
          onOpenAI={handleOpenAI}
          onOpenData={() => setDataModalOpen(true)}
          rows={data.length}
          aiGated={!userId}
        />
        <BuilderCanvas
          viz={viz}
          data={data}
          title={title}
          onTitleChange={setTitle}
          tweaks={tweaks}
          svgRef={svgRef}
          onOpenData={() => setDataModalOpen(true)}
          onPublish={handlePublish}
          publishGated={!userId}
        />
      </div>

      <DataExportModal
        open={dataModalOpen}
        viz={viz}
        data={data}
        title={title}
        svgRef={svgRef}
        onData={(rows) => {
          setData(rows);
          toast(`Loaded ${rows.length} rows`);
        }}
        onImportJSON={({ title: t, vizId, data: rows }) => {
          if (vizId) {
            const match = allTypes.find(
              (v) => v.id === vizId || v.baseRendererId === vizId,
            );
            if (match) setViz(match);
          }
          if (t) setTitle(t);
          if (rows) setData(rows);
        }}
        onClose={() => setDataModalOpen(false)}
        toast={toast}
      />

      <TweaksPanel tweaks={tweaks} onChange={setTweaks} />

      <AIModal
        open={aiOpen}
        userId={userId}
        onClose={() => setAiOpen(false)}
        onGenerated={(newViz) => {
          setOwnedTypes((list) => [newViz, ...list]);
          setViz(newViz);
          setData(newViz.sample);
          setTitle(newViz.name);
        }}
        toast={toast}
      />

      <SignInModal
        open={signInReason !== null}
        onClose={() => setSignInReason(null)}
        reason={signInReason ?? undefined}
      />

      {useSearchParamsMessage(search, toast)}
      {toastNode}
    </>
  );
}

function useSearchParamsMessage(
  search: URLSearchParams,
  toast: (m: string) => void,
) {
  const already = useRef(false);
  useEffect(() => {
    if (already.current) return;
    if (search.get("new")) {
      toast("Published to Explore");
      already.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
