import type { MatchScore } from "../types/prode";

interface ScoreBadgeProps {
  score?: MatchScore;
}

const verdictConfig: Record<
  MatchScore["verdict"],
  {
    label: string;
    className: string;
  }
> = {
  hit: {
    label: "Acertó",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200"
  },
  miss: {
    label: "Falló",
    className: "bg-rose-100 text-rose-800 ring-rose-200"
  },
  pending: {
    label: "Pendiente",
    className: "bg-stone-100 text-stone-700 ring-stone-200"
  },
  live: {
    label: "En vivo",
    className: "bg-rust/10 text-rust ring-rust/25"
  },
  unmarked: {
    label: "Sin marcar",
    className: "bg-maize/15 text-amber-800 ring-maize/30"
  }
};

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (!score) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
        Fixture
      </span>
    );
  }

  const config = verdictConfig[score.verdict];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
    >
      {config.label}
      <strong className="tabular-nums">{score.points} pt</strong>
    </span>
  );
}
