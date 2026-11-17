import type { Metadata } from "next";
import { jakarta, rootViewport } from "@/lib/root";
import "../globals.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin TechRevive" }, robots: { index: false, follow: false }, icons: { icon: [{ url: "/admin-icon.svg", type: "image/svg+xml" }], shortcut: "/admin-icon.svg" } };
export const viewport = rootViewport;

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
