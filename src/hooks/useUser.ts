"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";

/** Current Supabase user (always null when Supabase isn't configured). */
export function useUser(): { user: User | null; loading: boolean; enabled: boolean } {
  const supa = getBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supa);

  useEffect(() => {
    if (!supa) return;
    let alive = true;
    supa.auth
      .getUser()
      .then(({ data }) => alive && setUser(data.user))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supa]);

  return { user, loading, enabled: !!supa };
}
