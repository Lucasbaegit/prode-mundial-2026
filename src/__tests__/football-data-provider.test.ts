import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discoverFootballDataMatches,
  filterFootballDataMatchesForLocalFixture,
  getFootballDataResults,
  mapFootballDataStatus,
  toExternalFixture,
  type FootballDataMatch
} from "../../server/providers/footballDataServerProvider";
import { matches } from "../data/matches";
import { mapExternalFixturesToResults } from "../../server/utils/mapResults";

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

function okResponse(matches: FootballDataMatch[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ matches })
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({})
  };
}

function stubFootballDataEnv() {
  vi.stubEnv("FOOTBALL_DATA_API_TOKEN", "test-token");
  vi.stubEnv("FOOTBALL_DATA_BASE_URL", "https://api.football-data.org/v4");
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

  it("filtra fixture local, ignora partidos ajenos y mantiene orden invertido", () => {
    const mixedMatches = [
      footballDataMatch(1, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 }),
      footballDataMatch(2, "Turkey", "Paraguay", "PAUSED", { home: null, away: null }, { home: 0, away: 1 }),
      footballDataMatch(3, "Netherlands", "Sweden", "TIMED"),
      footballDataMatch(4, "Haiti", "Brazil", "FINISHED", { home: 0, away: 3 }),
      footballDataMatch(5, "Londrina EC", "Athletic-MG", "FINISHED", { home: 1, away: 0 })
    ];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const matchingFixtures = filterFootballDataMatchesForLocalFixture(mixedMatches);
    const results = mapExternalFixturesToResults([toExternalFixture(mixedMatches[3])], matches, "football-data");

    expect(matchingFixtures).toHaveLength(4);
    expect(matchingFixtures.some((fixture) => fixture.homeTeam === "Londrina EC")).toBe(false);
    expect(results.find((result) => result.matchId === "C4")).toMatchObject({
      status: "finished",
      homeGoals: 3,
      awayGoals: 0,
      outcome: "L",
      provider: "football-data"
    });
    warnSpy.mockRestore();
  });

  it("rango completo OK devuelve resultados internos completos", async () => {
    stubFootballDataEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse([
        footballDataMatch(8, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 }),
        footballDataMatch(9, "Netherlands", "Sweden", "TIMED")
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.football-data.org/v4/matches?dateFrom=2026-06-11&dateTo=2026-06-28"
    );
    expect(response.message).toContain("Rango completo OK");
    expect(response.message).toContain("Coincidencias: 2");
    expect(response.results).toHaveLength(72);
    expect(response.results.filter((result) => result.provider === "football-data")).toHaveLength(2);
    warnSpy.mockRestore();
  });

  it("rango completo HTTP 400 usa ventanas configuradas", async () => {
    stubFootballDataEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([footballDataMatch(10, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 })]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(11, "Turkey", "Paraguay", "PAUSED", { home: null, away: null }, { home: 0, away: 1 })]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(12, "Netherlands", "Sweden", "TIMED")]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(13, "England", "Ghana", "TIMED")]));
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[1][0])).toContain("dateFrom=2026-06-11&dateTo=2026-06-15");
    expect(response.message).toContain("se usaron ventanas: 4/4");
    expect(response.message).toContain("Coincidencias: 4");
    expect(response.results.filter((result) => result.provider === "football-data")).toHaveLength(4);
    warnSpy.mockRestore();
  });

  it("una ventana falla con error no 429 y sigue con las demas", async () => {
    stubFootballDataEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([footballDataMatch(14, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 })]))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse([footballDataMatch(15, "Norway", "Senegal", "FINISHED", { home: 3, away: 2 })]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(16, "Portugal", "Uzbekistan", "TIMED")]));
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(response.message).toContain("se usaron ventanas: 3/4");
    expect(response.message).toContain("Coincidencias: 3");
    expect(response.results.filter((result) => result.provider === "football-data")).toHaveLength(3);
    warnSpy.mockRestore();
  });

  it("429 en una ventana corta las ventanas restantes", async () => {
    stubFootballDataEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(errorResponse(429));
    vi.stubGlobal("fetch", fetchMock);

    const discovery = await discoverFootballDataMatches();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(discovery.rateLimitHit).toBe(true);
    expect(discovery.windowAttemptCount).toBe(2);
    expect(discovery.windowSuccessCount).toBe(1);
  });

  it("deduplica partidos repetidos entre ventanas", async () => {
    stubFootballDataEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const duplicate = footballDataMatch(17, "Brazil", "Haiti", "FINISHED", { home: 3, away: 0 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([duplicate]))
      .mockResolvedValueOnce(okResponse([duplicate]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(18, "Turkey", "Paraguay", "PAUSED", { home: null, away: null }, { home: 0, away: 1 })]))
      .mockResolvedValueOnce(okResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(response.message).toContain("Coincidencias: 2");
    expect(response.results.filter((result) => result.provider === "football-data")).toHaveLength(2);
    warnSpy.mockRestore();
  });

  it("si las ventanas no tienen coincidencias y no hubo 429, cae a /matches actual", async () => {
    stubFootballDataEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([footballDataMatch(20, "Londrina EC", "Athletic-MG", "FINISHED", { home: 1, away: 0 })]))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([footballDataMatch(21, "Jordan", "Algeria", "FINISHED", { home: 1, away: 2 })]));
    vi.stubGlobal("fetch", fetchMock);

    const response = await getFootballDataResults();

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(String(fetchMock.mock.calls[5][0])).toBe("https://api.football-data.org/v4/matches");
    expect(response.message).toContain("se usó /matches actual");
    expect(response.results.filter((result) => result.provider === "football-data")).toHaveLength(1);
    warnSpy.mockRestore();
  });

  it("discover reporta estrategia, totales y coincidencias", async () => {
    stubFootballDataEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(okResponse([footballDataMatch(19, "Jordan", "Algeria", "FINISHED", { home: 1, away: 2 })]))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const discovery = await discoverFootballDataMatches();

    expect(discovery.strategy).toBe("windows");
    expect(discovery.total).toBe(1);
    expect(discovery.windowSuccessCount).toBe(4);
    expect(discovery.matchingFixtures).toHaveLength(1);
  });

  it("sin token falla controlado", async () => {
    await expect(getFootballDataResults()).rejects.toThrow("football-data.org sin token");
  });
});
