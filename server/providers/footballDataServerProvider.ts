import { matches } from "../../src/data/matches";
import type { MatchStatus } from "../../src/types/prode";
import type { ServerProviderResult } from "../types";
import {
  getFixtureMatchDirection,
  mapExternalFixturesToResults,
  type ExternalFixture
} from "../utils/mapResults";

interface FootballDataMatchesResponse {
  count?: number;
  resultSet?: {
    count?: number;
  };
  matches?: FootballDataMatch[];
}

export interface FootballDataMatch {
  id: number;
  utcDate?: string;
  status: string;
  homeTeam: {
    name?: string;
    shortName?: string;
    tla?: string;
  };
  awayTeam: {
    name?: string;
    shortName?: string;
    tla?: string;
  };
  score?: {
    fullTime?: {
      home: number | null;
      away: number | null;
    };
    halfTime?: {
      home: number | null;
      away: number | null;
    };
    regularTime?: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface FootballDataDiscovery {
  total: number;
  matchingFixtures: ExternalFixture[];
}

export async function getFootballDataResults(): Promise<ServerProviderResult> {
  const matchesFromGlobal = await fetchFootballDataMatches("/matches");
  const globalMatchingFixtures = filterFootballDataMatchesForLocalFixture(matchesFromGlobal);

  if (globalMatchingFixtures.length > 0) {
    const results = mapExternalFixturesToResults(globalMatchingFixtures, matches, "football-data");
    return {
      source: "football-data",
      message: "Resultados reales vía football-data.org /matches",
      results
    };
  }

  const competitionCode = process.env.FOOTBALL_DATA_COMPETITION_CODE?.trim();
  if (competitionCode) {
    const competitionMatches = await fetchFootballDataMatches(`/competitions/${competitionCode}/matches`);
    const competitionMatchingFixtures = filterFootballDataMatchesForLocalFixture(competitionMatches);

    if (competitionMatchingFixtures.length > 0) {
      const results = mapExternalFixturesToResults(competitionMatchingFixtures, matches, "football-data");
      return {
        source: "football-data",
        message: `Resultados reales vía football-data.org /competitions/${competitionCode}/matches.`,
        results
      };
    }
  }

  throw new Error("football-data.org conectado, pero sin partidos coincidentes con el fixture local.");
}

export async function discoverFootballDataMatches(): Promise<FootballDataDiscovery> {
  const footballDataMatches = await fetchFootballDataMatches("/matches");

  return {
    total: footballDataMatches.length,
    matchingFixtures: filterFootballDataMatchesForLocalFixture(footballDataMatches)
  };
}

export function filterFootballDataMatchesForLocalFixture(
  footballDataMatches: FootballDataMatch[]
): ExternalFixture[] {
  return footballDataMatches
    .map(toExternalFixture)
    .filter((fixture) =>
      matches.some((match) => getFixtureMatchDirection(fixture, match, { allowExplicitExternalId: false }))
    );
}

export function mapFootballDataStatus(status: string): MatchStatus {
  if (status === "FINISHED") return "finished";
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  return "scheduled";
}

export function toExternalFixture(match: FootballDataMatch): ExternalFixture {
  const status = mapFootballDataStatus(match.status);
  const { homeGoals, awayGoals } = extractFootballDataGoals(match);

  return {
    externalId: String(match.id),
    homeTeam: match.homeTeam.name ?? match.homeTeam.shortName ?? match.homeTeam.tla ?? "",
    awayTeam: match.awayTeam.name ?? match.awayTeam.shortName ?? match.awayTeam.tla ?? "",
    status,
    homeGoals,
    awayGoals,
    updatedAt: match.utcDate
  };
}

async function fetchFootballDataMatches(path: string): Promise<FootballDataMatch[]> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim();
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL?.trim() || "https://api.football-data.org/v4";

  if (!token) {
    throw new Error("football-data.org: token faltante.");
  }

  const url = buildFootballDataUrl(baseUrl, path);
  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": token
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(`football-data.org: HTTP ${response.status}, token sin permisos o inválido.`);
  }

  if (!response.ok) {
    throw new Error(`football-data.org: HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as FootballDataMatchesResponse;
  return payload.matches ?? [];
}

function extractFootballDataGoals(match: FootballDataMatch): {
  homeGoals: number | null;
  awayGoals: number | null;
} {
  const fullTime = match.score?.fullTime;
  if (fullTime && fullTime.home !== null && fullTime.away !== null) {
    return { homeGoals: fullTime.home, awayGoals: fullTime.away };
  }

  if (mapFootballDataStatus(match.status) !== "live") {
    return { homeGoals: null, awayGoals: null };
  }

  const halfTime = match.score?.halfTime;
  if (halfTime && halfTime.home !== null && halfTime.away !== null) {
    return { homeGoals: halfTime.home, awayGoals: halfTime.away };
  }

  const regularTime = match.score?.regularTime;
  if (regularTime && regularTime.home !== null && regularTime.away !== null) {
    return { homeGoals: regularTime.home, awayGoals: regularTime.away };
  }

  return { homeGoals: null, awayGoals: null };
}

function buildFootballDataUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(`${normalizedBaseUrl}/${normalizedPath}`);
}
