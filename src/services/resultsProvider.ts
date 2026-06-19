import type { ActualResult, ResultProviderName, ResultsLoadState } from "../types/prode";
import { getCachedResults, saveResultsToCache } from "./cacheResultsProvider";
import { apiFootballProvider } from "./apiFootballProvider";
import { mockResultsProvider } from "./mockResultsProvider";
import { getLatestResultUpdate } from "../utils/scoring";

export async function loadResultsWithFallback(): Promise<ResultsLoadState> {
  const requestedProvider = getRequestedProvider();

  if (requestedProvider === "mock") {
    const results = await mockResultsProvider.getResults();
    return createLoadState(results, "mock", requestedProvider, "Usando resultados mock");
  }

  if (!hasApiFootballConfig()) {
    return loadFallback(
      requestedProvider,
      "API no disponible: faltan VITE_API_FOOTBALL_KEY o VITE_API_FOOTBALL_LEAGUE_ID."
    );
  }

  try {
    const results = await apiFootballProvider.getResults();
    saveResultsToCache(results, "api-football");
    return createLoadState(results, "api-football", requestedProvider, "Usando API-Football");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido de API-Football.";
    return loadFallback(requestedProvider, message);
  }
}

async function loadFallback(
  requestedProvider: "mock" | "api-football",
  errorMessage: string
): Promise<ResultsLoadState> {
  const cached = getCachedResults();
  if (cached) {
    return createLoadState(
      cached.results,
      "cache",
      requestedProvider,
      "API no disponible, usando cache local",
      "Se usaron los últimos resultados descargados.",
      errorMessage
    );
  }

  return createMockFallbackState(requestedProvider, errorMessage);
}

async function createMockFallbackState(
  requestedProvider: "mock" | "api-football",
  errorMessage: string
): Promise<ResultsLoadState> {
  const results = await mockResultsProvider.getResults();
  return createLoadState(
    results,
    "mock",
    requestedProvider,
    "API no disponible, usando mock",
    "El mock local mantiene la app funcionando sin credenciales.",
    errorMessage
  );
}

function createLoadState(
  results: ActualResult[],
  provider: ResultProviderName,
  requestedProvider: "mock" | "api-football",
  label: string,
  message?: string,
  error?: string
): ResultsLoadState {
  return {
    results,
    provider,
    requestedProvider,
    label,
    message,
    error,
    updatedAt: getLatestResultUpdate(results) ?? new Date().toISOString()
  };
}

function getRequestedProvider(): "mock" | "api-football" {
  return import.meta.env.VITE_RESULTS_PROVIDER === "api-football" ? "api-football" : "mock";
}

function hasApiFootballConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_API_FOOTBALL_KEY?.trim() &&
      import.meta.env.VITE_API_FOOTBALL_LEAGUE_ID?.trim()
  );
}
