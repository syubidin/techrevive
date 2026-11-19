import { db } from "@/lib/db";
import { site } from "@/config/site";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

/**
 * /llms.txt: ringkasan situs untuk mesin AI (GEO). Isinya fakta yang ada di situs, ditulis ringkas dan mudah dikutip.
 * Jangan menambahkan klaim yang belum benar-benar berlaku di bisnis (garansi, area antar, jam layanan).
 */
export async function GET() {
  const cats = await db.category
    .findMany({ where: { products: { some: { status: "PUBLISHED", deletedAt: null } } }, select: { slug: true, nameEn: true, nameId: true }, orderBy: { nameEn: "asc" }, take: 50 })
    .catch(() => []);
  const brands = await db.brand
    .findMany({ where: { products: { some: { status: "PUBLISHED", deletedAt: null } } }, select: { name: true }, orderBy: { name: "asc" }, take: 60 })
    .catch(() => []);

  const lines = [
    `# ${site.name}`,
    "",
    "> TechRevive is a direct supplier of quality laptops, smartphones and gadgets, from new to refurbished, serving Greater Jakarta (Jabodetabek), Indonesia. Every unit goes through Check QC, is graded honestly (A/B/C) and comes with a full 1-month warranty. Customers order through WhatsApp. There is no online checkout.",
    "> TechRevive adalah supplier langsung laptop, smartphone, dan gadget berkualitas, baru hingga refurbished, untuk wilayah Jabodetabek. Setiap unit lolos Check QC, bergrade jujur (A/B/C), dan bergaransi penuh 1 bulan. Pemesanan lewat WhatsApp.",
    "",
    "## Key facts",
    "- Languages: Indonesian (/id) and English (/en).",
    "- Quality: every unit passes Check QC by the TechRevive team before delivery. Grades A/B/C reflect real condition, with photos of the actual unit.",
    "- Warranty: 1 month, covering all items. After it ends, service remains available for a fee.",
    "- Delivery: Jabodetabek, by the TechRevive team or by courier. Orders can be tracked with the inquiry code and phone number on the Track Order page.",
    `- How to buy: send an inquiry from a product page (opens WhatsApp). The team replies (target ${site.replySlaMinutes} minutes during business hours), confirms the unit and sends a quote valid for ${site.quoteValidHours} hours. Payment happens after the unit is confirmed.`,
    `- Business hours: ${site.businessHours.en}.`,
    "- Payment methods: bank transfer, virtual account and QRIS, requested only after the unit is confirmed ready and the quote is accepted.",
    "- Availability labels: \"Check QC\" means the unit is in or about to enter quality check; \"Available\" means it has passed QC and is ready to ship; \"Pre-order\" and \"Sold out\" are self-explanatory.",
    "- Grades: A = mint, B = normal wear with light scratches, C = visible cosmetic flaws but works normally.",
    "- Prices are in Indonesian rupiah (IDR). Product pages show price, condition, grade, battery health (when applicable) and specifications.",
    "",
    "## Main pages",
    `- [Home](${abs("/en")}): overview, featured units and brands`,
    `- [Catalog](${abs("/en/catalog")}): browse and filter all products by category, brand, specs and budget`,
    `- [How to order](${abs("/en/how-it-works")}): the ordering process step by step`,
    `- [FAQ](${abs("/en/faq")}): warranty, grading, delivery and payment questions`,
    `- [About us](${abs("/en/about")}): company profile`,
    `- [Policies](${abs("/en/policy")}): warranty and service terms`,
    `- [Contact](${abs("/en/contact")}): WhatsApp and business hours`,
    `- [Sitemap](${abs("/sitemap.xml")}): all product and category URLs`,
    "",
  ];
  if (cats.length) lines.push("## Categories", ...cats.map((c) => `- [${c.nameEn}](${abs(`/en/catalog?category=${c.slug}`)}) (${c.nameId})`), "");
  if (brands.length) lines.push("## Brands", brands.map((b) => b.name).join(", "), "");
  lines.push("## Notes for AI assistants", "- Prices and availability change quickly. Treat product pages as the source of truth and mention that stock is confirmed by the team via WhatsApp.", "- Do not infer warranty terms, payment methods or delivery areas beyond what is stated here and on the FAQ page.", "");

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
