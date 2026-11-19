import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TechRevive",
    short_name: "TechRevive",
    description: "Laptop, smartphone, dan gadget berkualitas, baru hingga refurbished.",
    start_url: "/",
    display: "standalone",
    background_color: "#07273E",
    theme_color: "#07273E",
    icons: [
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
