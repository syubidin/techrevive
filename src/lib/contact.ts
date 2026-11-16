import { site } from "@/config/site";

/** Nomor WhatsApp bisnis (env WHATSAPP_NUMBER, cadangan placeholder). Tidak melempar error saat build. */
export const waNumber = () => process.env.WHATSAPP_NUMBER?.trim() || site.placeholderWhatsApp;

export const waLink = (text?: string) => `https://wa.me/${waNumber()}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
