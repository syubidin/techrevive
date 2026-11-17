import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { can, getAdminOrNull } from "@/lib/admin";
import { getEnv } from "@/lib/env";
import { hasAlpha, sniffImage } from "@/lib/image-sniff";
import { cloudinaryConfig, uploadToCloudinary } from "@/lib/cloudinary";
import { putObject, r2Config } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_BYTES = 1024 * 1024;
const err = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const env = getEnv();
  if (req.headers.get("origin") !== new URL(env.NEXT_PUBLIC_SITE_URL).origin) return err(403, "BAD_ORIGIN");
  const me = await getAdminOrNull();
  if (!me) return err(401, "UNAUTHORIZED");
  if (!can(me.role, "upload.image")) return err(403, "FORBIDDEN");

  // Penyimpanan: Cloudinary (gratis tanpa kartu kredit) bila diatur, jika tidak Cloudflare R2.
  const cld = cloudinaryConfig();
  const cfg = r2Config();
  const host = process.env.IMAGE_HOST?.trim();
  if (!cld && (!cfg || !host)) return err(503, "UPLOAD_NOT_CONFIGURED");

  const limit = await rateLimit(`upload:${me.id}`, 30, 600);
  if (!limit.allowed) return err(429, "RATE_LIMITED");

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) return err(413, "TOO_LARGE");

  let file: FormDataEntryValue | null;
  let kindRaw: FormDataEntryValue | null;
  try { const fd = await req.formData(); file = fd.get("file"); kindRaw = fd.get("kind"); } catch { return err(400, "INVALID_BODY"); }
  const kind = kindRaw === "logo" ? "logo" : "product";
  if (!(file instanceof File)) return err(400, "NO_FILE");
  if (file.size === 0 || file.size > (kind === "logo" ? MAX_LOGO_BYTES : MAX_BYTES)) return err(413, "TOO_LARGE");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return err(415, "UNSUPPORTED_TYPE"); // hanya JPG/PNG/WebP asli
  // Logo wajib benar-benar transparan agar menyatu dengan latar kartu (marquee).
  if (kind === "logo" && !hasAlpha(bytes, type)) return err(422, "NOT_TRANSPARENT");

  if (cld) {
    try { return NextResponse.json({ url: await uploadToCloudinary(cld, bytes, type.mime, kind) }, { headers: { "Cache-Control": "no-store" } }); } catch (e) {
      console.error(JSON.stringify({ evt: "upload.failed", provider: "cloudinary", message: e instanceof Error ? e.message : "unknown" }));
      return err(502, "STORAGE_ERROR");
    }
  }
  const key = `${kind === "logo" ? "brands" : "products"}/${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${type.ext}`;
  try { await putObject(cfg!, key, bytes, type.mime); } catch (e) {
    console.error(JSON.stringify({ evt: "upload.failed", message: e instanceof Error ? e.message : "unknown" }));
    return err(502, "STORAGE_ERROR");
  }
  return NextResponse.json({ url: `https://${host}/${key}` }, { headers: { "Cache-Control": "no-store" } });
}
