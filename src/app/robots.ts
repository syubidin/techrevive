import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * Mesin pencari dan crawler AI (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, dll.) boleh membaca halaman publik
 * agar TechRevive bisa dikutip. Area admin, API, serta halaman pribadi (lacak pesanan, invoice) tertutup untuk semua.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/id/invoice/", "/en/invoice/", "/id/track", "/en/track"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
