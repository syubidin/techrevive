import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, trackStep, TRACK_STEP_COUNT, type TrackStatus } from "../src/lib/track.ts";

test("tahap pelanggan berurutan sesuai alur pesanan", () => {
  const order: TrackStatus[] = ["NEW", "CONTACTED", "AWAITING_PAYMENT", "PAID", "SHIPPED", "DELIVERED"];
  assert.deepEqual(order.map(trackStep), [0, 1, 2, 3, 4, 5]);
  assert.equal(TRACK_STEP_COUNT, 6);
});

test("status antara dipetakan ke tahap yang masuk akal", () => {
  assert.equal(trackStep("SUPPLIER_CHECKING"), 1);
  assert.equal(trackStep("QUOTED"), 1);
  assert.equal(trackStep("PROCURING"), 3);
  assert.equal(trackStep("RECEIVED_BY_US"), 3);
});

test("batal/kedaluwarsa tidak punya tahap aktif", () => {
  assert.equal(trackStep("CANCELLED"), -1);
  assert.equal(trackStep("EXPIRED"), -1);
});

test("kode dinormalkan dan divalidasi", () => {
  assert.equal(normalizeCode(" tr-261114-ab1c "), "TR-261114-AB1C");
  assert.equal(normalizeCode("TR-26111-ABCD"), null);
  assert.equal(normalizeCode("'; DROP TABLE"), null);
  assert.equal(normalizeCode(""), null);
});
