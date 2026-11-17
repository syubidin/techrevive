import type { NextConfig } from "next";

const imageHost = process.env.IMAGE_HOST; // mis. cdn.techrevive.com (Cloudflare R2 / custom domain)

const config: NextConfig = {
  output: "standalone", // image Docker kecil untuk VPS
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "3mb" } }, // impor produk CSV/Excel
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageHost ? [{ protocol: "https", hostname: imageHost }] : [],
  },
  async headers() {
    // CSP dengan nonce diset di middleware; header statis di sini.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default config;
