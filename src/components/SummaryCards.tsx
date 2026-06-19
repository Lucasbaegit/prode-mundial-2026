import type { RankingEntry } from "../types/prode";
import { formatPercent } from "../utils/format";

interface SummaryCardsProps {
  summary: RankingEntry;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: "Puntos", value: summary.points, accent: "text-ink" },
    { label: "Posición", value: `${summary.position}°`, accent: "text-field" },
    { label: "Aciertos", value: summary.hits, accent: "text-emerald-700" },
    { label: "Fallos", value: summary.misses, accent: "text-rust" },
    { label: "Finalizados", value: summary.finished, accent: "text-ink" },
    { label: "Pendientes", value: summary.scheduled, accent: "text-stone-700" },
    { label: "En vivo", value: summary.live, accent: "text-rust" },
    { label: "Sin marcar", value: summary.unmarked, accent: "text-amber-700" },
    { label: "Efectividad", value: formatPercent(summary.efficiency), accent: "text-field" },
    { label: "Contra primero", value: summary.distanceToLeader, accent: "text-ink" },
    { label: "Contra superior", value: summary.distanceToAbove, accent: "text-ink" },
    { label: "Puede sumar", value: summary.couldStillScore, accent: "text-maize" }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-ink/10 bg-white p-4 shadow-insetLine"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
            {card.label}
          </p>
          <p className={`mt-2 text-3xl font-black tabular-nums ${card.accent}`}>{card.value}</p>
        </div>
      ))}
    </section>
  );
}
