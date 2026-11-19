import { NextResponse, type NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { isIdleExpired, lastActivity, needsTouch } from "@/lib/session-policy";

const LOCALES = ["id", "en"] as const;
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-tr_session" : "tr_session";

/**
 * Admin & API: CSP ketat dengan nonce (halaman selalu dirender dinamis).
 * Halaman publik di-cache/di-prerender (ISR) sehingga TIDAK bisa membawa nonce per-permintaan; skrip inline
 * bawaan Next (hidrasi & penukar skeleton Suspense) akan diblokir bila CSP-nya memakai nonce, dan hasilnya
 * skeleton loading tidak pernah selesai. Karena itu halaman publik memakai 'unsafe-inline' tanpa nonce.
 * Risikonya kecil: situs publik tidak merender HTML buatan pengguna (JSON-LD sudah di-escape).
 */
function buildCsp(nonce: string | null): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`;
  const hosts = [process.env.IMAGE_HOST?.trim(), process.env.CLOUDINARY_CLOUD_NAME?.trim() ? "res.cloudinary.com" : undefined].filter(Boolean);
  const imageHost = hosts.length ? ` ${[...new Set(hosts)].map((h) => `https://${h}`).join(" ")}` : "";
  return [
    "default-src 'self'",
    scriptSrc,
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

type AdminCheck = { ok: false; idle: boolean } | { ok: true; touch?: { token: string; maxAge: number } };

/**
 * Memeriksa sesi admin. Selain tanda tangan dan masa berlaku mutlak, di sini juga ditegakkan batas diam
 * dan cap aktivitas terakhir (`la`) diperbarui (maksimal sekali per menit) agar sesi aktif tidak mati.
 */
async function checkAdminSession(req: NextRequest): Promise<AdminCheck> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return { ok: false, idle: false };
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const now = Math.floor(Date.now() / 1000);
    const la = lastActivity(payload);
    if (isIdleExpired(la, now)) return { ok: false, idle: true };
    // POST (server action, termasuk logout) tidak menulis ulang cookie agar tidak menimpa penghapusan sesi.
    if (req.method === "GET" && needsTouch(la, now) && typeof payload.exp === "number" && typeof payload.iat === "number" && payload.sub) {
      const fresh = await new SignJWT({ role: payload.role, sv: payload.sv, la: now })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.sub)
        .setIssuedAt(payload.iat)
        .setExpirationTime(payload.exp)
        .sign(key);
      return { ok: true, touch: { token: fresh, maxAge: Math.max(1, payload.exp - now) } };
    }
    return { ok: true };
  } catch {
    return { ok: false, idle: false };
  }
}

function preferredLocale(req: NextRequest): (typeof LOCALES)[number] {
  const header = req.headers.get("accept-language") ?? "";
  return /^\s*en/i.test(header) ? "en" : "id";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const strict = pathname.startsWith("/admin") || pathname.startsWith("/api");
  const nonce = strict ? btoa(crypto.randomUUID()) : null;
  const csp = buildCsp(nonce);

  // Admin: wajib sesi valid (pemeriksaan role tetap dilakukan di server action/route).
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  let touch: { token: string; maxAge: number } | undefined;
  if (isAdminPage || isAdminApi) {
    const check = await checkAdminSession(req);
    if (!check.ok) {
      if (isAdminApi) return NextResponse.json({ error: check.idle ? "SESSION_EXPIRED" : "UNAUTHORIZED" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = check.idle ? "?expired=1" : "";
      return NextResponse.redirect(url);
    }
    touch = check.touch;
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
  if (nonce) {
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
  }
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  if (touch) {
    res.cookies.set(COOKIE, touch.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: touch.maxAge });
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
