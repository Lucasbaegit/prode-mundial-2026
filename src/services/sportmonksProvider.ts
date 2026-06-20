import type { ActualResult, Match, MatchStatus } from "../types/prode";
import { outcomeFromGoals } from "../utils/outcome";
import { teamsMatch } from "../utils/teamNames";

export interface SportmonksFixture {
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

export function transformSportmonksFixtures(
  sportmonksFixtures: SportmonksFixture[],
  matches: Match[]
): ActualResult[] {
  const updatedAt = new Date().toISOString();

  return matches.map((match) => {
    const fixture = sportmonksFixtures.find((candidate) => candidateMatchesLocalMatch(candidate, match));

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

    const status = mapSportmonksStatus(fixture);
    const { homeGoals, awayGoals } = extractSportmonksGoals(fixture);

    return {
      matchId: match.id,
      status,
      homeGoals,
      awayGoals,
      outcome: status === "finished" ? outcomeFromGoals(homeGoals, awayGoals) : null,
      updatedAt: fixture.starting_at ?? updatedAt,
      provider: "sportmonks"
    };
  });
}

export function mapSportmonksStatus(fixture: Pick<SportmonksFixture, "state" | "state_id">): MatchStatus {
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

function candidateMatchesLocalMatch(candidate: SportmonksFixture, match: Match): boolean {
  const teams = getSportmonksTeamNames(candidate);
  if (!teams) return false;

  return teamsMatch(teams.homeTeam, match.homeTeam) && teamsMatch(teams.awayTeam, match.awayTeam);
}

function getSportmonksTeamNames(fixture: SportmonksFixture): { homeTeam: string; awayTeam: string } | null {
  const homeParticipant = fixture.participants?.find((participant) => participant.meta?.location === "home");
  const awayParticipant = fixture.participants?.find((participant) => participant.meta?.location === "away");

  if (homeParticipant && awayParticipant) return { homeTeam: homeParticipant.name, awayTeam: awayParticipant.name };

  if (fixture.name?.includes(" vs ")) {
    const [homeTeam, awayTeam] = fixture.name.split(" vs ");
    return { homeTeam, awayTeam };
  }

  return null;
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
