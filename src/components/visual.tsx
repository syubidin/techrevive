import Image, { getImageProps } from "next/image";
import { getAsset, type AssetFile } from "@/lib/assets";

type Props = {
  k: string;
  /** Versi khusus layar kecil (opsional; untuk aset yang sama di semua mode, mis. banner promo). */
  mobileK?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/**
 * Gambar dari public/assets. Tidak menampilkan apa pun bila berkasnya belum ada.
 * Versi gelap ("<key>-dark") dipakai otomatis saat mode gelap, sama seperti logo (BrandLogo). alt kosong = dekoratif.
 */
export function Visual({ k, mobileK, alt = "", sizes, priority, className }: Props) {
  const a = getAsset(k);
  if (!a) return null;
  const m = mobileK ? getAsset(mobileK) : null;
  if (!a.dark && !m) return <Image src={a.src} width={a.w} height={a.h} alt={alt} sizes={sizes} priority={priority} className={className} draggable={false} />;

  const props = (f: AssetFile) => getImageProps({ alt, sizes, priority, src: f.src, width: f.w, height: f.h }).props;
  const base = props(a);
  return (
    <picture>
      {a.dark && <source media="(prefers-color-scheme: dark)" srcSet={props(a.dark).srcSet} />}
      {m && <source media="(max-width: 767px)" srcSet={props(m).srcSet} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...base} className={className} draggable={false} />
    </picture>
  );
}
