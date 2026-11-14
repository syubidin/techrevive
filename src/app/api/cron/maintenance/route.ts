import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { runMaintenance } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false; // tanpa CRON_SECRET endpoint mati (fail closed)
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  const env = getEnv();
  if (!authorized(req, env.CRON_SECRET)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await runMaintenance(env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  console.info(JSON.stringify({ evt: "cron.maintenance", ...result }));
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
