import { matches } from "../../src/data/matches";
import type { MatchStatus } from "../../src/types/prode";
import type { ServerProviderResult } from "../types";
import { mapExternalFixturesToResults, type ExternalFixture } from "../utils/mapResults";

interface SportmonksFixturesResponse {
  data?: SportmonksFixture[];
  pagination?: {
    has_more?: boolean;
  };
}

interface SportmonksFixture {
  id: number;
  name?: string;
  starting_at?: string;
  state_id?: number;
  state?: {
    id?: number;
    name?: string;
    short_name?: string;
  };
  participants?: SportmonksParticipant[];
  scores?: SportmonksScore[];
}

interface SportmonksParticipant {
  id: number;
  name: string;
  meta?: {
    location?: "home" | "away";
  };
}

interface SportmonksScore {
  description?: string;
  score?: {
    goals?: number | null;
    participant?: "home" | "away";
  };
}

export async function getSportmonksResults(): Promise<ServerProviderResult> {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  const baseUrl =
    process.env.SPORTMONKS_BASE_URL?.trim() || "https://api.sportmonks.com/v3/football";
  const worldCupId = process.env.SPORTMONKS_WORLD_CUP_ID?.trim() || "26618";

  if (!token) {
    throw new Error("Sportmonks: token faltante.");
  }

  if (!worldCupId) {
    throw new Error("Sportmonks: SPORTMONKS_WORLD_CUP_ID faltante.");
  }

  const fixtures: SportmonksFixture[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL("/fixtures", baseUrl);
    url.searchParams.set("api_token", token);
    url.searchParams.set("include", "participants;state;scores;league;season");
    url.searchParams.set("filters", `fixtureLeagues:${worldCupId}`);
    url.searchParams.set("per_page", "50");
    url.searchParams.set("page", String(page));

    const response = await fetch(url);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Sportmonks: HTTP ${response.status}, token sin permisos o inválido.`);
    }
    if (response.status === 404) {
      throw new Error("Sportmonks: HTTP 404, endpoint o competition id incorrecto.");
    }
    if (!response.ok) {
      throw new Error(`Sportmonks: HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as SportmonksFixturesResponse;
    fixtures.push(...(payload.data ?? []));
    hasMore = Boolean(payload.pagination?.has_more);
    page += 1;
  }

  if (fixtures.length === 0) {
    throw new Error("Sportmonks: respuesta válida, pero data vacía.");
  }

  const results = mapExternalFixturesToResults(fixtures.map(toExternalFixture), matches, "sportmonks");

  if (!results.some((result) => result.provider === "sportmonks")) {
    throw new Error("Sportmonks: fixtures recibidos pero ninguno mapeó al fixture local.");
  }

  return {
    source: "sportmonks",
    message: "Resultados reales vía Sportmonks.",
    results
  };
}

export function mapSportmonksStatus(
  fixture: Pick<SportmonksFixture, "state" | "state_id">
): MatchStatus {
  const stateId = fixture.state?.id ?? fixture.state_id;
  const normalizedState = `${fixture.state?.short_name ?? ""} ${fixture.state?.name ?? ""}`.toLowerCase();

  if ([5, 7, 8].includes(stateId ?? -1) || /\b(ft|aet|pen|finished|full time)\b/.test(normalizedState)) {
    return "finished";
  }

  if (
    [2, 3, 4, 6, 22].includes(stateId ?? -1) ||
    /(1st|2nd|half|live|extra time|suspended|interrupted)/.test(normalizedState)
  ) {
    return "live";
  }

  return "scheduled";
}

function toExternalFixture(fixture: SportmonksFixture): ExternalFixture {
  const teams = getSportmonksTeamNames(fixture);
  const { homeGoals, awayGoals } = extractSportmonksGoals(fixture);

  return {
    externalId: String(fixture.id),
    homeTeam: teams.homeTeam,
    awayTeam: teams.awayTeam,
    status: mapSportmonksStatus(fixture),
    homeGoals,
    awayGoals,
    updatedAt: fixture.starting_at
  };
}

function getSportmonksTeamNames(fixture: SportmonksFixture): { homeTeam: string; awayTeam: string } {
  const homeParticipant = fixture.participants?.find((participant) => participant.meta?.location === "home");
  const awayParticipant = fixture.participants?.find((participant) => participant.meta?.location === "away");

  if (homeParticipant && awayParticipant) {
    return { homeTeam: homeParticipant.name, awayTeam: awayParticipant.name };
  }

  if (fixture.name?.includes(" vs ")) {
    const [homeTeam, awayTeam] = fixture.name.split(" vs ");
    return { homeTeam, awayTeam };
  }

  return { homeTeam: "", awayTeam: "" };
}

function extractSportmonksGoals(fixture: SportmonksFixture): {
  homeGoals: number | null;
  awayGoals: number | null;
} {
  const scoreRows = fixture.scores ?? [];
  const preferredScoreRows = scoreRows.filter((row) =>
    ["CURRENT", "FT", "2ND_HALF", "PENALTY_SHOOTOUT"].includes((row.description ?? "").toUpperCase())
  );
  const rows = preferredScoreRows.length > 0 ? preferredScoreRows : scoreRows;

  return rows.reduce(
    (acc, row) => {
      const goals = row.score?.goals;
      if (typeof goals !== "number") return acc;

      if (row.score?.participant === "home") acc.homeGoals = goals;
      if (row.score?.participant === "away") acc.awayGoals = goals;
      return acc;
    },
    { homeGoals: null, awayGoals: null } as { homeGoals: number | null; awayGoals: number | null }
  );
}
