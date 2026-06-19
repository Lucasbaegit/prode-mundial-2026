import type { RankingEntry } from "../types/prode";
import { formatDateTime, formatPercent, movementLabel } from "../utils/format";

interface LeaderboardProps {
  ranking: RankingEntry[];
  onExportCsv: () => void;
}

export function Leaderboard({ ranking, onExportCsv }: LeaderboardProps) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-insetLine">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Ranking general
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">Participantes</h2>
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          className="h-11 rounded-lg border border-ink bg-white px-4 text-sm font-black text-ink transition hover:bg-ink hover:text-white"
        >
          Exportar ranking CSV
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-stone-500">
              <th className="py-3 pr-3">Posición</th>
              <th className="px-3 py-3">Participante</th>
              <th className="px-3 py-3">Puntos</th>
              <th className="px-3 py-3">Aciertos</th>
              <th className="px-3 py-3">Fallos</th>
              <th className="px-3 py-3">Pendientes</th>
              <th className="px-3 py-3">Sin marcar</th>
              <th className="px-3 py-3">Efectividad</th>
              <th className="px-3 py-3">Contra líder</th>
              <th className="px-3 py-3">Movimiento</th>
              <th className="px-3 py-3">Última actualización</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr key={entry.participantId} className="border-b border-ink/5 last:border-0">
                <td className="py-3 pr-3 font-black text-ink">{entry.position}°</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-ink">{entry.participantName}</span>
                    {entry.position === 1 ? (
                      <span className="rounded-full bg-maize/20 px-2 py-0.5 text-[11px] font-black text-amber-800">
                        Líder
                      </span>
                    ) : null}
                    {entry.position <= 3 ? (
                      <span className="rounded-full bg-field/10 px-2 py-0.5 text-[11px] font-black text-field">
                        Top 3
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 font-black tabular-nums text-ink">{entry.points}</td>
                <td className="px-3 py-3 tabular-nums">{entry.hits}</td>
                <td className="px-3 py-3 tabular-nums">{entry.misses}</td>
                <td className="px-3 py-3 tabular-nums">{entry.scheduled}</td>
                <td className="px-3 py-3 tabular-nums">{entry.unmarked}</td>
                <td className="px-3 py-3 tabular-nums">{formatPercent(entry.efficiency)}</td>
                <td className="px-3 py-3 tabular-nums">{entry.distanceToLeader}</td>
                <td className="px-3 py-3">{movementLabel(entry.movement)}</td>
                <td className="px-3 py-3 text-stone-600">{formatDateTime(entry.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
