import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActualResult } from "../types/prode";

const apiResult: ActualResult = {
  matchId: "A1",
  status: "finished",
  homeGoals: 1,
  awayGoals: 0,
  outcome: "L",
  provider: "api-football",
  updatedAt: "2026-06-11T20:00:00Z"
};

const sportmonksResult: ActualResult = {
  ...apiResult,
  provider: "sportmonks"
};

const footballDataResult: ActualResult = {
  ...apiResult,
  provider: "football-data"
};

const manualResult: ActualResult = {
  ...apiResult,
  provider: "manual-real"
};

describe("server results pipeline", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("../../server/providers/apiFootballServerProvider");
    vi.doUnmock("../../server/providers/sportmonksServerProvider");
    vi.doUnmock("../../server/providers/footballDataServerProvider");
    vi.doUnmock("../../server/providers/manualResultsServerProvider");
    vi.doUnmock("../../server/utils/resultsCache");
  });

  it("API-Football results=0 pasa a Sportmonks", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "auto");
    vi.doMock("../../server/providers/apiFootballServerProvider", () => ({
      getApiFootballResults: vi.fn().mockRejectedValue(new Error("API-Football conectada, pero sin fixtures disponibles."))
    }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({
      getSportmonksResults: vi.fn().mockResolvedValue({
        source: "sportmonks",
        message: "Resultados reales vía Sportmonks.",
        results: [sportmonksResult]
      })
    }));
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(
        new Error("football-data.org conectado, pero sin partidos coincidentes con el fixture local.")
      )
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockRejectedValue(new Error("missing csv"))
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("sportmonks");
    expect(response.status).toBe("ok");
  });

  it("Sportmonks sin datos pasa a football-data.org", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "auto");
    vi.doMock("../../server/providers/apiFootballServerProvider", () => ({
      getApiFootballResults: vi.fn().mockRejectedValue(new Error("API-Football conectada, pero sin fixtures disponibles."))
    }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({
      getSportmonksResults: vi.fn().mockRejectedValue(new Error("Sportmonks: respuesta valida, pero data vacia."))
    }));
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockResolvedValue({
        source: "football-data",
        message: "Resultados reales via football-data.org /matches",
        results: [footballDataResult]
      })
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockRejectedValue(new Error("missing csv"))
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("football-data");
    expect(response.message).toContain("football-data.org /matches");
  });

  it("Sportmonks NetworkError no ocurre en browser y server lo maneja como fallback a CSV", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "sportmonks");
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(
        new Error("football-data.org conectado, pero sin partidos coincidentes con el fixture local.")
      )
    }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({
      getSportmonksResults: vi.fn().mockRejectedValue(new Error("Sportmonks: respuesta válida, pero data vacía."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockResolvedValue({
        source: "manual-real",
        message: "APIs sin datos; usando CSV real.",
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
    expect(response.message).toContain("APIs sin datos");
  });

  it("backend sin tokens ni CSV devuelve pending", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "auto");
    vi.doMock("../../server/providers/apiFootballServerProvider", () => ({
      getApiFootballResults: vi.fn().mockRejectedValue(new Error("API-Football: token faltante."))
    }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({
      getSportmonksResults: vi.fn().mockRejectedValue(new Error("Sportmonks: token faltante."))
    }));
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org: token faltante."))
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
  });

  it("football-data.org OK guarda cache y responde football-data", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "football-data");
    const writeResultsCache = vi.fn();
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockResolvedValue({
        source: "football-data",
        message: "Resultados reales via football-data.org /matches",
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
    expect(writeResultsCache).toHaveBeenCalled();
  });

  it("API-Football OK guarda cache y responde api-football", async () => {
    vi.stubEnv("RESULTS_PROVIDER", "api-football");
    const writeResultsCache = vi.fn();
    vi.doMock("../../server/providers/apiFootballServerProvider", () => ({
      getApiFootballResults: vi.fn().mockResolvedValue({
        source: "api-football",
        message: "Resultados reales vía API-Football.",
        results: [apiResult]
      })
    }));
    vi.doMock("../../server/providers/sportmonksServerProvider", () => ({
      getSportmonksResults: vi.fn()
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("api-football");
    expect(writeResultsCache).toHaveBeenCalled();
  });
});
