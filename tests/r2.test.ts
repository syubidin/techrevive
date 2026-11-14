import { test } from "node:test";
import assert from "node:assert/strict";
import { signRequest, signingKey } from "../src/lib/r2.ts";
import { sniffImage } from "../src/lib/image-sniff.ts";

// Vektor resmi dokumentasi AWS SigV4 (contoh IAM ListUsers).
test("kunci penandatanganan sesuai vektor AWS", () => {
  assert.equal(signingKey("wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20150830", "us-east-1", "iam").toString("hex"),
    "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9");
});

test("tanda tangan sesuai vektor AWS (GET ListUsers)", () => {
  const r = signRequest({
    method: "GET", host: "iam.amazonaws.com", path: "/", query: "Action=ListUsers&Version=2010-05-08",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    region: "us-east-1", service: "iam", amzDate: "20150830T123600Z",
  });
  assert.equal(r.signature, "5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
  assert.equal(r.signedHeaders, "content-type;host;x-amz-date");
});

test("deteksi gambar lewat magic bytes", () => {
  assert.equal(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0]))?.ext, "jpg");
  assert.equal(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext, "png");
  assert.equal(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))?.ext, "webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a")), null);
});
