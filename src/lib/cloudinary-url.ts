/** Sisipkan transformasi pengiriman (ukuran/format otomatis) pada URL Cloudinary; URL lain dikembalikan apa adanya. Aman dipakai di browser. */
export function deliveryUrl(url: string, transform: string): string {
  return url.startsWith("https://res.cloudinary.com/") ? url.replace("/image/upload/", `/image/upload/${transform}/`) : url;
}
