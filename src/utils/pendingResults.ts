import type { ActualResult, Match } from "../types/prode";

export function createPendingResults(matches: Match[], updatedAt = new Date().toISOString()): ActualResult[] {
  return matches.map((match) => ({
    matchId: match.id,
    status: "scheduled",
    homeGoals: null,
    awayGoals: null,
    outcome: null,
    updatedAt,
    provider: "pending"
  }));
}
