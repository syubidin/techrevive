import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const rootMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "TechRevive — Second-hand Premium & Customizable", template: "%s · TechRevive" },
  description: "Laptop, HP, dan gadget second & refurbished dengan grade jujur. Lolos QC, garansi 1 bulan. Pesan via WhatsApp.",
  icons: {
    icon: [
      { url: "/brand/icon-light.png", type: "image/png", sizes: "128x128", media: "(prefers-color-scheme: light)" },
      { url: "/brand/icon-dark.png", type: "image/png", sizes: "128x128", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const rootViewport: Viewport = { themeColor: "#08203a", width: "device-width", initialScale: 1 };
