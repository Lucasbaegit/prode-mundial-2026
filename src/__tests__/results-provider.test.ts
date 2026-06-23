import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActualResult, ResultsMeta } from "../types/prode";
import { loadResultsWithFallback } from "../services/resultsProvider";

const finishedResult: ActualResult = {
  matchId: "A1",
  status: "finished",
  homeGoals: 2,
  awayGoals: 0,
  outcome: "L",
  provider: "manual-real",
  updatedAt: "2026-06-11T20:00:00Z"
};

const baseMeta: ResultsMeta = {
  totalMatches: 72,
  realResultsCount: 1,
  finishedCount: 1,
  liveCount: 0,
  scheduledCount: 71,
  pendingWithoutRealDataCount: 71,
  provider: "manual-real",
  cacheHit: false,
  cacheAgeSeconds: null,
  cacheTtlSeconds: 600,
  fetchedFromProvider: false
};

describe("frontend resultsProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("consume el backend local y normaliza ResultsLoadState con meta", async () => {
    vi.stubEnv("VITE_RESULTS_API_URL", "http://localhost:8787/api/results");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        source: "manual-real",
        status: "ok",
        message: "Usando CSV real",
        updatedAt: "2026-06-11T20:00:00Z",
        results: [finishedResult],
        meta: baseMeta
      })
    });

    const state = await loadResultsWithFallback();

    expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:8787/api/results");
    expect(state.provider).toBe("manual-real");
    expect(state.label).toBe("Resultados reales desde CSV");
    expect(state.results).toEqual([finishedResult]);
    expect(state.meta?.realResultsCount).toBe(1);
  });

  it("forceRefresh agrega refresh=true para el boton actualizar", async () => {
    vi.stubEnv("VITE_RESULTS_API_URL", "http://localhost:8787/api/results");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        source: "football-data",
        status: "ok",
        message: "Resultados reales vía football-data.org",
        updatedAt: "2026-06-20T18:00:00Z",
        results: [{ ...finishedResult, provider: "football-data" }],
        meta: { ...baseMeta, provider: "football-data", fetchedFromProvider: true }
      })
    });

    const state = await loadResultsWithFallback(true);

    expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:8787/api/results?refresh=true");
    expect(state.provider).toBe("football-data");
    expect(state.label).toBe("Resultados reales vía football-data.org");
    expect(state.canPoll).toBe(true);
  });

  it("frontend maneja backend no disponible con pending", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("pending");
    expect(state.label).toBe("Backend local no disponible");
    expect(state.message).toBe("Backend local no disponible. No se pudieron actualizar resultados reales.");
    expect(state.results).toHaveLength(72);
    expect(state.results.every((result) => result.status === "scheduled")).toBe(true);
  });
});
