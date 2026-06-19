import type { ActualResult, ResultProviderName, ResultsProvider } from "../types/prode";

const RESULTS_CACHE_KEY = "prode-2026:last-results";
const RESULTS_CACHE_META_KEY = "prode-2026:last-results-meta";

export interface CachedResultsPayload {
  results: ActualResult[];
  updatedAt: string;
  provider: ResultProviderName;
}

export const cacheResultsProvider: ResultsProvider = {
  async getResults() {
    const cached = getCachedResults();
    if (!cached) {
      throw new Error("No hay cache local de resultados.");
    }

    return cached.results;
  }
};

export function getCachedResults(): CachedResultsPayload | null {
  if (!canUseLocalStorage()) return null;

  const rawResults = localStorage.getItem(RESULTS_CACHE_KEY);
  const rawMeta = localStorage.getItem(RESULTS_CACHE_META_KEY);
  if (!rawResults || !rawMeta) return null;

  try {
    const results = JSON.parse(rawResults) as ActualResult[];
    const meta = JSON.parse(rawMeta) as Omit<CachedResultsPayload, "results">;

    if (!Array.isArray(results) || !meta.updatedAt || !meta.provider) {
      return null;
    }

    return { results, updatedAt: meta.updatedAt, provider: meta.provider };
  } catch {
    return null;
  }
}

export function saveResultsToCache(results: ActualResult[], provider: ResultProviderName): void {
  if (!canUseLocalStorage()) return;

  const updatedAt = new Date().toISOString();
  localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(results));
  localStorage.setItem(RESULTS_CACHE_META_KEY, JSON.stringify({ updatedAt, provider }));
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}
