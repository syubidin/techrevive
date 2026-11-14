export interface WhatsAppInput {
  number: string; // 628xxxxxxxxxx
  code: string;
  productName: string;
  sku: string;
  price: number;
  variantNote?: string | null;
  area?: string | null;
  locale: "id" | "en";
}

/** Buang karakter kontrol & rapikan spasi; teks user tidak boleh merusak format pesan. */
export function sanitizeText(value: string, max = 200): string {
  return value
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const formatIdr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function buildWhatsAppUrl(i: WhatsAppInput): string {
  const lines =
    i.locale === "en"
      ? [
          "Hello TechRevive, I'm interested in this product:",
          `Inquiry code: ${i.code}`,
          `Product: ${sanitizeText(i.productName, 120)}`,
          `SKU: ${i.sku}`,
          `Listed price: ${formatIdr(i.price)}`,
          i.variantNote ? `Variant/notes: ${sanitizeText(i.variantNote)}` : null,
          i.area ? `Delivery area: ${sanitizeText(i.area, 60)}` : null,
          "Is it available? Please confirm final price, condition, and estimated delivery.",
        ]
      : [
          "Halo TechRevive, saya tertarik dengan produk berikut:",
          `Kode inquiry: ${i.code}`,
          `Produk: ${sanitizeText(i.productName, 120)}`,
          `SKU: ${i.sku}`,
          `Harga tertera: ${formatIdr(i.price)}`,
          i.variantNote ? `Varian/catatan: ${sanitizeText(i.variantNote)}` : null,
          i.area ? `Area pengiriman: ${sanitizeText(i.area, 60)}` : null,
          "Apakah stoknya tersedia? Mohon info harga final, kondisi barang, dan estimasi pengiriman.",
        ];
  const text = lines.filter(Boolean).join("\n");
  return `https://wa.me/${i.number}?text=${encodeURIComponent(text)}`;
}
