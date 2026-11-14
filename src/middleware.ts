import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const LOCALES = ["id", "en"] as const;
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-tr_session" : "tr_session";

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  const imageHost = process.env.IMAGE_HOST ? ` https://${process.env.IMAGE_HOST}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${imageHost}`,
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

async function isAdminSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

function preferredLocale(req: NextRequest): (typeof LOCALES)[number] {
  const header = req.headers.get("accept-language") ?? "";
  return /^\s*en/i.test(header) ? "en" : "id";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Admin: wajib sesi valid (pemeriksaan role tetap dilakukan di server action/route).
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  if ((isAdminPage || isAdminApi) && !(await isAdminSession(req))) {
    if (isAdminApi) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Halaman publik: pastikan ada prefix locale.
  const isPublicPage =
    !pathname.startsWith("/admin") && !pathname.startsWith("/api") && !LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (isPublicPage) {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 308);
  }

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
