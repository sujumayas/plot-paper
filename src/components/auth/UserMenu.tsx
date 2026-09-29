"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { useUser } from "@/hooks/useUser";
import { useI18n } from "@/lib/i18n";
import { getBrowserClient } from "@/lib/supabase/client";
import { SignInModal } from "./SignInModal";

/** Sign-in button / account menu. Renders nothing when Supabase isn't configured. */
export function UserMenu() {
  const { user, loading, enabled } = useUser();
  const { t } = useI18n();
  const [signin, setSignin] = useState(false);
  if (!enabled || loading) return null;
  if (!user) {
    return (
      <>
        <button className="btn sm" type="button" onClick={() => setSignin(true)}>
          {t("nav.signIn")}
        </button>
        <SignInModal open={signin} onClose={() => setSignin(false)} />
      </>
    );
  }
  const initials = (user.email ?? "me").slice(0, 2).toUpperCase();
  return (
    <Popover
      label={user.email ?? undefined}
      trigger={({ toggle }) => (
        <button className="btn icon sm" type="button" onClick={toggle} title={user.email ?? undefined} aria-label={user.email ?? "Account"} style={{ borderRadius: 99 }}>
          {initials}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="hint" style={{ padding: "6px 10px" }}>{user.email}</div>
          <button
            className="menu-item"
            type="button"
            onClick={async () => {
              await getBrowserClient()?.auth.signOut();
              close();
            }}
          >
            {t("nav.signOut")}
          </button>
        </>
      )}
    </Popover>
  );
}
