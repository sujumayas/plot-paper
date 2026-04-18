"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getBrowserClient } from "@/lib/supabase/client";
import { migrateLocalState } from "@/lib/migrate";

type Props = {
  onSignedIn?: () => void;
};

type Phase = "email" | "code" | "done";

export function SignInForm({ onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supa = getBrowserClient();
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPhase("code");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supa = getBrowserClient();
    const { data, error } = await supa.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(false);
    if (error || !data.user) {
      setErr(error?.message ?? "Invalid code");
      return;
    }
    // First-login migration (best-effort).
    try {
      await migrateLocalState(data.user.id);
    } catch {
      /* ignore */
    }
    setPhase("done");
    onSignedIn?.();
  };

  if (phase === "done") {
    return (
      <div style={{ padding: "24px 0" }}>
        <h3 className="serif" style={{ fontSize: 24, margin: "0 0 8px" }}>
          Signed in.
        </h3>
        <p className="small">You can close this and keep going.</p>
      </div>
    );
  }

  return phase === "email" ? (
    <form className="ai-form" onSubmit={sendOtp}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="text"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      {err && (
        <div className="small" style={{ color: "var(--danger)" }}>
          {err}
        </div>
      )}
      <Button type="submit" variant="primary" disabled={busy} block>
        {busy ? "Sending…" : "Send code"}
      </Button>
      <p className="small">
        We&rsquo;ll email a 6-digit code. Sign-up and sign-in use the same form.
      </p>
    </form>
  ) : (
    <form className="ai-form" onSubmit={verifyOtp}>
      <div className="field">
        <label htmlFor="code">Code sent to {email}</label>
        <input
          id="code"
          type="text"
          placeholder="123456"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
        />
      </div>
      {err && (
        <div className="small" style={{ color: "var(--danger)" }}>
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          type="button"
          onClick={() => {
            setPhase("email");
            setCode("");
            setErr(null);
          }}
        >
          Back
        </Button>
        <Button type="submit" variant="primary" disabled={busy} block>
          {busy ? "Verifying…" : "Verify & sign in"}
        </Button>
      </div>
    </form>
  );
}
