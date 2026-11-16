import { test } from "node:test";
import assert from "node:assert/strict";
import { activeFilterCount, buildFilterChips } from "../src/lib/filter-chips.ts";

const sp = (s: string) => new URLSearchParams(s);

test("tanpa filter: tidak ada chip, urutan & halaman diabaikan", () => {
  assert.equal(buildFilterChips(sp("sort=price_asc&page=3")).length, 0);
});

test("nilai dipisah koma menjadi chip terpisah dan menghapus satu menyisakan sisanya", () => {
  const chips = buildFilterChips(sp("brand=lenovo,dell&sort=newest"));
  assert.deepEqual(chips.map((c) => c.id), ["brand:lenovo", "brand:dell"]);
  assert.equal(chips[0].rest, "brand=dell&sort=newest");
  assert.equal(chips[1].rest, "brand=lenovo&sort=newest");
});

test("menghapus chip membuang halaman agar kembali ke 1", () => {
  const [c] = buildFilterChips(sp("grade=A&page=4"));
  assert.equal(c.rest, "");
});

test("pencarian dan harga adalah chip tunggal", () => {
  const chips = buildFilterChips(sp("q=thinkpad&minPrice=3000000&maxPrice=8000000"));
  assert.deepEqual(chips.map((c) => c.kind), ["q", "minPrice", "maxPrice"]);
  assert.equal(chips[0].rest, "minPrice=3000000&maxPrice=8000000");
});

test("filter spek dihitung dan bisa dihapus per nilai", () => {
  const chips = buildFilterChips(sp("category=laptop&s.cpu_family=i7,i5"));
  assert.equal(activeFilterCount(sp("category=laptop&s.cpu_family=i7,i5")), 3);
  const i7 = chips.find((c) => c.id === "s.cpu_family:i7")!;
  assert.equal(i7.rest, "category=laptop&s.cpu_family=i5");
});

test("nilai duplikat hanya satu chip", () => {
  assert.equal(buildFilterChips(sp("brand=asus&brand=asus")).length, 1);
});
