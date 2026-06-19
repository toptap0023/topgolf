import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "topgolf_gate";

/**
 * Single-user passphrase gate. If APP_PASSCODE is set, every page requires a
 * matching cookie; otherwise the site redirects to /unlock. If APP_PASSCODE is
 * unset (e.g. a fresh local clone with no env), the gate is disabled so you're
 * never locked out by accident.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const pass = process.env.APP_PASSCODE;
  if (!pass) return NextResponse.next();

  if (req.cookies.get(COOKIE)?.value === pass) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
