import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Handles magic-link / OTP redirect callbacks. Exchanges the code for a session
 * and redirects the user to `?next=` (or /explore by default).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/explore";

  if (code) {
    try {
      const supa = await getServerClient();
      await supa.auth.exchangeCodeForSession(code);
    } catch {
      // fall through — the client UI will surface the error if session is still absent.
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
