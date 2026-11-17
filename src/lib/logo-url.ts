import { z } from "zod";

/** URL logo merk: kosong (tanpa logo) atau https, dan bila IMAGE_HOST diatur harus dari host itu. */
export const logoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      const u = new URL(v);
      const host = process.env.IMAGE_HOST?.trim();
      if (u.protocol !== "https:" || (host && u.hostname !== host)) throw new Error("bad");
      return v;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL logo tidak valid" });
      return z.NEVER;
    }
  });
