import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";


/** Exchanges a magic-link code for a session, then redirects to `?next=`. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    try {
      const supa = await getServerClient();
      await supa?.auth.exchangeCodeForSession(code);
    } catch {
      // The client UI surfaces the missing session.
    }
  }
  return NextResponse.redirect(new URL(next, request.url));
}
