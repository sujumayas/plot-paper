"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getBrowserClient } from "@/lib/supabase/client";

type Phase = "email" | "code" | "done";

export function SignInForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supa = getBrowserClient();

  if (!supa) return <div className="alert">{t("auth.notConfigured")}</div>;
  if (phase === "done") return <div className="alert ok">{t("auth.done")}</div>;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supa.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(error.message);
    else setPhase("code");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { data, error } = await supa.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    setBusy(false);
    if (error || !data.user) {
      setErr(error?.message ?? t("auth.invalid"));
      return;
    }
    setPhase("done");
    onSignedIn?.();
  };

  return phase === "email" ? (
    <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <div className="error-text">{err}</div>}
      <button className="btn primary block" type="submit" disabled={busy}>
        {busy ? t("auth.sending") : t("auth.sendCode")}
      </button>
    </form>
  ) : (
    <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field">
        <label htmlFor="code">{t("auth.code", { email })}</label>
        <input
          id="code"
          className="input mono"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
        />
      </div>
      {err && <div className="error-text">{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="button" onClick={() => setPhase("email")}>
          {t("common.back")}
        </button>
        <button className="btn primary block" type="submit" disabled={busy || code.length !== 6}>
          {busy ? t("auth.verifying") : t("auth.verify")}
        </button>
      </div>
    </form>
  );
}
