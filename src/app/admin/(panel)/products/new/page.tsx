import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin";
import { BackLink } from "@/components/back-link";
import { ProductForm } from "../product-form";

export const metadata = { title: "Produk baru" };

export default async function NewProduct() {
  await requirePermission("product.manage");
  const [categories, brands, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { nameId: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!categories.length || !brands.length) {
    return <p className="card p-6 text-sm">Buat minimal satu kategori dan satu merk dulu di menu <a className="underline" href="/admin/taxonomy">Kategori & Spek</a>.</p>;
  }
  return (
    <div className="space-y-6">
      <div><BackLink href="/admin/products">Produk</BackLink><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Produk baru</h1></div>
      <ProductForm
        values={{ nameId: "", nameEn: "", descriptionId: "", descriptionEn: "", categoryId: categories[0].id, brandId: brands[0].id, supplierId: "", condition: "REFURBISHED", grade: "", batteryHealth: "", attributes: "", features: "", weightGram: 2500, stockQty: "", costPrice: 0, marginType: "PERCENT_BPS", marginInput: 10, availability: "CHECK", status: "DRAFT", images: "" }}
        categories={categories.map((c) => ({ id: c.id, name: c.nameId }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
