import { CLAIM_LABEL, type ClaimStatus } from "@/lib/claim-flow";

const TONE: Record<ClaimStatus, string> = {
  SUBMITTED: "chip-tone-info", REVIEWING: "chip-tone-info", APPROVED: "chip-tone-ok", IN_SERVICE: "chip-tone-warn",
  READY: "chip-tone-ok", RESOLVED: "chip-tone-ok", REJECTED: "chip-tone-bad", CANCELLED: "chip-tone-mute",
};

export function ClaimBadge({ status }: { status: ClaimStatus }) {
  return <span className={`chip ${TONE[status]}`}>{CLAIM_LABEL[status]}</span>;
}
