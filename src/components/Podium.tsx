import type { RankingEntry } from "../types/prode";

interface PodiumProps {
  ranking: RankingEntry[];
}

const podiumOrder = [1, 0, 2];

export function Podium({ ranking }: PodiumProps) {
  const topThree = ranking.slice(0, 3);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-insetLine">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Podio</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Top 3</h2>
        </div>
      </div>
      <div className="mt-5 grid items-end gap-3 md:grid-cols-3">
        {podiumOrder.map((index) => {
          const entry = topThree[index];
          if (!entry) return null;

          const isLeader = entry.position === 1;
          return (
            <article
              key={entry.participantId}
              className={`rounded-lg border p-5 ${
                isLeader
                  ? "border-maize bg-maize/15 md:order-2 md:min-h-48"
                  : "border-ink/10 bg-chalk md:min-h-40"
              } ${entry.position === 2 ? "md:order-1" : ""} ${entry.position === 3 ? "md:order-3" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black text-ink">{entry.position}°</span>
                <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-black text-white">
                  {isLeader ? "Líder" : "Podio"}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-ink">{entry.participantName}</h3>
              <p className="mt-1 text-sm text-stone-600">{entry.points} puntos</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                {entry.hits} aciertos · {entry.unmarked} sin marcar
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
