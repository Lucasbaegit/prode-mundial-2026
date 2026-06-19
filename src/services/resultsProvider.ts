import { matches } from "../data/matches";
import type { ActualResult, ResultProviderName, ResultsLoadState } from "../types/prode";
import { createPendingResults } from "../utils/pendingResults";
import { getLatestResultUpdate } from "../utils/scoring";
import { apiFootballProvider, getApiFootballConfig } from "./apiFootballProvider";
import { getCachedResults, saveRealResultsToCache } from "./cacheResultsProvider";
import { mockResultsProvider } from "./mockResultsProvider";

export async function loadResultsWithFallback(): Promise<ResultsLoadState> {
  const requestedProvider = getRequestedProvider();

  if (requestedProvider === "mock") {
    const results = await mockResultsProvider.getResults();
    return createLoadState(
      results,
      "mock",
      requestedProvider,
      "Modo demo explícito: partidos pendientes",
      "El mock visible no contiene resultados inventados.",
      undefined,
      false
    );
  }

  const config = getApiFootballConfig();
  if (!config.apiKey) {
    return createPendingFallbackState(
      requestedProvider,
      "Sin API configurada: partidos pendientes",
      "Crear .env.local con VITE_API_FOOTBALL_KEY para consultar resultados reales.",
      "missing-config: falta VITE_API_FOOTBALL_KEY."
    );
  }

  try {
    const results = await apiFootballProvider.getResults();
    saveRealResultsToCache(results);
    return createLoadState(
      results,
      "api-football",
      requestedProvider,
      "Resultados reales vía API-Football",
      "Cache real actualizado si la API devolvió fixtures mapeables.",
      undefined,
      true
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido de API-Football.";
    return loadRealCacheOrPending(requestedProvider, message);
  }
}

function loadRealCacheOrPending(
  requestedProvider: "mock" | "api-football",
  errorMessage: string
): ResultsLoadState {
  const cached = getCachedResults();
  if (cached) {
    return createLoadState(
      cached.results,
      "cache",
      requestedProvider,
      "API no disponible: usando último cache real",
      "Estos resultados vienen de la última respuesta real guardada.",
      errorMessage,
      true
    );
  }

  return createPendingFallbackState(
    requestedProvider,
    "API no disponible: sin resultados reales",
    "No hay cache real; todos los partidos quedan pendientes.",
    errorMessage
  );
}

function createPendingFallbackState(
  requestedProvider: "mock" | "api-football",
  label: string,
  message: string,
  error?: string
): ResultsLoadState {
  const results = createPendingResults(matches);
  return createLoadState(results, "pending", requestedProvider, label, message, error, false);
}

function createLoadState(
  results: ActualResult[],
  provider: ResultProviderName,
  requestedProvider: "mock" | "api-football",
  label: string,
  message: string | undefined,
  error: string | undefined,
  canPoll: boolean
): ResultsLoadState {
  return {
    results,
    provider,
    requestedProvider,
    label,
    message,
    error,
    updatedAt: getLatestResultUpdate(results) ?? new Date().toISOString(),
    canPoll
  };
}

function getRequestedProvider(): "mock" | "api-football" {
  return import.meta.env.VITE_RESULTS_PROVIDER === "mock" ? "mock" : "api-football";
}
