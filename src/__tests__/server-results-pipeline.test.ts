import { afterEach, describe, expect, it, vi } from "vitest";
import { matches } from "../data/matches";
import type { ActualResult } from "../types/prode";
import type { ServerProviderResult, ServerResultsResponse } from "../../server/types";
import type { ResultsCacheEntry } from "../../server/utils/resultsCache";

function resultsWithRealCount(count: number, provider: "football-data" | "manual-real" = "football-data"): ActualResult[] {
  const updatedAt = "2026-06-20T18:00:00Z";

  return matches.map((match, index) =>
    index < count
      ? {
          matchId: match.id,
          status: index % 3 === 0 ? "finished" : index % 3 === 1 ? "live" : "scheduled",
          homeGoals: index % 3 === 2 ? null : 1,
          awayGoals: index % 3 === 2 ? null : 0,
          outcome: index % 3 === 0 ? "L" : null,
          provider,
          updatedAt
        }
      : {
          matchId: match.id,
          status: "scheduled",
          homeGoals: null,
          awayGoals: null,
          outcome: null,
          provider: "pending",
          updatedAt
        }
  );
}

function providerResult(count: number): ServerProviderResult {
  return {
    source: "football-data",
    message: `Resultados reales vía football-data.org. Coincidencias: ${count}.`,
    results: resultsWithRealCount(count)
  };
}

function cacheEntry(count: number, ageSeconds: number, isFresh: boolean): ResultsCacheEntry {
  return {
    response: {
      source: "cache",
      status: "ok",
      message: "Usando cache real",
      updatedAt: "2026-06-20T18:00:00Z",
      results: resultsWithRealCount(count)
    },
    ageSeconds,
    isFresh
  };
}

describe("server results pipeline con cache TTL", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("../../server/providers/apiFootballServerProvider");
    vi.doUnmock("../../server/providers/sportmonksServerProvider");
    vi.doUnmock("../../server/providers/footballDataServerProvider");
    vi.doUnmock("../../server/providers/manualResultsServerProvider");
    vi.doUnmock("../../server/utils/resultsCache");
  });

  it("cache fresca evita consultar football-data", async () => {
    const getFootballDataResults = vi.fn();
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({ getFootballDataResults }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({ getManualResults: vi.fn() }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(cacheEntry(53, 120, true)),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("cache");
    expect(response.meta.cacheHit).toBe(true);
    expect(response.meta.fetchedFromProvider).toBe(false);
    expect(response.meta.cacheAgeSeconds).toBe(120);
    expect(response.meta.realResultsCount).toBe(53);
    expect(response.meta.pendingWithoutRealDataCount).toBe(19);
    expect(getFootballDataResults).not.toHaveBeenCalled();
  });

  it("refresh=true fuerza consultar football-data aunque haya cache fresca", async () => {
    const getFootballDataResults = vi.fn().mockResolvedValue(providerResult(54));
    const writeResultsCache = vi.fn();
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({ getFootballDataResults }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({ getManualResults: vi.fn() }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(cacheEntry(53, 120, true)),
      writeResultsCache
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse({ forceRefresh: true });

    expect(response.source).toBe("football-data");
    expect(response.meta.fetchedFromProvider).toBe(true);
    expect(response.meta.cacheHit).toBe(false);
    expect(response.meta.realResultsCount).toBe(54);
    expect(getFootballDataResults).toHaveBeenCalled();
    expect(writeResultsCache).toHaveBeenCalled();
  });

  it("cache vencida consulta provider y actualiza cache si provider responde", async () => {
    const getFootballDataResults = vi.fn().mockResolvedValue(providerResult(55));
    const writeResultsCache = vi.fn();
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({ getFootballDataResults }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({ getManualResults: vi.fn() }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(cacheEntry(53, 900, false)),
      writeResultsCache
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("football-data");
    expect(response.meta.realResultsCount).toBe(55);
    expect(getFootballDataResults).toHaveBeenCalled();
    expect(writeResultsCache).toHaveBeenCalled();
  });

  it("provider falla y cache vencida usa cache fallback", async () => {
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org: HTTP 500."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({ getManualResults: vi.fn() }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(cacheEntry(53, 900, false)),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("cache");
    expect(response.message).toBe("Usando cache real vencida");
    expect(response.meta.cacheHit).toBe(true);
    expect(response.meta.fetchedFromProvider).toBe(true);
    expect(response.meta.cacheAgeSeconds).toBe(900);
  });

  it("pending no se guarda como cache real y meta cuenta pendientes", async () => {
    const writeResultsCache = vi.fn();
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockRejectedValue(new Error("football-data.org sin token."))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({
      getManualResults: vi.fn().mockRejectedValue(new Error("CSV manual: no hay resultados reales sincronizados."))
    }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response = await getResultsResponse();

    expect(response.source).toBe("pending");
    expect(response.meta.realResultsCount).toBe(0);
    expect(response.meta.pendingWithoutRealDataCount).toBe(72);
    expect(response.meta.fetchedFromProvider).toBe(true);
    expect(writeResultsCache).not.toHaveBeenCalled();
    expect(response.message).not.toContain("API-Football");
    expect(response.message).not.toContain("Sportmonks");
  });

  it("meta calcula estados y pendientes con resultados mixtos", async () => {
    vi.doMock("../../server/providers/footballDataServerProvider", () => ({
      getFootballDataResults: vi.fn().mockResolvedValue(providerResult(6))
    }));
    vi.doMock("../../server/providers/manualResultsServerProvider", () => ({ getManualResults: vi.fn() }));
    vi.doMock("../../server/utils/resultsCache", () => ({
      getResultsCacheTtlSeconds: vi.fn().mockReturnValue(600),
      readResultsCache: vi.fn().mockReturnValue(null),
      writeResultsCache: vi.fn()
    }));

    const { getResultsResponse } = await import("../../server/resultsPipeline");
    const response: ServerResultsResponse = await getResultsResponse();

    expect(response.meta.totalMatches).toBe(72);
    expect(response.meta.realResultsCount).toBe(6);
    expect(response.meta.pendingWithoutRealDataCount).toBe(66);
    expect(response.meta.finishedCount).toBe(2);
    expect(response.meta.liveCount).toBe(2);
    expect(response.meta.scheduledCount).toBe(68);
  });
});
