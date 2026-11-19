import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Detak aktivitas dari browser admin yang sedang dipakai: memperbarui batas diam (lewat middleware) dan memastikan akun masih aktif. */
export async function GET() {
  const me = await getAdminOrNull();
  if (!me) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return new NextResponse(null, { status: 204 });
}
