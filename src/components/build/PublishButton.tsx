"use client";

import { useState } from "react";
import { SignInModal } from "@/components/auth/SignInModal";
import { IconShare } from "@/components/icons";
import { useToast } from "@/components/ui/Toasts";
import { useUser } from "@/hooks/useUser";
import { publishGraph } from "@/lib/gallery";
import { useI18n } from "@/lib/i18n";
import { loadCustomTypes, CUSTOM_PREFIX } from "@/lib/customTypes";
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

/** Publishes the chart to the community gallery (only when Supabase is configured). */
export function PublishButton({ doc, def }: { doc: ChartDoc; def: ChartDefinition }) {
  const { user, enabled } = useUser();
  const { t } = useI18n();
  const toast = useToast();
  const [signin, setSignin] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;
  const publish = async () => {
    if (!user) {
      setSignin(true);
      return;
    }
    setBusy(true);
    const spec = def.isCustom ? loadCustomTypes().find((c) => CUSTOM_PREFIX + c.id === def.id)?.spec ?? null : null;
    const res = await publishGraph(doc, spec);
    setBusy(false);
    if (res.ok) toast(t("export.published"));
    else toast(t("export.failed", { message: res.error }), "error");
  };
  return (
    <>
      <button className="btn sm" type="button" onClick={publish} disabled={busy || !doc.data.length} title={t("export.publishHint")}>
        <IconShare /> {t("export.publish")}
      </button>
      <SignInModal open={signin} onClose={() => setSignin(false)} reason={t("export.publishNeedsAccount")} />
    </>
  );
}
