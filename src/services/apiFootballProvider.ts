import { apiFootballMatchMap } from "../data/apiFootballMatchMap";
import type { ActualResult, Match, MatchStatus } from "../types/prode";
import { outcomeFromGoals } from "../utils/outcome";
import { teamsMatch } from "../utils/teamNames";

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date?: string;
    status: {
      short?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    id?: number;
    name?: string;
    season?: number;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

const finishedStatuses = new Set(["FT", "AET", "PEN"]);
const liveStatuses = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const scheduledStatuses = new Set(["NS", "TBD", "PST", "CANC", "ABD", "AWD", "WO"]);

export function transformApiFootballFixtures(
  apiFixtures: ApiFootballFixture[],
  matches: Match[]
): ActualResult[] {
  const fixturesById = new Map(apiFixtures.map((fixture) => [String(fixture.fixture.id), fixture]));
  const explicitApiIds = new Map(apiFootballMatchMap.map((entry) => [entry.matchId, entry.apiExternalId]));
  const updatedAt = new Date().toISOString();

  return matches.map((match) => {
    const apiExternalId = match.apiExternalId ?? explicitApiIds.get(match.id);
    const fixture = apiExternalId
      ? fixturesById.get(String(apiExternalId))
      : apiFixtures.find((candidate) => candidateMatchesLocalMatch(candidate, match));

    if (!fixture) {
      return {
        matchId: match.id,
        status: "scheduled",
        homeGoals: null,
        awayGoals: null,
        outcome: null,
        updatedAt,
        provider: "pending"
      };
    }

    const status = mapApiFootballStatus(fixture.fixture.status.short);
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;

    return {
      matchId: match.id,
      status,
      homeGoals,
      awayGoals,
      outcome: status === "finished" ? outcomeFromGoals(homeGoals, awayGoals) : null,
      updatedAt: fixture.fixture.date ?? updatedAt,
      provider: "api-football"
    };
  });
}

export function mapApiFootballStatus(statusShort?: string): MatchStatus {
  if (!statusShort) return "scheduled";
  if (finishedStatuses.has(statusShort)) return "finished";
  if (liveStatuses.has(statusShort)) return "live";
  if (scheduledStatuses.has(statusShort)) return "scheduled";
  return "scheduled";
}

function candidateMatchesLocalMatch(candidate: ApiFootballFixture, match: Match): boolean {
  const expectedHome = match.apiHomeTeamName ?? match.homeTeam;
  const expectedAway = match.apiAwayTeamName ?? match.awayTeam;

  return (
    teamsMatch(candidate.teams.home.name, expectedHome) &&
    teamsMatch(candidate.teams.away.name, expectedAway)
  );
}
