import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { can, getAdminOrNull } from "@/lib/admin";
import { getEnv } from "@/lib/env";
import { sniffImage } from "@/lib/image-sniff";
import { putObject, r2Config } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const err = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const env = getEnv();
  if (req.headers.get("origin") !== new URL(env.NEXT_PUBLIC_SITE_URL).origin) return err(403, "BAD_ORIGIN");
  const me = await getAdminOrNull();
  if (!me) return err(401, "UNAUTHORIZED");
  if (!can(me.role, "upload.image")) return err(403, "FORBIDDEN");

  const cfg = r2Config();
  const host = process.env.IMAGE_HOST?.trim();
  if (!cfg || !host) return err(503, "UPLOAD_NOT_CONFIGURED");

  const limit = await rateLimit(`upload:${me.id}`, 30, 600);
  if (!limit.allowed) return err(429, "RATE_LIMITED");

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) return err(413, "TOO_LARGE");

  let file: FormDataEntryValue | null;
  try { file = (await req.formData()).get("file"); } catch { return err(400, "INVALID_BODY"); }
  if (!(file instanceof File)) return err(400, "NO_FILE");
  if (file.size === 0 || file.size > MAX_BYTES) return err(413, "TOO_LARGE");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return err(415, "UNSUPPORTED_TYPE"); // hanya JPG/PNG/WebP asli

  const key = `products/${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${type.ext}`;
  try { await putObject(cfg, key, bytes, type.mime); } catch (e) {
    console.error(JSON.stringify({ evt: "upload.failed", message: e instanceof Error ? e.message : "unknown" }));
    return err(502, "STORAGE_ERROR");
  }
  return NextResponse.json({ url: `https://${host}/${key}` }, { headers: { "Cache-Control": "no-store" } });
}
