/**
 * Seed awal: akun Admin/Developer pertama, zona ongkir Jabodetabek, kategori + definisi spek, beberapa merk.
 * Jalankan: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD='min 12 karakter' npm run db:seed
 * Tidak ada kata sandi bawaan: seed menolak jalan tanpa env tersebut. Idempotent (aman diulang).
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
// Akun pertama adalah Admin/Developer (satu-satunya peran yang bisa menambah akun dan mengubah peran).
const role = (process.env.SEED_ADMIN_ROLE ?? "DEVELOPER").toUpperCase();
if (!["DEVELOPER", "OWNER", "STAFF"].includes(role)) {
  console.error("SEED_ADMIN_ROLE harus DEVELOPER, OWNER, atau STAFF.");
  process.exit(1);
}
if (!email || !password || password.length < 12) {
  console.error("Set SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (min. 12 karakter).");
  process.exit(1);
}

await db.adminUser.upsert({
  where: { email },
  update: {},
  create: { email, name: role === "DEVELOPER" ? "Admin" : role === "OWNER" ? "Owner" : "Staff", role: role as "DEVELOPER" | "OWNER" | "STAFF", passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }) },
});

// Tarif contoh: SESUAIKAN dengan tarif kurir yang Anda pakai.
const zones = [
  { zone: "Jakarta", cities: ["jakarta pusat", "jakarta utara", "jakarta barat", "jakarta selatan", "jakarta timur"], baseFee: 15000, perKgFee: 5000, minDays: 1, maxDays: 2 },
  { zone: "Bodetabek", cities: ["bogor", "depok", "tangerang", "tangerang selatan", "bekasi"], baseFee: 20000, perKgFee: 7000, minDays: 1, maxDays: 3 },
];
for (const z of zones) await db.shippingRate.upsert({ where: { zone: z.zone }, update: {}, create: z });

type Spec = { key: string; labelId: string; labelEn: string; type: "NUMBER" | "ENUM" | "BOOLEAN"; unit?: string; options?: string[] };
const categories: Array<{ slug: string; nameId: string; nameEn: string; specs: Spec[] }> = [
  {
    slug: "laptop", nameId: "Laptop", nameEn: "Laptops",
    specs: [
      { key: "cpu_family", labelId: "Prosesor", labelEn: "Processor", type: "ENUM", options: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Apple M1", "Apple M2", "Apple M3"] },
      { key: "ram_gb", labelId: "RAM", labelEn: "RAM", type: "NUMBER", unit: "GB" },
      { key: "storage_gb", labelId: "Penyimpanan", labelEn: "Storage", type: "NUMBER", unit: "GB" },
      { key: "screen_inch", labelId: "Ukuran layar", labelEn: "Screen size", type: "NUMBER", unit: "inci" },
      { key: "dedicated_gpu", labelId: "GPU dedicated", labelEn: "Dedicated GPU", type: "BOOLEAN" },
      { key: "touchscreen", labelId: "Layar sentuh", labelEn: "Touchscreen", type: "BOOLEAN" },
    ],
  },
  {
    slug: "smartphone", nameId: "Smartphone", nameEn: "Smartphones",
    specs: [
      { key: "ram_gb", labelId: "RAM", labelEn: "RAM", type: "NUMBER", unit: "GB" },
      { key: "storage_gb", labelId: "Penyimpanan", labelEn: "Storage", type: "NUMBER", unit: "GB" },
      { key: "network", labelId: "Jaringan", labelEn: "Network", type: "ENUM", options: ["4G", "5G"] },
      { key: "esim", labelId: "Dukung eSIM", labelEn: "eSIM support", type: "BOOLEAN" },
    ],
  },
  { slug: "accessories", nameId: "Aksesori", nameEn: "Accessories", specs: [] },
];
for (const [i, c] of categories.entries()) {
  const cat = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { slug: c.slug, nameId: c.nameId, nameEn: c.nameEn, sortOrder: i } });
  for (const [j, s] of c.specs.entries()) {
    await db.specDefinition.upsert({
      where: { categoryId_key: { categoryId: cat.id, key: s.key } },
      update: {},
      create: { categoryId: cat.id, key: s.key, labelId: s.labelId, labelEn: s.labelEn, type: s.type, unit: s.unit ?? null, options: s.options ?? [], sortOrder: j },
    });
  }
}

for (const name of ["Lenovo", "Dell", "HP", "Asus", "Acer", "Apple", "Samsung", "Xiaomi"]) {
  const slug = name.toLowerCase();
  await db.brand.upsert({ where: { slug }, update: {}, create: { slug, name } });
}

console.log(`Seed selesai. Login admin: ${email}`);
await db.$disconnect();
