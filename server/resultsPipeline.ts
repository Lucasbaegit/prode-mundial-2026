import type { ServerProviderResult, ServerResultsResponse } from "./types";
import { getFootballDataResults } from "./providers/footballDataServerProvider";
import { getManualResults } from "./providers/manualResultsServerProvider";
import { getPendingResults } from "./providers/pendingServerProvider";
import {
  getResultsCacheTtlSeconds,
  readResultsCache,
  writeResultsCache,
  type ResultsCacheEntry
} from "./utils/resultsCache";
import { buildResultsMeta } from "./utils/resultsMeta";

type ProviderName = "football-data" | "manual-real";

interface ResultsResponseOptions {
  forceRefresh?: boolean;
}

export async function getResultsResponse(options: ResultsResponseOptions = {}): Promise<ServerResultsResponse> {
  const configuredProvider = normalizeProvider(process.env.RESULTS_PROVIDER);
  const providerOrder = getProviderOrder(configuredProvider);
  const attempts: string[] = [];
  const cacheTtlSeconds = getResultsCacheTtlSeconds();
  const cached = readResultsCache(cacheTtlSeconds);

  if (!options.forceRefresh && configuredProvider !== "manual-real" && cached?.isFresh) {
    return toCacheResponse(cached, cacheTtlSeconds, false);
  }

  let fetchedFromProvider = false;

  for (const provider of providerOrder) {
    try {
      if (provider === "football-data") fetchedFromProvider = true;

      const providerResult = await getProviderResult(provider);
      const response = toResponse(providerResult, {
        cacheHit: false,
        cacheAgeSeconds: null,
        cacheTtlSeconds,
        fetchedFromProvider
      });

      writeResultsCache(response);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[results] ${message}`);
      attempts.push(message);
    }

    if (provider === "football-data" && cached) {
      return toCacheResponse(cached, cacheTtlSeconds, fetchedFromProvider, !cached.isFresh);
    }
  }

  const pending = getPendingResults("Sin fuente real: partidos pendientes.", attempts.join(" | "));
  return {
    ...pending,
    meta: {
      ...pending.meta,
      cacheTtlSeconds,
      fetchedFromProvider
    }
  };
}

function normalizeProvider(value: string | undefined): "auto" | ProviderName {
  if (value === "football-data" || value === "manual-real") return value;
  return "auto";
}

function getProviderOrder(provider: "auto" | ProviderName): ProviderName[] {
  if (provider === "football-data") return ["football-data", "manual-real"];
  if (provider === "manual-real") return ["manual-real"];
  return ["football-data", "manual-real"];
}

async function getProviderResult(provider: ProviderName): Promise<ServerProviderResult> {
  if (provider === "football-data") return getFootballDataResults();
  return getManualResults();
}

function toResponse(
  providerResult: ServerProviderResult,
  metaOptions: {
    cacheHit: boolean;
    cacheAgeSeconds: number | null;
    cacheTtlSeconds: number;
    fetchedFromProvider: boolean;
  }
): ServerResultsResponse {
  const updatedAt = new Date().toISOString();
  const response = {
    source: providerResult.source,
    status: "ok" as const,
    message: providerResult.message,
    updatedAt,
    results: providerResult.results
  };

  return {
    ...response,
    meta: buildResultsMeta({
      source: response.source,
      results: response.results,
      ...metaOptions
    })
  };
}

function toCacheResponse(
  cached: ResultsCacheEntry,
  cacheTtlSeconds: number,
  fetchedFromProvider: boolean,
  expiredFallback = false
): ServerResultsResponse {
  const message = expiredFallback ? "Usando cache real vencida" : "Usando cache real";

  return {
    ...cached.response,
    message,
    meta: buildResultsMeta({
      source: "cache",
      results: cached.response.results,
      cacheHit: true,
      cacheAgeSeconds: cached.ageSeconds,
      cacheTtlSeconds,
      fetchedFromProvider
    })
  };
}
