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
  provider: "api-football" | "sportmonks"
): ActualResult[] {
  const updatedAt = new Date().toISOString();

  return matches.map((match) => {
    const fixture = fixtures.find((candidate) => fixtureMatchesLocalMatch(candidate, match));

    if (!fixture) {
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

    return {
      matchId: match.id,
      status: fixture.status,
      homeGoals: fixture.homeGoals,
      awayGoals: fixture.awayGoals,
      outcome:
        fixture.status === "finished" ? outcomeFromGoals(fixture.homeGoals, fixture.awayGoals) : null,
      updatedAt: fixture.updatedAt ?? updatedAt,
      provider
    };
  });
}

export function hasProviderResults(results: ActualResult[], provider: "api-football" | "sportmonks" | "manual-real"): boolean {
  return results.some((result) => result.provider === provider);
}

function fixtureMatchesLocalMatch(fixture: ExternalFixture, match: Match): boolean {
  const explicitExternalId =
    match.apiExternalId ??
    apiFootballMatchMap.find((entry) => entry.matchId === match.id)?.apiExternalId;
  if (explicitExternalId && String(explicitExternalId) === fixture.externalId) return true;

  const expectedHome = match.apiHomeTeamName ?? match.homeTeam;
  const expectedAway = match.apiAwayTeamName ?? match.awayTeam;

  return teamsMatch(fixture.homeTeam, expectedHome) && teamsMatch(fixture.awayTeam, expectedAway);
}
