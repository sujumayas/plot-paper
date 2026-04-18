"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { getBrowserClient } from "@/lib/supabase/client";
import { SignInModal } from "./SignInModal";

export function UserMenu() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);

  if (loading) return <div className="avatar" aria-hidden>··</div>;

  if (!user) {
    return (
      <>
        <button
          className="btn sm"
          type="button"
          onClick={() => setSigninOpen(true)}
        >
          Sign in
        </button>
        <SignInModal open={signinOpen} onClose={() => setSigninOpen(false)} />
      </>
    );
  }

  const initials = (user.email ?? "yy").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="avatar"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        title={user.email ?? "Account"}
        style={{ cursor: "pointer", border: 0 }}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            boxShadow: "var(--shadow-md)",
            minWidth: 200,
            zIndex: 90,
            padding: 8,
          }}
        >
          <div
            className="small mono"
            style={{ padding: "6px 10px", color: "var(--ink-3)" }}
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
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
