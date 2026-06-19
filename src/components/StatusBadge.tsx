import type { MatchStatus } from "../types/prode";
import { statusLabel } from "../utils/format";

interface StatusBadgeProps {
  status: MatchStatus;
}

const statusClasses: Record<MatchStatus, string> = {
  scheduled: "bg-stone-100 text-stone-700 ring-stone-200",
  live: "bg-rust/10 text-rust ring-rust/20",
  finished: "bg-field/10 text-field ring-field/20"
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
