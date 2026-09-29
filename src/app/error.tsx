"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="center-page">
      <div>
        <h1>{t("errors.genericTitle")}</h1>
        <p>{t("errors.genericBody")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn primary" type="button" onClick={reset}>
            {t("common.retry")}
          </button>
          <Link className="btn" href="/">
            {t("errors.goHome")}
          </Link>
        </div>
        {error.digest && <p className="hint mono" style={{ marginTop: 16 }}>ref: {error.digest}</p>}
      </div>
    </div>
  );
}
