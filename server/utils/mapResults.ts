import { apiFootballMatchMap } from "../../src/data/apiFootballMatchMap";
import type { ActualResult, Match, MatchStatus } from "../../src/types/prode";
import { outcomeFromGoals } from "../../src/utils/outcome";
import { teamsMatch } from "./teamNames";

export interface ExternalFixture {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  updatedAt?: string;
}

export function mapExternalFixturesToResults(
  fixtures: ExternalFixture[],
  matches: Match[],
  provider: "api-football" | "sportmonks" | "football-data"
): ActualResult[] {
  const updatedAt = new Date().toISOString();

  return matches.map((match) => {
    const fixtureMatch = findFixtureMatch(fixtures, match, provider);

    if (!fixtureMatch) {
      console.warn(
        `[${provider}] No se pudo mapear ${match.id} ${match.homeTeam} vs ${match.awayTeam}; queda pendiente.`
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

    const { fixture, reversed } = fixtureMatch;
    const homeGoals = reversed ? fixture.awayGoals : fixture.homeGoals;
    const awayGoals = reversed ? fixture.homeGoals : fixture.awayGoals;

    return {
      matchId: match.id,
      status: fixture.status,
      homeGoals,
      awayGoals,
      outcome:
        fixture.status === "finished" ? outcomeFromGoals(homeGoals, awayGoals) : null,
      updatedAt: fixture.updatedAt ?? updatedAt,
      provider
    };
  });
}

export function hasProviderResults(
  results: ActualResult[],
  provider: "api-football" | "sportmonks" | "football-data" | "manual-real"
): boolean {
  return results.some((result) => result.provider === provider);
}

function findFixtureMatch(
  fixtures: ExternalFixture[],
  match: Match,
  provider: "api-football" | "sportmonks" | "football-data"
): { fixture: ExternalFixture; reversed: boolean } | null {
  for (const fixture of fixtures) {
    const direction = getFixtureMatchDirection(fixture, match, {
      allowExplicitExternalId: provider === "api-football"
    });
    if (direction) {
      return { fixture, reversed: direction === "reversed" };
    }
  }

  return null;
}

export function getFixtureMatchDirection(
  fixture: ExternalFixture,
  match: Match,
  options: { allowExplicitExternalId?: boolean } = {}
): "direct" | "reversed" | null {
  const explicitExternalId =
    match.apiExternalId ??
    apiFootballMatchMap.find((entry) => entry.matchId === match.id)?.apiExternalId;
  if (
    options.allowExplicitExternalId &&
    explicitExternalId &&
    String(explicitExternalId) === fixture.externalId
  ) {
    return "direct";
  }

  const expectedHome = match.apiHomeTeamName ?? match.homeTeam;
  const expectedAway = match.apiAwayTeamName ?? match.awayTeam;

  if (teamsMatch(fixture.homeTeam, expectedHome) && teamsMatch(fixture.awayTeam, expectedAway)) {
    return "direct";
  }

  if (teamsMatch(fixture.homeTeam, expectedAway) && teamsMatch(fixture.awayTeam, expectedHome)) {
    return "reversed";
  }

  return null;
}
