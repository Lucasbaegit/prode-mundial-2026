import { apiFootballMatchMap } from "../data/apiFootballMatchMap";
import { matches as localMatches } from "../data/matches";
import type { ActualResult, Match, MatchStatus, ResultsProvider } from "../types/prode";
import { outcomeFromGoals } from "../utils/outcome";
import { teamsMatch } from "../utils/teamNames";

interface ApiFootballFixtureResponse {
  response?: ApiFootballFixture[];
  errors?: unknown;
}

interface ApiFootballLeagueResponse {
  response?: ApiFootballLeagueCandidate[];
  errors?: unknown;
}

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

export interface ApiFootballLeagueCandidate {
  league: {
    id: number;
    name: string;
  };
  country?: {
    name?: string;
  };
  seasons?: Array<{
    year: number;
  }>;
}

export interface ApiFootballConfig {
  apiKey: string;
  baseUrl: string;
  leagueId?: string;
  season: string;
}

const finishedStatuses = new Set(["FT", "AET", "PEN"]);
const liveStatuses = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const scheduledStatuses = new Set(["NS", "TBD", "PST", "CANC", "ABD", "AWD", "WO"]);

export const apiFootballProvider: ResultsProvider = {
  async getResults() {
    const fixtures = await fetchApiFootballFixtures();
    if (fixtures.length === 0) {
      throw new Error("no-data: API-Football conectada, pero sin fixtures disponibles.");
    }
    return transformApiFootballFixtures(fixtures, localMatches);
  }
};

export async function fetchApiFootballFixtures(config = getApiFootballConfig()): Promise<ApiFootballFixture[]> {
  if (!config.apiKey) {
    throw new Error("missing-config: falta VITE_API_FOOTBALL_KEY.");
  }

  let leagueId = config.leagueId;
  if (!leagueId) {
    const discoveredLeagueId = await discoverWorldCupLeagueId(config);
    if (!discoveredLeagueId) {
      throw new Error("missing-config: configurar VITE_API_FOOTBALL_LEAGUE_ID.");
    }
    leagueId = String(discoveredLeagueId);
    console.warn(
      `[API-Football] League id ${leagueId} descubierto en memoria. Agregarlo a VITE_API_FOOTBALL_LEAGUE_ID.`
    );
  }

  const url = new URL("/fixtures", config.baseUrl);
  url.searchParams.set("league", leagueId);
  url.searchParams.set("season", config.season);

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": config.apiKey
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

export async function discoverWorldCupLeagueId(
  config = getApiFootballConfig()
): Promise<number | null> {
  if (!config.apiKey) {
    throw new Error("missing-config: falta VITE_API_FOOTBALL_KEY.");
  }

  const url = new URL("/leagues", config.baseUrl);
  url.searchParams.set("search", "World Cup");

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": config.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`API-Football respondió ${response.status} al buscar ligas.`);
  }

  const payload = (await response.json()) as ApiFootballLeagueResponse;
  const candidates = (payload.response ?? []).filter((candidate) =>
    isWorldCup2026Candidate(candidate, config.season)
  );

  if (candidates.length === 1) {
    return candidates[0].league.id;
  }

  if (candidates.length > 1) {
    console.warn(
      `[API-Football] Varias ligas World Cup para ${config.season}: ${candidates
        .map((candidate) => `${candidate.league.id} ${candidate.league.name}`)
        .join(", ")}. Configurar VITE_API_FOOTBALL_LEAGUE_ID.`
    );
  }

  return null;
}

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
      console.warn(
        `[API-Football] No se pudo mapear ${match.id} ${match.homeTeam} vs ${match.awayTeam}; queda pendiente.`
      );
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
  if (scheduledStatuses.has(statusShort)) return "scheduled";

  console.warn(`[API-Football] Estado desconocido "${statusShort}", se trata como pendiente.`);
  return "scheduled";
}

export function getApiFootballConfig(): ApiFootballConfig {
  return {
    apiKey: import.meta.env.VITE_API_FOOTBALL_KEY?.trim() ?? "",
    baseUrl:
      import.meta.env.VITE_API_FOOTBALL_BASE_URL?.trim() || "https://v3.football.api-sports.io",
    leagueId: import.meta.env.VITE_API_FOOTBALL_LEAGUE_ID?.trim() || undefined,
    season: import.meta.env.VITE_API_FOOTBALL_SEASON?.trim() || "2026"
  };
}

function isWorldCup2026Candidate(candidate: ApiFootballLeagueCandidate, season: string): boolean {
  const leagueName = candidate.league.name.toLowerCase();
  const hasWorldCupName = leagueName.includes("world cup") || leagueName.includes("fifa");
  const hasSeason = candidate.seasons?.some((candidateSeason) => String(candidateSeason.year) === season);
  return hasWorldCupName && Boolean(hasSeason);
}
