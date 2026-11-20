import { test } from "node:test";
import assert from "node:assert/strict";
import { msgAssigned, msgNewClaim, msgFollowUps, msgNewInquiry, msgSlaBreach, notify } from "../src/lib/notify.ts";

test("notifikasi inquiry baru menyamarkan nomor telepon", () => {
  const m = msgNewInquiry({ code: "TR-261114-ABCD", customerName: "Budi", phone: "6281234567890", productName: "ThinkPad T14", area: "Bekasi" }, "https://x.id", "abc");
  assert.ok(m.includes("TR-261114-ABCD") && m.includes("ThinkPad T14") && m.includes("https://x.id/admin/inquiries/abc"));
  assert.equal(m.includes("6281234567890"), false);
});

test("pesan SLA dan follow-up memuat daftar", () => {
  assert.match(msgSlaBreach([{ code: "A", customerName: "B", minutes: 20 }], 15, "https://x.id"), /> 15 menit[\s\S]*A B \(20 mnt\)/);
  assert.match(msgFollowUps([{ code: "A", customerName: "B" }, { code: "C", customerName: "D" }], "https://x.id"), /2 follow-up/);
});

test("tanpa kanal terkonfigurasi notify tidak melempar dan mengembalikan false", async () => {
  delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.NOTIFY_WEBHOOK_URL;
  assert.equal(await notify("tes"), false);
});

test("pesan klaim dan penugasan memuat tautan admin tanpa data pribadi", () => {
  const c = msgNewClaim({ code: "CL-261119-ABCD", inquiryCode: "TR-261114-ABCD", customerName: "Budi" }, "https://x.id", "c1");
  assert.ok(c.includes("CL-261119-ABCD") && c.includes("https://x.id/admin/claims/c1"));
  const a = msgAssigned("TR-261114-ABCD", "Sari", "inquiry", "https://x.id", "i1");
  assert.ok(a.includes("Sari") && a.includes("https://x.id/admin/inquiries/i1"));
  assert.ok(msgAssigned("CL-1", "Sari", "klaim", "https://x.id", "c1").includes("/admin/claims/c1"));
});
