import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActualResult } from "../types/prode";
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

describe("frontend resultsProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("consume el backend local y normaliza ResultsLoadState", async () => {
    vi.stubEnv("VITE_RESULTS_API_URL", "http://localhost:8787/api/results");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        source: "manual-real",
        status: "ok",
        message: "APIs sin datos; usando CSV real.",
        updatedAt: "2026-06-11T20:00:00Z",
        results: [finishedResult]
      })
    });

    const state = await loadResultsWithFallback();

    expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:8787/api/results");
    expect(state.provider).toBe("manual-real");
    expect(state.label).toBe("Resultados reales desde CSV");
    expect(state.results).toEqual([finishedResult]);
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
