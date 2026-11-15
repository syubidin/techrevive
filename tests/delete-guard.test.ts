import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeleteAdmin, canDeleteBrand, canDeleteCategory, canDeleteInquiry, canDeleteProduct } from "../src/lib/delete-guard.ts";
import { can } from "../src/lib/rbac.ts";

test("hanya Developer yang boleh ubah/hapus data master", () => {
  assert.equal(can("DEVELOPER", "data.manage"), true);
  assert.equal(can("OWNER", "data.manage"), false);
  assert.equal(can("STAFF", "data.manage"), false);
  assert.equal(can(null, "data.manage"), false);
});

test("inquiry berbayar tidak boleh dihapus", () => {
  assert.notEqual(canDeleteInquiry({ orderPaid: true }), null);
  assert.equal(canDeleteInquiry({ orderPaid: false }), null);
});

test("produk: harus diarsipkan dulu dan tidak punya inquiry", () => {
  assert.match(canDeleteProduct({ archived: false, inquiryCount: 0 }) ?? "", /Arsipkan/);
  assert.match(canDeleteProduct({ archived: true, inquiryCount: 3 }) ?? "", /3 inquiry/);
  assert.equal(canDeleteProduct({ archived: true, inquiryCount: 0 }), null);
});

test("kategori dan merk yang masih dipakai tidak boleh dihapus", () => {
  assert.match(canDeleteCategory({ products: 2 }) ?? "", /2 produk/);
  assert.equal(canDeleteCategory({ products: 0 }), null);
  assert.match(canDeleteBrand({ products: 1 }) ?? "", /1 produk/);
  assert.equal(canDeleteBrand({ products: 0 }), null);
});

test("akun: tidak boleh hapus diri sendiri atau Developer aktif terakhir", () => {
  assert.notEqual(canDeleteAdmin({ isSelf: true, targetRole: "STAFF", targetActive: true, otherActiveDevelopers: 2 }), null);
  assert.notEqual(canDeleteAdmin({ isSelf: false, targetRole: "DEVELOPER", targetActive: true, otherActiveDevelopers: 0 }), null);
  assert.equal(canDeleteAdmin({ isSelf: false, targetRole: "DEVELOPER", targetActive: true, otherActiveDevelopers: 1 }), null);
  assert.equal(canDeleteAdmin({ isSelf: false, targetRole: "STAFF", targetActive: true, otherActiveDevelopers: 0 }), null);
});
