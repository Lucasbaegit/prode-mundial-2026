import type { MatchStatus, Prediction, RankingMovement } from "../types/prode";

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(value?: string): string {
  if (!value) return "Sin actualización";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatRelativeTime(value?: string): string {
  if (!value) return "sin actualización";

  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return "recién";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function statusLabel(status: MatchStatus): string {
  const labels: Record<MatchStatus, string> = {
    scheduled: "Pendiente",
    live: "En vivo",
    finished: "Finalizado"
  };

  return labels[status];
}

export function predictionLabel(prediction: Prediction): string {
  if (prediction === null) return "Sin marcar";

  const labels: Record<Exclude<Prediction, null>, string> = {
    L: "Local",
    E: "Empate",
    V: "Visitante"
  };

  return labels[prediction];
}

export function compactPredictionLabel(prediction: Prediction): string {
  return prediction ?? "—";
}

export function movementLabel(movement: RankingMovement): string {
  const labels: Record<RankingMovement, string> = {
    up: "Subió",
    down: "Bajó",
    same: "Igual"
  };

  return labels[movement];
}

export function resultScoreLabel(homeGoals: number | null, awayGoals: number | null): string {
  if (homeGoals === null || awayGoals === null) return "Sin resultado";
  return `${homeGoals} - ${awayGoals}`;
}
