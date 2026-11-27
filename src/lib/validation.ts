import { z } from "zod";
import { normalizeIdPhone } from "./phone";
import { JABODETABEK_CITIES } from "./shipping";

export const inquirySchema = z.object({
  productId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .max(25)
    .transform((v, ctx) => {
      const n = normalizeIdPhone(v);
      if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "INVALID_PHONE" });
      return n ?? "";
    }),
  area: z.enum(JABODETABEK_CITIES).optional(),
  variantNote: z.string().trim().max(200).optional(),
  locale: z.enum(["id", "en"]).default("id"),
  turnstileToken: z.string().max(2048).optional(),
  /** Honeypot: harus kosong. Bot biasanya mengisi semua field. */
  website: z.string().max(200).optional(),
  utm: z
    .object({
      source: z.string().max(60).optional(),
      medium: z.string().max(60).optional(),
      campaign: z.string().max(80).optional(),
    })
    .optional(),
});

