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
      setErr(error?.message ?? "Código inválido");
      return;
    }
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
        <h3 style={{ fontFamily: "var(--display)", fontSize: 22, margin: "0 0 8px", color: "var(--ibk-blue)" }}>
          ¡Listo!
        </h3>
        <p className="small">Ya puedes cerrar y seguir explorando.</p>
      </div>
    );
  }

  return phase === "email" ? (
    <form className="ai-form" onSubmit={sendOtp}>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      {err && (
        <div className="small" style={{ color: "var(--red)" }}>
          {err}
        </div>
      )}
      <Button type="submit" variant="primary" disabled={busy} block>
        {busy ? "Enviando…" : "Enviar código"}
      </Button>
      <p className="small">
        Te enviaremos un código de 6 dígitos a tu correo. El registro y el inicio
        de sesión usan el mismo formulario.
      </p>
    </form>
  ) : (
    <form className="ai-form" onSubmit={verifyOtp}>
      <div className="field">
        <label htmlFor="code">Código enviado a {email}</label>
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
        <div className="small" style={{ color: "var(--red)" }}>
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
          Volver
        </Button>
        <Button type="submit" variant="primary" disabled={busy} block>
          {busy ? "Verificando…" : "Verificar e iniciar sesión"}
        </Button>
      </div>
    </form>
  );
}
