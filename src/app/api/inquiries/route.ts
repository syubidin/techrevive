import { after, NextResponse, type NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { inquirySchema } from "@/lib/validation";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { maskPhone } from "@/lib/phone";
import { getClientIp, hashIp } from "@/lib/client-ip";
import { msgNewInquiry, notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa karakter ambigu (0/O, 1/I/L)

const fail = (status: number, error: string, extra?: Record<string, string>, headers?: HeadersInit) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...extra, ...headers } });

function generateCode(now = new Date()): string {
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `TR-${yymmdd}-${suffix}`;
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = getEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev tanpa kunci: lewati
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // gagal verifikasi = tolak (fail closed)
  }
}

export async function POST(req: NextRequest) {
  const env = getEnv();

  // 1. Origin & ukuran body
  const origin = req.headers.get("origin");
  if (origin !== new URL(env.NEXT_PUBLIC_SITE_URL).origin) return fail(403, "BAD_ORIGIN");
  if (!req.headers.get("content-type")?.startsWith("application/json")) return fail(415, "UNSUPPORTED_MEDIA_TYPE");

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, "PAYLOAD_TOO_LARGE");

  // 2. Rate limit per IP (IP di-hash; simpan hash saja)
  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip, env.IP_HASH_SECRET);
  const ipLimit = await rateLimit(`inq:ip:${ipHash}`, 8, 600, { durable: true });
  if (!ipLimit.allowed) return fail(429, "RATE_LIMITED", { "Retry-After": String(ipLimit.retryAfterSec) });

  // 3. Validasi
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "INVALID_JSON");
  }
  const parsed = inquirySchema.safeParse(json);
  if (!parsed.success) {
    const phoneBad = parsed.error.issues.some((i) => i.message === "INVALID_PHONE");
    return fail(422, phoneBad ? "INVALID_PHONE" : "VALIDATION_ERROR");
  }
  const input = parsed.data;

  // 4. Honeypot: pura-pura sukses agar bot tidak tahu ditolak
  if (input.website) return NextResponse.json({ code: "TR-000000-XXXX", waUrl: `https://wa.me/${env.WHATSAPP_NUMBER}` }, { status: 202 });

  // 5. Turnstile (batas per nomor dicek nanti, hanya untuk inquiry baru)
  if (!(await verifyTurnstile(input.turnstileToken, ip))) return fail(403, "CAPTCHA_FAILED");

  // 6. Produk: hanya kolom publik (costPrice TIDAK PERNAH dipilih)
  const product = await db.product.findFirst({
    where: { id: input.productId, status: "PUBLISHED", deletedAt: null },
    select: { id: true, nameId: true, nameEn: true, sku: true, sellPrice: true, availability: true },
  });
  if (!product) return fail(404, "PRODUCT_NOT_FOUND");
  if (product.availability === "SOLD_OUT") return fail(409, "PRODUCT_UNAVAILABLE");

  const productName = input.locale === "en" ? product.nameEn : product.nameId;
  const waNumber = env.WHATSAPP_NUMBER;

  // 7. Idempotensi: inquiry aktif untuk nomor+produk yang sama dalam 24 jam dipakai ulang
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const existing = await db.inquiry.findFirst({
    where: { phone: input.phone, productId: product.id, createdAt: { gte: since }, status: { in: ["NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED"] } },
    select: { code: true },
    orderBy: { createdAt: "desc" },
  });
  const makeUrl = (code: string) =>
    buildWhatsAppUrl({ number: waNumber, code, productName, sku: product.sku, price: product.sellPrice, variantNote: input.variantNote, area: input.area, locale: input.locale });
  if (existing) return NextResponse.json({ code: existing.code, waUrl: makeUrl(existing.code) }, { headers: { "Cache-Control": "no-store" } });

  // Batas inquiry BARU per nomor (klik ulang produk yang sama sudah ditangani di atas dan tidak dihitung).
  const phoneLimit = await rateLimit(`inq:phone:${hashIp(input.phone, env.IP_HASH_SECRET)}`, 5, 3600, { durable: true });
  if (!phoneLimit.allowed) return fail(429, "RATE_LIMITED", { "Retry-After": String(phoneLimit.retryAfterSec) });

  // 8. Simpan dengan snapshot harga; ulangi jika kode bentrok (unique)
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generateCode();
    try {
      const created = await db.inquiry.create({
        data: {
          code,
          customerName: input.name,
          phone: input.phone,
          area: input.area,
          variantNote: input.variantNote,
          locale: input.locale,
          productId: product.id,
          productSnapshot: { name: productName, sku: product.sku, price: product.sellPrice, availability: product.availability },
          ipHash,
          utm: input.utm ?? Prisma.JsonNull,
          events: { create: { type: "created", data: { source: "website" } } },
        },
        select: { id: true },
      });
      console.info(JSON.stringify({ evt: "inquiry.created", code, phone: maskPhone(input.phone), sku: product.sku }));
      // Notifikasi setelah respons terkirim; kegagalan kanal tidak mempengaruhi customer.
      after(() => notify(msgNewInquiry({ code, customerName: input.name, phone: input.phone, productName: product.nameId, area: input.area }, env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""), created.id)));
      return NextResponse.json({ code, waUrl: makeUrl(code) }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      console.error(JSON.stringify({ evt: "inquiry.error", message: e instanceof Error ? e.message : "unknown" }));
      return fail(500, "INTERNAL_ERROR");
    }
  }
  return fail(503, "TRY_AGAIN");
}
