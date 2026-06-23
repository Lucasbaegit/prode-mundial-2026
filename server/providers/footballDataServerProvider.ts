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

interface FootballDataWindow {
  from: string;
  to: string;
}

interface FootballDataFetchSummary {
  matches: FootballDataMatch[];
  strategy: "full-range" | "windows" | "current";
  fullRangeError?: string;
  windowSuccessCount: number;
  windowAttemptCount: number;
  windowErrors: string[];
  currentFallbackUsed: boolean;
  currentFallbackReason?: string;
  rateLimitHit: boolean;
}

export interface FootballDataDiscovery {
  total: number;
  matchingFixtures: ExternalFixture[];
  strategy: FootballDataFetchSummary["strategy"];
  fullRangePath: string;
  fullRangeError?: string;
  windowSuccessCount: number;
  windowAttemptCount: number;
  windowErrors: string[];
  currentFallbackUsed: boolean;
  currentFallbackReason?: string;
  rateLimitHit: boolean;
}

const defaultWindows: FootballDataWindow[] = [
  { from: "2026-06-11", to: "2026-06-15" },
  { from: "2026-06-16", to: "2026-06-20" },
  { from: "2026-06-21", to: "2026-06-24" },
  { from: "2026-06-25", to: "2026-06-28" }
];

export async function getFootballDataResults(): Promise<ServerProviderResult> {
  assertFootballDataToken();

  const summary = await fetchFootballDataTournamentMatches();
  const externalFixtures = filterFootballDataMatchesForLocalFixture(summary.matches);

  if (externalFixtures.length === 0) {
    throw new Error(buildNoMatchesMessage(summary));
  }

  return toProviderResult(externalFixtures, summary);
}

export async function discoverFootballDataMatches(): Promise<FootballDataDiscovery> {
  assertFootballDataToken();

  const summary = await fetchFootballDataTournamentMatches();
  const matchingFixtures = filterFootballDataMatchesForLocalFixture(summary.matches);

  return {
    total: summary.matches.length,
    matchingFixtures,
    strategy: summary.strategy,
    fullRangePath: getFootballDataRangePath(),
    fullRangeError: summary.fullRangeError,
    windowSuccessCount: summary.windowSuccessCount,
    windowAttemptCount: summary.windowAttemptCount,
    windowErrors: summary.windowErrors,
    currentFallbackUsed: summary.currentFallbackUsed,
    currentFallbackReason: summary.currentFallbackReason,
    rateLimitHit: summary.rateLimitHit
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

async function fetchFootballDataTournamentMatches(): Promise<FootballDataFetchSummary> {
  const fullRangePath = getFootballDataRangePath();

  try {
    return {
      matches: dedupeFootballDataMatches(await fetchFootballDataMatches(fullRangePath)),
      strategy: "full-range",
      windowSuccessCount: 0,
      windowAttemptCount: 0,
      windowErrors: [],
      currentFallbackUsed: false,
      rateLimitHit: false
    };
  } catch (error) {
    const fullRangeError = errorToMessage(error);
    const windowsSummary = await fetchFootballDataWindows();
    const windowsMatchingFixtures = filterFootballDataMatchesForLocalFixture(windowsSummary.matches);

    if (windowsMatchingFixtures.length > 0 || windowsSummary.rateLimitHit) {
      return {
        ...windowsSummary,
        fullRangeError
      };
    }

    try {
      const currentMatches = await fetchFootballDataMatches("/matches");
      return {
        ...windowsSummary,
        matches: dedupeFootballDataMatches(currentMatches),
        strategy: "current",
        fullRangeError,
        currentFallbackUsed: true,
        currentFallbackReason: "Rango completo y ventanas sin datos coincidentes."
      };
    } catch (currentError) {
      throw new Error(
        `${fullRangeError} | ${windowsSummary.windowErrors.join(" | ")} | ${errorToMessage(currentError)}`
      );
    }
  }
}

async function fetchFootballDataWindows(): Promise<FootballDataFetchSummary> {
  const collectedMatches: FootballDataMatch[] = [];
  const windowErrors: string[] = [];
  let windowSuccessCount = 0;
  let windowAttemptCount = 0;
  let rateLimitHit = false;

  for (const window of getFootballDataWindows()) {
    windowAttemptCount += 1;
    const path = buildMatchesPath(window.from, window.to);

    try {
      const matchesInWindow = await fetchFootballDataMatches(path);
      collectedMatches.push(...matchesInWindow);
      windowSuccessCount += 1;
    } catch (error) {
      const message = errorToMessage(error);
      windowErrors.push(`${window.from}:${window.to} ${message}`);

      if (isRateLimitError(error)) {
        rateLimitHit = true;
        break;
      }
    }
  }

  return {
    matches: dedupeFootballDataMatches(collectedMatches),
    strategy: "windows",
    windowSuccessCount,
    windowAttemptCount,
    windowErrors,
    currentFallbackUsed: false,
    rateLimitHit
  };
}

async function fetchFootballDataMatches(path: string): Promise<FootballDataMatch[]> {
  const token = getFootballDataToken();
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL?.trim() || "https://api.football-data.org/v4";

  if (!token) {
    throw new Error("football-data.org sin token.");
  }

  const url = buildFootballDataUrl(baseUrl, path);
  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": token
    }
  });

  if (!response.ok) {
    throw new FootballDataHttpError(response.status);
  }

  const payload = (await response.json()) as FootballDataMatchesResponse;
  return payload.matches ?? [];
}

function toProviderResult(
  matchingFixtures: ExternalFixture[],
  summary: FootballDataFetchSummary
): ServerProviderResult {
  return {
    source: "football-data",
    message: buildSuccessMessage(summary, matchingFixtures.length),
    results: mapExternalFixturesToResults(matchingFixtures, matches, "football-data")
  };
}

function buildSuccessMessage(summary: FootballDataFetchSummary, matchingCount: number): string {
  if (summary.strategy === "full-range") {
    return `Resultados reales vía football-data.org. Rango completo OK. Coincidencias: ${matchingCount}.`;
  }

  if (summary.strategy === "windows") {
    const prefix = summary.rateLimitHit
      ? "Rango completo falló; se usaron ventanas hasta rate limit"
      : "Rango completo falló; se usaron ventanas";
    return `Resultados reales vía football-data.org. ${prefix}: ${summary.windowSuccessCount}/${summary.windowAttemptCount}. Coincidencias: ${matchingCount}.`;
  }

  return `Resultados reales vía football-data.org. Rango completo y ventanas fallaron; se usó /matches actual. Coincidencias: ${matchingCount}.`;
}

function buildNoMatchesMessage(summary: FootballDataFetchSummary): string {
  if (summary.rateLimitHit) {
    return "football-data.org sin coincidencias antes de rate limit.";
  }

  if (summary.currentFallbackUsed) {
    return "football-data.org conectado, pero sin partidos coincidentes en ventanas ni /matches actual.";
  }

  return "football-data.org conectado, pero sin partidos coincidentes.";
}

function dedupeFootballDataMatches(footballDataMatches: FootballDataMatch[]): FootballDataMatch[] {
  return Array.from(
    footballDataMatches
      .reduce((acc, match) => {
        acc.set(String(match.id), match);
        return acc;
      }, new Map<string, FootballDataMatch>())
      .values()
  );
}

function getFootballDataRangePath(): string {
  const dateFrom = process.env.FOOTBALL_DATA_DATE_FROM?.trim() || "2026-06-11";
  const dateTo = process.env.FOOTBALL_DATA_DATE_TO?.trim() || "2026-06-28";
  return buildMatchesPath(dateFrom, dateTo);
}

function getFootballDataWindows(): FootballDataWindow[] {
  const configuredWindows = process.env.FOOTBALL_DATA_DATE_WINDOWS?.trim();
  if (!configuredWindows) return defaultWindows;

  const windows = configuredWindows
    .split(",")
    .map((window) => window.trim())
    .filter(Boolean)
    .map((window) => {
      const [from, to] = window.split(":").map((value) => value.trim());
      return { from, to };
    })
    .filter((window): window is FootballDataWindow => Boolean(window.from && window.to));

  return windows.length > 0 ? windows : defaultWindows;
}

function buildMatchesPath(dateFrom: string, dateTo: string): string {
  const params = new URLSearchParams({ dateFrom, dateTo });
  return `/matches?${params.toString()}`;
}

function assertFootballDataToken(): void {
  if (!getFootballDataToken()) {
    throw new Error("football-data.org sin token.");
  }
}

function getFootballDataToken(): string | undefined {
  return process.env.FOOTBALL_DATA_API_TOKEN?.trim() || undefined;
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

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof FootballDataHttpError && error.status === 429;
}

class FootballDataHttpError extends Error {
  constructor(readonly status: number) {
    super(`football-data.org: HTTP ${status}.`);
  }
}
