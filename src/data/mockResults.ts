import { matches } from "./matches";
import type { ActualResult } from "../types/prode";

const MOCK_UPDATED_AT = "2026-06-19T12:00:00-03:00";

const finishedResultsBase: ActualResult[] = [
  { matchId: "A1", status: "finished", homeGoals: 2, awayGoals: 0, outcome: "L" },
  { matchId: "A2", status: "finished", homeGoals: 1, awayGoals: 1, outcome: "E" },
  { matchId: "A3", status: "finished", homeGoals: 3, awayGoals: 1, outcome: "L" },
  { matchId: "A4", status: "finished", homeGoals: 0, awayGoals: 1, outcome: "V" },
  { matchId: "A5", status: "finished", homeGoals: 1, awayGoals: 2, outcome: "V" },

  { matchId: "B1", status: "finished", homeGoals: 2, awayGoals: 1, outcome: "L" },
  { matchId: "B2", status: "finished", homeGoals: 0, awayGoals: 2, outcome: "V" },
  { matchId: "B3", status: "finished", homeGoals: 2, awayGoals: 2, outcome: "E" },
  { matchId: "B4", status: "finished", homeGoals: 1, awayGoals: 1, outcome: "E" },

  { matchId: "C1", status: "finished", homeGoals: 0, awayGoals: 1, outcome: "V" },
  { matchId: "C2", status: "finished", homeGoals: 2, awayGoals: 0, outcome: "L" },
  { matchId: "C3", status: "finished", homeGoals: 1, awayGoals: 1, outcome: "E" },
  { matchId: "C4", status: "finished", homeGoals: 4, awayGoals: 0, outcome: "L" },
  { matchId: "C5", status: "finished", homeGoals: 0, awayGoals: 3, outcome: "V" },

  { matchId: "D1", status: "finished", homeGoals: 2, awayGoals: 1, outcome: "L" },
  { matchId: "D2", status: "finished", homeGoals: 1, awayGoals: 2, outcome: "V" },
  { matchId: "D3", status: "finished", homeGoals: 0, awayGoals: 0, outcome: "E" },
  { matchId: "D5", status: "finished", homeGoals: 1, awayGoals: 1, outcome: "E" },

  { matchId: "E1", status: "finished", homeGoals: 5, awayGoals: 0, outcome: "L" },
  { matchId: "E2", status: "finished", homeGoals: 0, awayGoals: 1, outcome: "V" },
  { matchId: "E3", status: "finished", homeGoals: 1, awayGoals: 2, outcome: "V" },
  { matchId: "E6", status: "finished", homeGoals: 2, awayGoals: 2, outcome: "E" },

  { matchId: "F1", status: "finished", homeGoals: 2, awayGoals: 0, outcome: "L" },
  { matchId: "F2", status: "finished", homeGoals: 1, awayGoals: 1, outcome: "E" },
  { matchId: "F3", status: "finished", homeGoals: 0, awayGoals: 1, outcome: "V" }
];

const finishedResults: ActualResult[] = finishedResultsBase.map((result) => ({
  ...result,
  updatedAt: MOCK_UPDATED_AT,
  provider: "mock"
}));

const liveResultsBase: ActualResult[] = [
  { matchId: "A6", status: "live", homeGoals: 0, awayGoals: 0, outcome: null },
  { matchId: "B5", status: "live", homeGoals: 1, awayGoals: 0, outcome: null },
  { matchId: "D4", status: "live", homeGoals: 2, awayGoals: 2, outcome: null },
  { matchId: "E5", status: "live", homeGoals: 0, awayGoals: 1, outcome: null }
];

const liveResults: ActualResult[] = liveResultsBase.map((result) => ({
  ...result,
  updatedAt: MOCK_UPDATED_AT,
  provider: "mock"
}));

const missingResultIds = new Set(["K6", "L6"]);
const explicitResultIds = new Set([...finishedResults, ...liveResults].map((result) => result.matchId));

const scheduledResults: ActualResult[] = matches
  .filter((match) => !explicitResultIds.has(match.id) && !missingResultIds.has(match.id))
  .map((match) => ({
    matchId: match.id,
    status: "scheduled",
    homeGoals: null,
    awayGoals: null,
    outcome: null,
    updatedAt: MOCK_UPDATED_AT,
    provider: "mock"
  }));

export const mockResults: ActualResult[] = [
  ...finishedResults,
  ...liveResults,
  ...scheduledResults
];
