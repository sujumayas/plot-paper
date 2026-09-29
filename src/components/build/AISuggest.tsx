"use client";

import { useEffect, useState } from "react";
import { IconSparkle } from "@/components/icons";
import { useToast } from "@/components/ui/Toasts";
import { AIRequestError, getAIStatus, suggestChart } from "@/lib/ai/client";
import { AI_LIMITS, type AIStatus } from "@/lib/ai/protocol";
import { useI18n } from "@/lib/i18n";
import { autoMap } from "@/lib/viz/data";
import { defaultOptions } from "@/lib/viz/engine";
import type { ChartDefinition, ChartDoc } from "@/lib/viz/types";

type Props = {
  doc: ChartDoc;
  charts: ChartDefinition[];
  update: (fn: (d: ChartDoc) => ChartDoc) => void;
  onSwitchType: (def: ChartDefinition) => void;
};

/** "Describe what you want to show" → Claude picks the chart, mapping and headline. */
export function AISuggest({ doc, charts, update }: Props) {
  const { t, l, locale } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAIStatus().then(setStatus);
  }, []);
  if (!status?.enabled || !doc.columns.length) return null;

  const run = async () => {
    setBusy(true);
    try {
      const s = await suggestChart({
        prompt: prompt.slice(0, AI_LIMITS.promptChars),
        columns: doc.columns.slice(0, AI_LIMITS.columns),
        rows: doc.data.slice(0, AI_LIMITS.sampleRows),
        locale,
      });
      const def = charts.find((c) => c.id === s.chartType && !c.isCustom);
      if (!def) throw new AIRequestError("Unknown chart type", "invalid_output");
      update((d) => {
        const mapping = { ...autoMap(def, d.columns), ...s.mapping };
        return {
          ...d,
          chartType: def.id,
          mapping: autoMap(def, d.columns, mapping),
          options: { ...defaultOptions(def), ...s.options },
          title: s.title || d.title,
          subtitle: s.subtitle || d.subtitle,
        };
      });
      toast(t("ai.suggested", { chart: l(def.name) }));
    } catch (err) {
      const e = err as AIRequestError;
      toast(e.code === "rate_limited" ? t("studio.aiRateLimited") : t("studio.aiError", { message: e.message }), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ai-box">
      <h3>
        <IconSparkle /> {t("ai.suggestTitle")}
        {status.provider === "mock" && <span className="badge gray">demo</span>}
      </h3>
      <textarea className="textarea" rows={2} style={{ minHeight: 60 }} placeholder={t("ai.suggestPlaceholder")} value={prompt} maxLength={AI_LIMITS.promptChars} onChange={(e) => setPrompt(e.target.value)} />
      <button className="btn dark sm" type="button" onClick={run} disabled={busy}>
        <IconSparkle /> {busy ? t("ai.suggesting") : t("ai.suggest")}
      </button>
    </section>
  );
}
