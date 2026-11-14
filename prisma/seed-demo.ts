/**
 * PRODUK CONTOH UNTUK DEMO. Semua data (nama, spek, harga, modal) adalah fiktif dan bukan stok nyata.
 * Seluruh SKU diawali "DEMO-" supaya mudah dikenali dan dihapus.
 *
 *   npm run db:seed:demo          -> tambah/refresh produk demo (aman diulang)
 *   npm run db:seed:demo -- remove -> hapus semua produk demo
 *
 * JANGAN jalankan di database production yang sudah berisi produk asli.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { computeSellPrice } from "../src/lib/pricing.ts";

const db = new PrismaClient();

if (process.argv.includes("remove")) {
  const { count } = await db.product.deleteMany({ where: { sku: { startsWith: "DEMO-" }, inquiries: { none: {} } } });
  console.log(`Dihapus ${count} produk demo (yang sudah punya inquiry dilewati).`);
  await db.$disconnect();
  process.exit(0);
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

type Demo = {
  sku: string; slug: string; cat: "laptop" | "smartphone" | "accessories"; brand: string;
  nameId: string; nameEn: string; descId: string; descEn: string;
  condition: "REFURBISHED" | "USED"; grade: "A" | "B" | "C"; battery?: number; weight: number;
  attrs: Record<string, string | number | boolean>; features: string[];
  cost: number; marginBps: number; availability: "CHECK" | "VERIFIED" | "PREORDER"; verifiedHoursAgo?: number;
};

const demos: Demo[] = [
  { sku: "DEMO-LTP-001", slug: "demo-lenovo-thinkpad-t14-gen2", cat: "laptop", brand: "lenovo",
    nameId: "Lenovo ThinkPad T14 Gen 2 (Contoh)", nameEn: "Lenovo ThinkPad T14 Gen 2 (Sample)",
    descId: "Data contoh untuk demo. Laptop bisnis tangguh dengan keyboard nyaman.", descEn: "Sample data for demo. Rugged business laptop with a great keyboard.",
    condition: "REFURBISHED", grade: "A", battery: 92, weight: 1700,
    attrs: { cpu_family: "Core i5", ram_gb: 16, storage_gb: 512, screen_inch: 14, dedicated_gpu: false, touchscreen: false },
    features: ["backlit-keyboard", "fingerprint", "usb-c"], cost: 6_400_000, marginBps: 1100, availability: "VERIFIED", verifiedHoursAgo: 3 },
  { sku: "DEMO-LTP-002", slug: "demo-dell-latitude-7420", cat: "laptop", brand: "dell",
    nameId: "Dell Latitude 7420 (Contoh)", nameEn: "Dell Latitude 7420 (Sample)",
    descId: "Data contoh untuk demo. Ringkas dan ringan untuk mobilitas tinggi.", descEn: "Sample data for demo. Slim and light for people on the move.",
    condition: "USED", grade: "B", battery: 84, weight: 1400,
    attrs: { cpu_family: "Core i7", ram_gb: 16, storage_gb: 256, screen_inch: 14, dedicated_gpu: false, touchscreen: true },
    features: ["touchscreen", "backlit-keyboard", "usb-c"], cost: 5_900_000, marginBps: 1000, availability: "CHECK" },
  { sku: "DEMO-LTP-003", slug: "demo-asus-vivobook-15", cat: "laptop", brand: "asus",
    nameId: "Asus VivoBook 15 (Contoh)", nameEn: "Asus VivoBook 15 (Sample)",
    descId: "Data contoh untuk demo. Cocok untuk kuliah dan kerja harian.", descEn: "Sample data for demo. Great for study and everyday work.",
    condition: "USED", grade: "B", battery: 78, weight: 1800,
    attrs: { cpu_family: "Ryzen 5", ram_gb: 8, storage_gb: 512, screen_inch: 15.6, dedicated_gpu: false, touchscreen: false },
    features: ["backlit-keyboard"], cost: 3_700_000, marginBps: 1200, availability: "CHECK" },
  { sku: "DEMO-LTP-004", slug: "demo-macbook-air-m1", cat: "laptop", brand: "apple",
    nameId: "MacBook Air M1 (Contoh)", nameEn: "MacBook Air M1 (Sample)",
    descId: "Data contoh untuk demo. Baterai awet dan performa kencang.", descEn: "Sample data for demo. Long battery life and fast performance.",
    condition: "REFURBISHED", grade: "A", battery: 89, weight: 1300,
    attrs: { cpu_family: "Apple M1", ram_gb: 8, storage_gb: 256, screen_inch: 13.3, dedicated_gpu: false, touchscreen: false },
    features: ["backlit-keyboard", "fingerprint", "usb-c"], cost: 8_800_000, marginBps: 900, availability: "PREORDER" },
  { sku: "DEMO-LTP-005", slug: "demo-hp-zbook-gaming", cat: "laptop", brand: "hp",
    nameId: "HP ZBook Workstation (Contoh)", nameEn: "HP ZBook Workstation (Sample)",
    descId: "Data contoh untuk demo. Workstation dengan GPU dedicated untuk desain dan editing.", descEn: "Sample data for demo. Workstation with dedicated GPU for design and editing.",
    condition: "USED", grade: "C", battery: 70, weight: 2300,
    attrs: { cpu_family: "Core i7", ram_gb: 32, storage_gb: 1000, screen_inch: 15.6, dedicated_gpu: true, touchscreen: false },
    features: ["backlit-keyboard", "numpad"], cost: 7_200_000, marginBps: 1200, availability: "CHECK" },
  { sku: "DEMO-PHN-001", slug: "demo-iphone-12-128gb", cat: "smartphone", brand: "apple",
    nameId: "iPhone 12 128GB (Contoh)", nameEn: "iPhone 12 128GB (Sample)",
    descId: "Data contoh untuk demo. Layar OLED dan kamera andal.", descEn: "Sample data for demo. OLED display and dependable cameras.",
    condition: "REFURBISHED", grade: "A", battery: 88, weight: 300,
    attrs: { ram_gb: 4, storage_gb: 128, network: "5G", esim: true },
    features: ["face-id", "wireless-charging"], cost: 4_900_000, marginBps: 1000, availability: "VERIFIED", verifiedHoursAgo: 20 },
  { sku: "DEMO-PHN-002", slug: "demo-samsung-galaxy-s21", cat: "smartphone", brand: "samsung",
    nameId: "Samsung Galaxy S21 (Contoh)", nameEn: "Samsung Galaxy S21 (Sample)",
    descId: "Data contoh untuk demo. Layar 120Hz dan performa responsif.", descEn: "Sample data for demo. 120Hz display and responsive performance.",
    condition: "USED", grade: "B", battery: 82, weight: 300,
    attrs: { ram_gb: 8, storage_gb: 256, network: "5G", esim: true },
    features: ["wireless-charging", "fingerprint"], cost: 3_600_000, marginBps: 1100, availability: "CHECK" },
  { sku: "DEMO-ACC-001", slug: "demo-usb-c-dock-8in1", cat: "accessories", brand: "lenovo",
    nameId: "USB-C Dock 8-in-1 (Contoh)", nameEn: "USB-C Dock 8-in-1 (Sample)",
    descId: "Data contoh untuk demo. HDMI, USB-A, SD card, dan pengisian daya.", descEn: "Sample data for demo. HDMI, USB-A, SD card, and pass-through charging.",
    condition: "USED", grade: "A", weight: 250,
    attrs: {}, features: ["usb-c", "hdmi"], cost: 350_000, marginBps: 1500, availability: "CHECK" },
];

const categories = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
const brands = new Map((await db.brand.findMany()).map((b) => [b.slug, b.id]));
if (!categories.size || !brands.size) {
  console.error("Kategori/merk belum ada. Jalankan dulu: npm run db:seed");
  process.exit(1);
}

for (const d of demos) {
  const categoryId = categories.get(d.cat);
  const brandId = brands.get(d.brand);
  if (!categoryId || !brandId) { console.warn(`Lewati ${d.sku}: kategori/merk tidak ditemukan`); continue; }

  const sellPrice = computeSellPrice({ costPrice: d.cost, marginType: "PERCENT_BPS", marginValue: d.marginBps });
  const data: Prisma.ProductUncheckedCreateInput = {
    slug: d.slug, sku: d.sku, nameId: d.nameId, nameEn: d.nameEn, descriptionId: d.descId, descriptionEn: d.descEn,
    categoryId, brandId, condition: d.condition, grade: d.grade, batteryHealth: d.battery ?? null,
    attributes: d.attrs, features: d.features, weightGram: d.weight,
    costPrice: d.cost, marginType: "PERCENT_BPS", marginValue: d.marginBps, sellPrice,
    availability: d.availability, verifiedAt: d.verifiedHoursAgo !== undefined ? hoursAgo(d.verifiedHoursAgo) : null,
    status: "PUBLISHED",
  };
  const { sku: _sku, ...update } = data;
  await db.product.upsert({ where: { sku: d.sku }, update, create: data });
}

console.log(`Produk demo siap: ${demos.length} item (semua SKU diawali DEMO-). Hapus dengan: npm run db:seed:demo -- remove`);
await db.$disconnect();
