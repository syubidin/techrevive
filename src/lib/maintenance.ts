import { db } from "./db";
import { site } from "@/config/site";
import { sweepOrphanImages } from "./image-cleanup";
import { msgExpired, msgFollowUps, msgSlaBreach, notify } from "./notify";

const DONE = ["DELIVERED", "CANCELLED", "EXPIRED"] as const;

/** Penawaran lewat masa berlaku menjadi EXPIRED. Aman dipanggil berulang. */
export async function expireQuotes(now = new Date()): Promise<number> {
  const { count } = await db.inquiry.updateMany({ where: { status: "QUOTED", quoteExpiresAt: { lt: now } }, data: { status: "EXPIRED" } });
  return count;
}

export interface MaintenanceResult { expired: number; slaAlerts: number; followUps: number; notified: boolean; orphanImages?: number }

export async function runMaintenance(baseUrl: string, now = new Date()): Promise<MaintenanceResult> {
  const expired = await expireQuotes(now);

  // Inquiry baru yang belum disentuh melewati SLA: peringatkan sekali.
  const slaCutoff = new Date(now.getTime() - site.replySlaMinutes * 60_000);
  const late = await db.inquiry.findMany({
    where: { status: "NEW", createdAt: { lt: slaCutoff }, slaAlertedAt: null },
    select: { id: true, code: true, customerName: true, createdAt: true }, take: 20,
  });

  // Follow-up jatuh tempo yang belum diingatkan untuk jadwal tersebut.
  const due = await db.inquiry.findMany({
    where: { followUpAt: { lte: now }, status: { notIn: [...DONE] }, OR: [{ followUpNotifiedAt: null }, { followUpNotifiedAt: { lt: now } }] },
    select: { id: true, code: true, customerName: true, followUpAt: true, followUpNotifiedAt: true }, take: 30,
  });
  const dueFresh = due.filter((i) => !i.followUpNotifiedAt || (i.followUpAt && i.followUpNotifiedAt < i.followUpAt));

  let notified = false;
  if (late.length) {
    notified = (await notify(msgSlaBreach(late.map((i) => ({ code: i.code, customerName: i.customerName, minutes: Math.round((now.getTime() - i.createdAt.getTime()) / 60_000) })), site.replySlaMinutes, baseUrl))) || notified;
    await db.inquiry.updateMany({ where: { id: { in: late.map((i) => i.id) } }, data: { slaAlertedAt: now } });
  }
  if (dueFresh.length) {
    notified = (await notify(msgFollowUps(dueFresh, baseUrl))) || notified;
    await db.inquiry.updateMany({ where: { id: { in: dueFresh.map((i) => i.id) } }, data: { followUpNotifiedAt: now } });
  }
  if (expired > 0) notified = (await notify(msgExpired(expired))) || notified;

  const orphanImages = await sweepOrphanImages(now);
  return { expired, slaAlerts: late.length, followUps: dueFresh.length, notified, orphanImages };
}
