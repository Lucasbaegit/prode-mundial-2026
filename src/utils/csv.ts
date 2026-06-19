import type { RankingEntry } from "../types/prode";
import { formatPercent } from "./format";

const headers = [
  "posicion",
  "participante",
  "puntos",
  "aciertos",
  "fallos",
  "pendientes",
  "sin_marcar",
  "efectividad"
];

export function rankingToCsv(ranking: RankingEntry[]): string {
  const rows = ranking.map((entry) => [
    entry.position,
    entry.participantName,
    entry.points,
    entry.hits,
    entry.misses,
    entry.scheduled,
    entry.unmarked,
    formatPercent(entry.efficiency)
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function downloadRankingCsv(ranking: RankingEntry[]): void {
  const csv = rankingToCsv(ranking);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ranking-prode-mundial-2026.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
