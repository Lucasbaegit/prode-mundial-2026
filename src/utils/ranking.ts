import type {
  ActualResult,
  Match,
  Participant,
  RankingEntry,
  RankingMovement,
  TournamentSummary
} from "../types/prode";
import { calculateParticipantSummary, getResultForMatch, buildResultMap } from "./scoring";

export function calculateRanking(
  participants: Participant[],
  matches: Match[],
  results: ActualResult[],
  previousPositions: Record<string, number> = {}
): RankingEntry[] {
  const summaries = participants.map((participant) =>
    calculateParticipantSummary(participant, matches, results)
  );

  const sorted = [...summaries].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.efficiency !== left.efficiency) return right.efficiency - left.efficiency;
    if (left.unmarked !== right.unmarked) return left.unmarked - right.unmarked;
    return left.participantName.localeCompare(right.participantName, "es");
  });

  const leaderPoints = sorted[0]?.points ?? 0;

  return sorted.map((summary, index) => {
    const position = index + 1;
    const previousPosition = previousPositions[summary.participantId];
    const distanceToAbove = index === 0 ? 0 : sorted[index - 1].points - summary.points;
    const movement = getRankingMovement(previousPosition, position);

    return {
      ...summary,
      position,
      distanceToLeader: leaderPoints - summary.points,
      distanceToAbove,
      movement
    };
  });
}

export function getRankingMovement(
  previousPosition: number | undefined,
  currentPosition: number
): RankingMovement {
  if (!previousPosition || previousPosition === currentPosition) {
    return "same";
  }

  return previousPosition > currentPosition ? "up" : "down";
}

export function calculateTournamentSummary(
  matches: Match[],
  participants: Participant[],
  results: ActualResult[],
  ranking: RankingEntry[]
): TournamentSummary {
  const resultsById = buildResultMap(results);
  const statusCounts = matches.reduce(
    (acc, match) => {
      const result = getResultForMatch(match, resultsById);
      acc[result.status] += 1;
      return acc;
    },
    { scheduled: 0, live: 0, finished: 0 }
  );

  const tournamentStatus =
    statusCounts.finished === matches.length
      ? "Finalizado"
      : statusCounts.finished === 0 && statusCounts.live === 0
        ? "Pendiente"
        : "En curso";

  return {
    participantCount: participants.length,
    totalMatches: matches.length,
    finishedMatches: statusCounts.finished,
    scheduledMatches: statusCounts.scheduled,
    liveMatches: statusCounts.live,
    tournamentStatus,
    leaderName: ranking[0]?.participantName ?? "Sin ranking",
    topHits: Math.max(0, ...ranking.map((entry) => entry.hits)),
    worstUnmarked: Math.max(0, ...ranking.map((entry) => entry.unmarked)),
    lastUpdated: ranking[0]?.lastUpdated
  };
}
