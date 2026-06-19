import { apiFootballMatchMap } from "../data/apiFootballMatchMap";
import { matches as localMatches } from "../data/matches";
import type { ActualResult, Match, MatchStatus, ResultsProvider } from "../types/prode";
import { outcomeFromGoals } from "../utils/outcome";
import { teamsMatch } from "../utils/teamNames";

interface ApiFootballFixtureResponse {
  response?: ApiFootballFixture[];
  errors?: unknown;
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date?: string;
    status: {
      short?: string;
    };
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

export const apiFootballProvider: ResultsProvider = {
  async getResults() {
    const fixtures = await fetchApiFootballFixtures();
    return transformApiFootballFixtures(fixtures, localMatches);
  }
};

export async function fetchApiFootballFixtures(): Promise<ApiFootballFixture[]> {
  const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY?.trim();
  const baseUrl =
    import.meta.env.VITE_API_FOOTBALL_BASE_URL?.trim() || "https://v3.football.api-sports.io";
  const leagueId = import.meta.env.VITE_API_FOOTBALL_LEAGUE_ID?.trim();
  const season = import.meta.env.VITE_API_FOOTBALL_SEASON?.trim() || "2026";

  if (!apiKey) {
    throw new Error("Falta VITE_API_FOOTBALL_KEY.");
  }

  if (!leagueId) {
    throw new Error("Falta VITE_API_FOOTBALL_LEAGUE_ID.");
  }

  const url = new URL("/fixtures", baseUrl);
  url.searchParams.set("league", leagueId);
  url.searchParams.set("season", season);

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`API-Football respondió ${response.status}.`);
  }

  const payload = (await response.json()) as ApiFootballFixtureResponse;
  if (!Array.isArray(payload.response)) {
    throw new Error("API-Football no devolvió una lista de fixtures.");
  }

  return payload.response;
}

export function transformApiFootballFixtures(
  apiFixtures: ApiFootballFixture[],
  matches: Match[]
): ActualResult[] {
  const fixturesById = new Map(apiFixtures.map((fixture) => [String(fixture.fixture.id), fixture]));
  const explicitApiIds = new Map(apiFootballMatchMap.map((entry) => [entry.matchId, entry.apiExternalId]));

  return matches.map((match) => {
    const apiExternalId = match.apiExternalId ?? explicitApiIds.get(match.id);
    const fixture = apiExternalId
      ? fixturesById.get(apiExternalId)
      : apiFixtures.find((candidate) => candidateMatchesLocalMatch(candidate, match));

    if (!fixture) {
      console.warn(
        `[API-Football] No se pudo mapear ${match.id} ${match.homeTeam} vs ${match.awayTeam}.`
      );
      return {
        matchId: match.id,
        status: "scheduled",
        homeGoals: null,
        awayGoals: null,
        outcome: null,
        updatedAt: new Date().toISOString(),
        provider: "api-football"
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
      updatedAt: fixture.fixture.date ?? new Date().toISOString(),
      provider: "api-football"
    };
  });
}

function candidateMatchesLocalMatch(candidate: ApiFootballFixture, match: Match): boolean {
  const expectedHome = match.apiHomeTeamName ?? match.homeTeam;
  const expectedAway = match.apiAwayTeamName ?? match.awayTeam;

  return (
    teamsMatch(candidate.teams.home.name, expectedHome) &&
    teamsMatch(candidate.teams.away.name, expectedAway)
  );
}

export function mapApiFootballStatus(statusShort?: string): MatchStatus {
  if (!statusShort) return "scheduled";
  if (finishedStatuses.has(statusShort)) return "finished";
  if (liveStatuses.has(statusShort)) return "live";
  return "scheduled";
}
