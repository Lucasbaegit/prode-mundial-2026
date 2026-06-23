import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActualResult } from "../types/prode";
import type { ServerResultsResponse } from "../../server/types";

const footballDataResult: ActualResult = {
  matchId: "C4",
  status: "finished",
  homeGoals: 3,
  awayGoals: 0,
  outcome: "L",
  provider: "football-data",
  updatedAt: "2026-06-20T18:00:00Z"
};

const manualResult: ActualResult = {
  ...footballDataResult,
  provider: "manual-real"
};

const cachedResponse: ServerResultsResponse = {
  source: "cache",
  status: "ok",
  message: "Usando cache real",
  updatedAt: "2026-06-20T18:00:00Z",
  results: [footballDataResult]
};

describe("server results pipeline simplificado", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("../../server/providers/apiFootballServerProvider");
    vi.doUnmock("../../server/providers/sportmonksServerProvider");
    vi.doUnmock("../../server/providers/footballDataServerProvider");
    vi.doUnmock("../../server/providers/manualResultsServerProvider");
    vi.doUnmock("../../server/utils/resultsCache");
  });

  it("usa football-data como provider activo y no ejecuta API-Football ni Sportmonks", async () => {
    const getApiFootballResults = vi.fn();
    const getSportmonksResults = vi.fn();
    const writeResultsCache = vi.fn();

    vi.stubEnv("RESULTS_PROVIDER", "auto");
    vi.doMock("../../server/providers/apiFootballServerProvider", () => ({ getApiFootballResults }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({ getSportmonksResults }));
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockResolvedValue({
        source: "football-data",
        message: "Resultados reales vía football-data.org",
        results: [footballDataResult]
      })
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn()
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("football-data");
    expect(response.message).toBe("Resultados reales vía football-data.org");
    expect(writeResultsCache).toHaveBeenCalled();
    expect(getApiFootballResults).not.toHaveBeenCalled();
    expect(getSportmonksResults).not.toHaveBeenCalled();
  });

  it("usa cache real si football-data falla", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "football-data");
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org conectado, pero sin partidos coincidentes."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn()
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(cachedResponse),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("cache");
    expect(response.message).toBe("Usando cache real");
    expect(response.results).toEqual([footballDataResult]);
  });

  it("usa CSV real si football-data falla y no hay cache", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "football-data");
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org conectado, pero sin partidos coincidentes."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockResolvedValue({
        source: "manual-real",
        message: "Usando CSV real",
        results: [manualResult]
      })
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("manual-real");
    expect(response.message).toBe("Usando CSV real");
  });

  it("sin token ni CSV devuelve pending sin mencionar API-Football ni Sportmonks", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "football-data");
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org sin token."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockRejectedValue(new Error("CSV manual: no hay resultados reales sincronizados."))
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("pending");
    expect(response.status).toBe("no-data");
    expect(response.results).toHaveLength(72);
    expect(response.message).toContain("football-data.org sin token");
    expect(response.message).not.toContain("API-Football");
    expect(response.message).not.toContain("Sportmonks");
  });
});
