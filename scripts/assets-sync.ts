/**
 * Memindai public/assets, mencocokkan dengan ASSET_SPECS, menulis src/config/assets.generated.json.
 * Versi gelap aset bertema dibaca dari "<key>-dark.<ext>". Situs hanya menampilkan berkas yang ada.
 * Tidak pernah membuat build gagal; hanya mencetak peringatan.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { ASSET_SPECS, checkAsset, imageSize, type AssetSpec } from "../src/lib/asset-spec.ts";

type Info = { src: string; w: number; h: number };
const root = join(process.cwd(), "public", "assets");
const EXTS = ["webp", "png", "jpg", "svg"];
const out: Record<string, Info & { dark?: Info }> = {};
const warn: string[] = [];

function load(spec: AssetSpec, name: string): Info | null {
  const ext = EXTS.find((e) => existsSync(join(root, `${name}.${e}`)));
  if (!ext) return null;
  const buf = readFileSync(join(root, `${name}.${ext}`));
  const isSvg = ext === "svg";
  const info = isSvg ? { w: spec.w, h: spec.h } : imageSize(buf);
  for (const m of checkAsset(spec, info, buf.length, isSvg)) warn.push(`${name}: ${m}`);
  return info ? { src: `/assets/${name}.${ext}`, w: info.w, h: info.h } : null;
}

let found = 0, darkFound = 0;
const missingDark: string[] = [];
for (const s of ASSET_SPECS) {
  const light = load(s, s.key);
  if (!light) { if (s.themed && load(s, `${s.key}-dark`)) warn.push(`${s.key}-dark: ada versi gelap tapi versi terang belum ada`); continue; }
  found++;
  const entry: Info & { dark?: Info } = light;
  if (s.themed) {
    const dark = load(s, `${s.key}-dark`);
    if (dark) { entry.dark = dark; darkFound++; } else missingDark.push(s.key);
  }
  out[s.key] = entry;
}

const known = new Set(ASSET_SPECS.flatMap((s) => (s.themed ? [s.key, `${s.key}-dark`] : [s.key])));
function walk(dir: string) {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (n.startsWith(".")) continue;
    const rel = relative(root, p).replaceAll("\\", "/");
    const key = rel.slice(0, rel.length - extname(rel).length);
    if (!known.has(key) || !EXTS.includes(extname(rel).slice(1))) warn.push(`${rel}: tidak dikenal, nama atau format tidak sesuai daftar (diabaikan)`);
  }
}
walk(root);

writeFileSync(join(process.cwd(), "src", "config", "assets.generated.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Aset terang/utama: ${found}/${ASSET_SPECS.length}, versi gelap: ${darkFound}.`);
for (const s of ASSET_SPECS) if (!out[s.key]) console.log(`  - belum ada  ${s.key}`);
for (const k of missingDark) console.log(`  ~ belum ada versi gelap  ${k}-dark`);
for (const w of warn) console.log(`  ! ${w}`);
