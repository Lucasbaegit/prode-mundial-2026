import type { ReactNode } from "react";
import type { ActualResult, Match, MatchScore } from "../types/prode";
import { resultScoreLabel } from "../utils/format";
import { PredictionBadge } from "./PredictionBadge";
import { ScoreBadge } from "./ScoreBadge";
import { StatusBadge } from "./StatusBadge";

interface MatchRowProps {
  match: Match;
  result: ActualResult;
  score?: MatchScore;
}

export function MatchRow({ match, result, score }: MatchRowProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-3 shadow-insetLine">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">{match.id}</p>
          <p className="mt-1 text-sm font-black text-ink">
            {match.homeTeam} <span className="font-semibold text-stone-400">vs</span> {match.awayTeam}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Info label="Predicción">
          {score ? <PredictionBadge prediction={score.prediction} /> : <span className="font-bold">—</span>}
        </Info>
        <Info label="Resultado">
          <span className="font-black text-ink">{resultScoreLabel(result.homeGoals, result.awayGoals)}</span>
        </Info>
        <Info label="Estado">
          <ScoreBadge score={score} />
        </Info>
        <Info label="Puntos">
          <span className="text-lg font-black tabular-nums text-ink">{score?.points ?? 0}</span>
        </Info>
      </div>
    </div>
  );
}

interface InfoProps {
  label: string;
  children: ReactNode;
}

function Info({ label, children }: InfoProps) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
