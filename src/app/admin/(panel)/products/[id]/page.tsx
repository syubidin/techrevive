import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin";
import { ProductForm } from "../product-form";

export const metadata = { title: "Edit produk" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("product.manage");
  const { id } = await params;
  const p = await db.product.findFirst({ where: { id, deletedAt: null }, include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } } });
  if (!p) notFound();
  const [categories, brands, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { nameId: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  const attrs = Object.entries((p.attributes ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}=${typeof v === "boolean" ? (v ? "ya" : "tidak") : String(v)}`).join("\n");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Edit produk <span className="muted font-mono text-base">{p.sku}</span></h1>
      <ProductForm
        values={{
          id: p.id, nameId: p.nameId, nameEn: p.nameEn, descriptionId: p.descriptionId ?? "", descriptionEn: p.descriptionEn ?? "",
          categoryId: p.categoryId, brandId: p.brandId, supplierId: p.supplierId ?? "", condition: p.condition, grade: p.grade ?? "",
          batteryHealth: p.batteryHealth?.toString() ?? "", attributes: attrs, features: p.features.join(", "), weightGram: p.weightGram, stockQty: p.stockQty?.toString() ?? "",
          costPrice: p.costPrice, marginType: p.marginType, marginInput: p.marginType === "PERCENT_BPS" ? p.marginValue / 100 : p.marginValue,
          availability: p.availability, status: p.status, images: p.images.map((i) => i.url).join("\n"),
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.nameId }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
