import type {
  ActualResult,
  Match,
  MatchScore,
  Participant,
  ParticipantSummary
} from "../types/prode";

export function buildResultMap(results: ActualResult[]): Map<string, ActualResult> {
  return new Map(results.map((result) => [result.matchId, result]));
}

export function getResultForMatch(
  match: Match,
  resultsById: Map<string, ActualResult>
): ActualResult {
  return (
    resultsById.get(match.id) ?? {
      matchId: match.id,
      status: "scheduled",
      homeGoals: null,
      awayGoals: null,
      outcome: null
    }
  );
}

export function calculateMatchScore(
  match: Match,
  participant: Participant,
  result: ActualResult
): MatchScore {
  const prediction = participant.predictions[match.id] ?? null;

  if (prediction === null) {
    return {
      matchId: match.id,
      prediction,
      outcome: result.outcome,
      status: result.status,
      points: 0,
      verdict: "unmarked"
    };
  }

  if (result.status === "live") {
    return {
      matchId: match.id,
      prediction,
      outcome: result.outcome,
      status: result.status,
      points: 0,
      verdict: "live"
    };
  }

  if (result.status !== "finished" || result.outcome === null) {
    return {
      matchId: match.id,
      prediction,
      outcome: result.outcome,
      status: result.status,
      points: 0,
      verdict: "pending"
    };
  }

  const isHit = prediction === result.outcome;

  return {
    matchId: match.id,
    prediction,
    outcome: result.outcome,
    status: result.status,
    points: isHit ? 1 : 0,
    verdict: isHit ? "hit" : "miss"
  };
}

export function calculateParticipantSummary(
  participant: Participant,
  matches: Match[],
  results: ActualResult[]
): ParticipantSummary {
  const resultsById = buildResultMap(results);
  const scores = matches.map((match) =>
    calculateMatchScore(match, participant, getResultForMatch(match, resultsById))
  );

  const statusCounts = matches.reduce(
    (acc, match) => {
      const result = getResultForMatch(match, resultsById);
      acc[result.status] += 1;
      return acc;
    },
    { scheduled: 0, live: 0, finished: 0 }
  );

  const hits = scores.filter((score) => score.verdict === "hit").length;
  const misses = scores.filter((score) => score.verdict === "miss").length;
  const unmarked = scores.filter((score) => score.verdict === "unmarked").length;
  const points = scores.reduce((total, score) => total + score.points, 0);
  const predictedFinished = hits + misses;
  const efficiency = predictedFinished > 0 ? hits / predictedFinished : 0;
  const couldStillScore = scores.filter(
    (score) => score.prediction !== null && score.status !== "finished"
  ).length;
  const lastUpdated = getLatestResultUpdate(results);

  return {
    participantId: participant.id,
    participantName: participant.name,
    points,
    hits,
    misses,
    finished: statusCounts.finished,
    scheduled: statusCounts.scheduled,
    live: statusCounts.live,
    unmarked,
    efficiency,
    distanceToLeader: 0,
    distanceToAbove: 0,
    couldStillScore,
    lastUpdated
  };
}

export function getLatestResultUpdate(results: ActualResult[]): string | undefined {
  const sortedDates = results
    .map((result) => result.updatedAt)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return sortedDates[0];
}
