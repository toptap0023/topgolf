import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands email links (signup confirmation, password recovery). Exchanges the
 * one-time ?code= for a session cookie, then continues to ?next= (e.g.
 * /reset-password for recovery links).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Bad/expired link — back to login.
  return NextResponse.redirect(new URL("/login", url.origin));
}
