import type { ActualResult, Match, MatchScore } from "../types/prode";
import { EmptyState } from "./EmptyState";
import { MatchRow } from "./MatchRow";

interface GroupCardProps {
  group: string;
  rows: Array<{
    match: Match;
    result: ActualResult;
    score?: MatchScore;
  }>;
}

export function GroupCard({ group, rows }: GroupCardProps) {
  return (
    <section className="rounded-lg border border-ink/10 bg-chalk p-4 shadow-insetLine">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Grupo</p>
          <h3 className="text-3xl font-black text-ink">{group}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-600 ring-1 ring-ink/10">
          {rows.length} partidos
        </span>
      </div>
      <div className="grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <MatchRow
              key={row.match.id}
              match={row.match}
              result={row.result}
              score={row.score}
            />
          ))
        ) : (
          <EmptyState message="No hay partidos para los filtros activos." />
        )}
      </div>
    </section>
  );
}
