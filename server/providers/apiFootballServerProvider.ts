import { matches } from "../../src/data/matches";
import type { MatchStatus } from "../../src/types/prode";
import type { ServerProviderResult } from "../types";
import { mapExternalFixturesToResults, type ExternalFixture } from "../utils/mapResults";

interface ApiFootballFixtureResponse {
  results?: number;
  response?: ApiFootballFixture[];
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
const scheduledStatuses = new Set(["NS", "TBD", "PST", "CANC", "ABD", "AWD", "WO"]);

export async function getApiFootballResults(): Promise<ServerProviderResult> {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  const baseUrl = process.env.API_FOOTBALL_BASE_URL?.trim() || "https://v3.football.api-sports.io";
  const leagueId = process.env.API_FOOTBALL_LEAGUE_ID?.trim() || "1";
  const season = process.env.API_FOOTBALL_SEASON?.trim() || "2026";

  if (!apiKey) {
    throw new Error("API-Football: token faltante.");
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
    throw new Error(`API-Football: HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as ApiFootballFixtureResponse;
  const fixtures = payload.response ?? [];
  if ((payload.results ?? fixtures.length) === 0 || fixtures.length === 0) {
    throw new Error("API-Football conectada, pero sin fixtures disponibles.");
  }

  const externalFixtures = fixtures.map(toExternalFixture);
  const results = mapExternalFixturesToResults(externalFixtures, matches, "api-football");

  if (!results.some((result) => result.provider === "api-football")) {
    throw new Error("API-Football: fixtures recibidos pero ninguno mapeó al fixture local.");
  }

  return {
    source: "api-football",
    message: "Resultados reales vía API-Football.",
    results
  };
}

export function mapApiFootballStatus(statusShort?: string): MatchStatus {
  if (!statusShort) return "scheduled";
  if (finishedStatuses.has(statusShort)) return "finished";
  if (liveStatuses.has(statusShort)) return "live";
  if (scheduledStatuses.has(statusShort)) return "scheduled";

  console.warn(`[API-Football] Estado desconocido "${statusShort}", se trata como pendiente.`);
  return "scheduled";
}

function toExternalFixture(fixture: ApiFootballFixture): ExternalFixture {
  return {
    externalId: String(fixture.fixture.id),
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    status: mapApiFootballStatus(fixture.fixture.status.short),
    homeGoals: fixture.goals.home,
    awayGoals: fixture.goals.away,
    updatedAt: fixture.fixture.date
  };
}
