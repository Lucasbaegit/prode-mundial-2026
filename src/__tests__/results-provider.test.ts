import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActualResult } from "../types/prode";
import { matches } from "../data/matches";
import { participants } from "../data/participants";
import { apiFootballProvider } from "../services/apiFootballProvider";
import { manualResultsProvider } from "../services/manualResultsProvider";
import { loadResultsWithFallback } from "../services/resultsProvider";
import { sportmonksProvider } from "../services/sportmonksProvider";
import { calculateRanking } from "../utils/ranking";

const manualFinishedResult: ActualResult = {
  matchId: "A1",
  status: "finished",
  homeGoals: 2,
  awayGoals: 0,
  outcome: "L",
  provider: "manual-real",
  updatedAt: "2026-06-11T20:00:00Z"
};

const sportmonksFinishedResult: ActualResult = {
  ...manualFinishedResult,
  provider: "sportmonks"
};

describe("resultsProvider multi-provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("API-Football sin fixtures pasa a Sportmonks", async () => {
    vi.stubEnv("VITE_RESULTS_PROVIDER", "api-football");
    vi.spyOn(apiFootballProvider, "getResults").mockRejectedValue(
      new Error("no-data: API-Football conectada, pero sin fixtures disponibles.")
    );
    vi.spyOn(sportmonksProvider, "getResults").mockResolvedValue([sportmonksFinishedResult]);
    const manualSpy = vi.spyOn(manualResultsProvider, "getResults").mockRejectedValue(new Error("no manual"));

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("sportmonks");
    expect(state.label).toBe("Resultados reales vía Sportmonks");
    expect(manualSpy).not.toHaveBeenCalled();
  });

  it("Sportmonks sin config pasa a CSV manual", async () => {
    vi.stubEnv("VITE_RESULTS_PROVIDER", "sportmonks");
    vi.spyOn(sportmonksProvider, "getResults").mockRejectedValue(
      new Error("missing-config: falta VITE_SPORTMONKS_API_TOKEN.")
    );
    vi.spyOn(manualResultsProvider, "getResults").mockResolvedValue([manualFinishedResult]);

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("manual-real");
    expect(state.label).toBe("Resultados reales desde CSV");
  });

  it("CSV real OK calcula ranking", () => {
    const ranking = calculateRanking(participants, matches, [manualFinishedResult]);
    const lucas = ranking.find((entry) => entry.participantId === "lucas");

    expect(lucas?.points).toBe(1);
  });

  it("sin API ni CSV devuelve todos pending", async () => {
    vi.stubEnv("VITE_RESULTS_PROVIDER", "auto");
    vi.spyOn(apiFootballProvider, "getResults").mockRejectedValue(new Error("missing api"));
    vi.spyOn(sportmonksProvider, "getResults").mockRejectedValue(new Error("missing sportmonks"));
    vi.spyOn(manualResultsProvider, "getResults").mockRejectedValue(new Error("missing csv"));

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("pending");
    expect(state.label).toBe("Sin fuente real: partidos pendientes");
    expect(state.results).toHaveLength(72);
    expect(state.results.every((result) => result.status === "scheduled")).toBe(true);
  });
});
