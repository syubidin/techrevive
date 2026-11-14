import { maskPhone } from "./phone.ts";

/** Pesan notifikasi (fungsi murni, diuji). Nomor telepon selalu disamarkan. */
export interface InquiryInfo { code: string; customerName: string; phone: string; productName: string; area?: string | null }

export const msgNewInquiry = (i: InquiryInfo, baseUrl: string, id: string) =>
  `🆕 Inquiry baru ${i.code}\n${i.customerName} (${maskPhone(i.phone)})${i.area ? ` · ${i.area}` : ""}\n${i.productName}\n${baseUrl}/admin/inquiries/${id}`;

export const msgSlaBreach = (items: Array<{ code: string; customerName: string; minutes: number }>, sla: number, baseUrl: string) =>
  `⏰ ${items.length} inquiry belum dibalas > ${sla} menit:\n${items.map((x) => `• ${x.code} ${x.customerName} (${x.minutes} mnt)`).join("\n")}\n${baseUrl}/admin/inquiries?status=NEW`;

export const msgFollowUps = (items: Array<{ code: string; customerName: string }>, baseUrl: string) =>
  `📞 ${items.length} follow-up jatuh tempo:\n${items.map((x) => `• ${x.code} ${x.customerName}`).join("\n")}\n${baseUrl}/admin`;

export const msgExpired = (n: number) => `⌛ ${n} penawaran kedaluwarsa otomatis.`;

/** Kirim ke semua kanal yang dikonfigurasi. Tidak pernah melempar; mengembalikan true bila ada kanal yang berhasil. */
export async function notify(text: string): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN: tg, TELEGRAM_CHAT_ID: chat, NOTIFY_WEBHOOK_URL: hook } = process.env;
  const jobs: Array<Promise<Response>> = [];
  if (tg?.trim() && chat?.trim()) {
    jobs.push(fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }), signal: AbortSignal.timeout(5000),
    }));
  }
  if (hook?.trim()) {
    jobs.push(fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(5000) }));
  }
  if (jobs.length === 0) return false;
  const results = await Promise.allSettled(jobs);
  const ok = results.some((r) => r.status === "fulfilled" && r.value.ok);
  if (!ok) console.error(JSON.stringify({ evt: "notify.failed" }));
  return ok;
}
