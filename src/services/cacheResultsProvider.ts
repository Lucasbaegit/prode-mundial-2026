import type { ActualResult, ResultProviderName, ResultsProvider } from "../types/prode";

const REAL_RESULTS_CACHE_KEY = "prode:lastRealResults";
const REAL_RESULTS_UPDATED_AT_KEY = "prode:lastRealResultsUpdatedAt";
const REAL_RESULTS_PROVIDER_KEY = "prode:lastRealProvider";

export interface CachedResultsPayload {
  results: ActualResult[];
  updatedAt: string;
  provider: ResultProviderName;
}

export const cacheResultsProvider: ResultsProvider = {
  async getResults() {
    const cached = getCachedResults();
    if (!cached) {
      throw new Error("No hay cache real de resultados.");
    }

    return cached.results;
  }
};

export function getCachedResults(): CachedResultsPayload | null {
  if (!canUseLocalStorage()) return null;

  const rawResults = localStorage.getItem(REAL_RESULTS_CACHE_KEY);
  const updatedAt = localStorage.getItem(REAL_RESULTS_UPDATED_AT_KEY);
  const provider = localStorage.getItem(REAL_RESULTS_PROVIDER_KEY) as ResultProviderName | null;
  if (!rawResults || !updatedAt || !isCacheableRealProvider(provider)) return null;

  try {
    const results = JSON.parse(rawResults) as ActualResult[];

    if (!Array.isArray(results)) {
      return null;
    }

    return { results, updatedAt, provider };
  } catch {
    return null;
  }
}

type CacheableRealProvider = Extract<ResultProviderName, "api-football" | "sportmonks" | "football-data">;

export function saveRealResultsToCache(results: ActualResult[], provider: CacheableRealProvider): void {
  if (!canUseLocalStorage()) return;
  if (!results.some((result) => result.provider === provider)) return;

  const updatedAt = new Date().toISOString();
  localStorage.setItem(REAL_RESULTS_CACHE_KEY, JSON.stringify(results));
  localStorage.setItem(REAL_RESULTS_UPDATED_AT_KEY, updatedAt);
  localStorage.setItem(REAL_RESULTS_PROVIDER_KEY, provider);
}

function isCacheableRealProvider(provider: ResultProviderName | null): provider is CacheableRealProvider {
  return provider === "api-football" || provider === "sportmonks" || provider === "football-data";
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}
