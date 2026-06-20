import { afterEach, describe, expect, it, vi } from "vitest";
import { matches } from "../data/matches";
import { mapExternalFixturesToResults } from "../../server/utils/mapResults";
import {
  filterFootballDataMatchesForLocalFixture,
  getFootballDataResults,
  mapFootballDataStatus,
  toExternalFixture,
  type FootballDataMatch
} from "../../server/providers/footballDataServerProvider";

function footballDataMatch(
  id: number,
  home: string,
  away: string,
  status: string,
  fullTime: { home: number | null; away: number | null } = { home: null, away: null },
  halfTime?: { home: number | null; away: number | null }
): FootballDataMatch {
  return {
    id,
    utcDate: "2026-06-20T18:00:00Z",
    status,
    homeTeam: { name: home },
    awayTeam: { name: away },
    score: {
      fullTime,
      halfTime
    }
  };
}

describe("footballDataServerProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("mapea status football-data.org al estado local", () => {
    expect(mapFootballDataStatus("FINISHED")).toBe("finished");
    expect(mapFootballDataStatus("PAUSED")).toBe("live");
    expect(mapFootballDataStatus("IN_PLAY")).toBe("live");
    expect(mapFootballDataStatus("TIMED")).toBe("scheduled");
    expect(mapFootballDataStatus("SCHEDULED")).toBe("scheduled");
  });

  it("filtra /matches por fixture local e ignora competiciones ajenas", () => {
    const mixedMatches = [
      footballDataMatch(1, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 }),
      footballDataMatch(2, "Turkey", "Paraguay", "PAUSED", { home: null, away: null }, { home: 0, away: 1 }),
      footballDataMatch(3, "Netherlands", "Sweden", "TIMED"),
      footballDataMatch(4, "Londrina EC", "Athletic-MG", "FINISHED", { home: 1, away: 0 })
    ];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const matchingFixtures = filterFootballDataMatchesForLocalFixture(mixedMatches);
    const results = mapExternalFixturesToResults(matchingFixtures, matches, "football-data");

    expect(matchingFixtures).toHaveLength(3);
    expect(matchingFixtures.some((fixture) => fixture.homeTeam === "Londrina EC")).toBe(false);

    expect(results.find((result) => result.matchId === "C4")).toMatchObject({
      matchId: "C4",
      status: "finished",
      homeGoals: 3,
      awayGoals: 0,
      outcome: "L",
      provider: "football-data"
    });
    expect(results.find((result) => result.matchId === "D4")).toMatchObject({
      matchId: "D4",
      status: "live",
      homeGoals: 0,
      awayGoals: 1,
      outcome: null,
      provider: "football-data"
    });
    expect(results.find((result) => result.matchId === "F3")).toMatchObject({
      matchId: "F3",
      status: "scheduled",
      homeGoals: null,
      awayGoals: null,
      provider: "football-data"
    });
    expect(results.filter((result) => result.provider === "football-data")).toHaveLength(3);
    warnSpy.mockRestore();
  });

  it("invierte goles y outcome si football-data trae el orden de equipos al reves", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const reversedFixture = toExternalFixture(
      footballDataMatch(5, "Haiti", "Brazil", "FINISHED", { home: 0, away: 3 })
    );
    const results = mapExternalFixturesToResults([reversedFixture], matches, "football-data");

    expect(results.find((result) => result.matchId === "C4")).toMatchObject({
      matchId: "C4",
      status: "finished",
      homeGoals: 3,
      awayGoals: 0,
      outcome: "L",
      provider: "football-data"
    });
    warnSpy.mockRestore();
  });

  it("usa GET /matches como estrategia primaria", async () => {
    vi.stubEnv("FOOTBALL_DATA_API_TOKEN", "test-token");
    vi.stubEnv("FOOTBALL_DATA_BASE_URL", "https://api.football-data.org/v4");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        matches: [footballDataMatch(6, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 })]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.football-data.org/v4/matches");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      "X-Auth-Token": "test-token"
    });
    expect(response.source).toBe("football-data");
    expect(response.message).toBe("Resultados reales vía football-data.org /matches");
    expect(response.results.find((result) => result.matchId === "C4")).toMatchObject({
      provider: "football-data",
      homeGoals: 3,
      awayGoals: 0
    });
    warnSpy.mockRestore();
  });
});
