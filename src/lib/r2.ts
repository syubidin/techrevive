import { createHash, createHmac } from "node:crypto";

/** Penandatanganan AWS SigV4 (header) tanpa SDK, untuk Cloudflare R2 (S3-compatible, region "auto"). */
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();
const sha256hex = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");

export function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), "aws4_request");
}

export interface SignInput {
  method: string;
  host: string;
  path: string;        // sudah di-encode, diawali "/"
  query?: string;      // sudah terurut & ter-encode
  headers: Record<string, string>; // header tambahan yang ikut ditandatangani (huruf kecil), mis. content-type
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  amzDate: string;     // YYYYMMDDTHHMMSSZ
}

export function signRequest(i: SignInput): { authorization: string; signature: string; signedHeaders: string } {
  const headers: Record<string, string> = { ...i.headers, host: i.host, "x-amz-date": i.amzDate };
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim()}\n`).join("");
  const signedHeaders = names.join(";");
  const canonical = [i.method, i.path, i.query ?? "", canonicalHeaders, signedHeaders, i.payloadHash].join("\n");
  const date = i.amzDate.slice(0, 8);
  const scope = `${date}/${i.region}/${i.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", i.amzDate, scope, sha256hex(canonical)].join("\n");
  const signature = createHmac("sha256", signingKey(i.secretAccessKey, date, i.region, i.service)).update(toSign).digest("hex");
  return { signature, signedHeaders, authorization: `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
}

export interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

export function r2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID?.trim(), accessKeyId = env.R2_ACCESS_KEY_ID?.trim(), secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim(), bucket = env.R2_BUCKET?.trim();
  return accountId && accessKeyId && secretAccessKey && bucket ? { accountId, accessKeyId, secretAccessKey, bucket } : null;
}

/** Unggah objek ke R2. Melempar Error bila gagal. */
export async function putObject(cfg: R2Config, key: string, body: Uint8Array, contentType: string, now = new Date()): Promise<void> {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const payloadHash = sha256hex(body);
  const { authorization } = signRequest({
    method: "PUT", host, path, payloadHash, amzDate, region: "auto", service: "s3",
    accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey,
    headers: { "content-type": contentType, "x-amz-content-sha256": payloadHash, "cache-control": "public, max-age=31536000, immutable" },
  });
  const res = await fetch(`https://${host}${path}`, {
    method: "PUT", body: body as unknown as BodyInit, signal: AbortSignal.timeout(20_000),
    headers: { "content-type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, "cache-control": "public, max-age=31536000, immutable", authorization },
  });
  if (!res.ok) throw new Error(`R2 PUT gagal (${res.status})`);
}
