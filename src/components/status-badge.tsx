import type { InquiryStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/inquiry-status";

const TONE: Record<InquiryStatus, string> = {
  NEW: "chip-tone-info",
  CONTACTED: "chip-tone-info",
  SUPPLIER_CHECKING: "chip-tone-warn",
  QUOTED: "chip-tone-warn",
  AWAITING_PAYMENT: "chip-tone-warn",
  PAID: "chip-tone-ok",
  PROCURING: "chip-tone-ok",
  RECEIVED_BY_US: "chip-tone-ok",
  SHIPPED: "chip-tone-ok",
  DELIVERED: "chip-tone-ok",
  CANCELLED: "chip-tone-bad",
  EXPIRED: "chip-tone-mute",
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`chip ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}
