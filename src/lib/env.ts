import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32),
    IP_HASH_SECRET: z.string().min(32),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    WHATSAPP_NUMBER: z.string().regex(/^628\d{7,11}$/, "Format 628xxxxxxxxxx"),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Notifikasi (opsional): Telegram dan/atau webhook generik (Slack/Discord/n8n)
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
    NOTIFY_WEBHOOK_URL: z.string().url().optional(),
    // Rahasia untuk /api/cron/maintenance (wajib di production bila memakai cron)
    CRON_SECRET: z.string().min(24).optional(),
  })
  .refine((e) => e.NODE_ENV !== "production" || !!e.TURNSTILE_SECRET_KEY, {
    message: "TURNSTILE_SECRET_KEY wajib di production",
    path: ["TURNSTILE_SECRET_KEY"],
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Divalidasi saat pertama dipakai (bukan saat import) agar `next build` tidak gagal tanpa env. */
export function getEnv(): Env {
  if (!cached) {
    // Variabel yang dikosongkan (VAR="") di .env dianggap tidak diisi, bukan nilai yang salah.
    const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""));
    const result = schema.safeParse(present);
    if (!result.success) {
      const problems = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Konfigurasi .env tidak valid:\n${problems}\nPeriksa file .env (lihat .env.example).`);
    }
    cached = result.data;
  }
  return cached;
}
