import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActualResult } from "../types/prode";
import { loadResultsWithFallback } from "../services/resultsProvider";
import { saveRealResultsToCache } from "../services/cacheResultsProvider";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("resultsProvider fallback real", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_RESULTS_PROVIDER", "api-football");
    vi.stubEnv("VITE_API_FOOTBALL_BASE_URL", "https://v3.football.api-sports.io");
    vi.stubEnv("VITE_API_FOOTBALL_SEASON", "2026");
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("sin API key devuelve todos los partidos pending", async () => {
    vi.stubEnv("VITE_API_FOOTBALL_KEY", "");

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("pending");
    expect(state.label).toBe("Sin API configurada: partidos pendientes");
    expect(state.canPoll).toBe(false);
    expect(state.results).toHaveLength(72);
    expect(state.results.every((result) => result.status === "scheduled")).toBe(true);
  });

  it("API falla sin cache real devuelve pending", async () => {
    vi.stubEnv("VITE_API_FOOTBALL_KEY", "test-key");
    vi.stubEnv("VITE_API_FOOTBALL_LEAGUE_ID", "999");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("pending");
    expect(state.label).toBe("API no disponible: sin resultados reales");
    expect(state.error).toBe("network down");
    expect(state.results.every((result) => result.status === "scheduled")).toBe(true);
  });

  it("API falla con cache real usa cache", async () => {
    vi.stubEnv("VITE_API_FOOTBALL_KEY", "test-key");
    vi.stubEnv("VITE_API_FOOTBALL_LEAGUE_ID", "999");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const cachedResult: ActualResult = {
      matchId: "A1",
      status: "finished",
      homeGoals: 1,
      awayGoals: 0,
      outcome: "L",
      provider: "api-football",
      updatedAt: "2026-06-19T12:00:00.000Z"
    };
    saveRealResultsToCache([cachedResult]);

    const state = await loadResultsWithFallback();

    expect(state.provider).toBe("cache");
    expect(state.label).toBe("API no disponible: usando último cache real");
    expect(state.results).toEqual([cachedResult]);
  });
});
