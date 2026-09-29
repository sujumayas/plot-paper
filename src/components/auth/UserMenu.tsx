"use client";

import { useState } from "react";
import { IconCaret, IconUser } from "@/components/icons";
import { useUser } from "@/hooks/useUser";
import { getBrowserClient } from "@/lib/supabase/client";
import { SignInModal } from "./SignInModal";

export function UserMenu() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);

  if (loading) {
    return (
      <div className="user-pill" aria-hidden>
        <div className="av">··</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <button
          className="btn primary sm"
          type="button"
          onClick={() => setSigninOpen(true)}
        >
          Iniciar sesión
        </button>
        <SignInModal open={signinOpen} onClose={() => setSigninOpen(false)} />
      </>
    );
  }

  const initials = (user.email ?? "yo").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="user-pill"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cuenta"
        title={user.email ?? "Cuenta"}
      >
        <div className="av">
          {initials || <IconUser />}
        </div>
        <span className="caret">
          <IconCaret />
        </span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow-modal)",
            minWidth: 220,
            zIndex: 90,
            padding: 8,
          }}
        >
          <div
            className="small"
            style={{
              padding: "6px 10px",
              color: "var(--fg-3)",
              fontFamily: "var(--num)",
            }}
          >
            {user.email}
          </div>
          <button
            className="btn ghost sm block"
            type="button"
            onClick={async () => {
              const supa = getBrowserClient();
              await supa.auth.signOut();
              setOpen(false);
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
