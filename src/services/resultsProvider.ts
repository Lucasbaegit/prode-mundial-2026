import { matches } from "../data/matches";
import type {
  ActualResult,
  RequestedResultsProvider,
  ResultProviderName,
  ResultsLoadState
} from "../types/prode";
import { createPendingResults } from "../utils/pendingResults";
import { getLatestResultUpdate } from "../utils/scoring";
import { apiFootballProvider } from "./apiFootballProvider";
import { saveRealResultsToCache } from "./cacheResultsProvider";
import { manualResultsProvider } from "./manualResultsProvider";
import { mockResultsProvider } from "./mockResultsProvider";
import { sportmonksProvider } from "./sportmonksProvider";

type RealProvider = "api-football" | "sportmonks" | "manual-real";

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

  const attempts: string[] = [];
  const providerOrder = getProviderOrder(requestedProvider);

  for (const provider of providerOrder) {
    try {
      const results = await loadFromProvider(provider);
      assertProviderHasRealData(results, provider);

      if (provider === "api-football" || provider === "sportmonks") {
        saveRealResultsToCache(results, provider);
      }

      return createLoadState(
        results,
        provider,
        requestedProvider,
        getSuccessLabel(provider),
        getSuccessMessage(provider),
        attempts.length > 0 ? attempts.join(" | ") : undefined,
        provider === "api-football" || provider === "sportmonks"
      );
    } catch (error) {
      attempts.push(error instanceof Error ? error.message : String(error));
    }
  }

  return createPendingFallbackState(requestedProvider, attempts);
}

function getProviderOrder(requestedProvider: RequestedResultsProvider): RealProvider[] {
  if (requestedProvider === "sportmonks") return ["sportmonks", "manual-real"];
  if (requestedProvider === "manual-real") return ["manual-real"];
  if (requestedProvider === "api-football") return ["api-football", "sportmonks", "manual-real"];
  return ["api-football", "sportmonks", "manual-real"];
}

async function loadFromProvider(provider: RealProvider): Promise<ActualResult[]> {
  if (provider === "api-football") return apiFootballProvider.getResults();
  if (provider === "sportmonks") return sportmonksProvider.getResults();
  return manualResultsProvider.getResults();
}

function assertProviderHasRealData(results: ActualResult[], provider: RealProvider): void {
  if (results.length === 0) {
    throw new Error(`${provider}: no devolvió resultados reales.`);
  }

  if (!results.some((result) => result.provider === provider)) {
    throw new Error(`${provider}: no devolvió fixtures mapeables.`);
  }
}

function createPendingFallbackState(
  requestedProvider: RequestedResultsProvider,
  attempts: string[]
): ResultsLoadState {
  const apiFootballNoFixtures = attempts.some((attempt) =>
    attempt.includes("API-Football conectada, pero sin fixtures disponibles")
  );
  const message = apiFootballNoFixtures
    ? "API-Football conectada, pero sin fixtures disponibles. No hubo Sportmonks ni CSV real disponible."
    : "No hay fuente real configurada o disponible. Todos los partidos quedan pendientes.";

  return createLoadState(
    createPendingResults(matches),
    "pending",
    requestedProvider,
    "Sin fuente real: partidos pendientes",
    message,
    attempts.join(" | ") || undefined,
    false
  );
}

function createLoadState(
  results: ActualResult[],
  provider: ResultProviderName,
  requestedProvider: RequestedResultsProvider,
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

function getRequestedProvider(): RequestedResultsProvider {
  const configuredProvider = import.meta.env.VITE_RESULTS_PROVIDER;
  if (
    configuredProvider === "api-football" ||
    configuredProvider === "sportmonks" ||
    configuredProvider === "manual-real" ||
    configuredProvider === "mock"
  ) {
    return configuredProvider;
  }

  return "auto";
}

function getSuccessLabel(provider: RealProvider): string {
  const labels: Record<RealProvider, string> = {
    "api-football": "Resultados reales vía API-Football",
    sportmonks: "Resultados reales vía Sportmonks",
    "manual-real": "Resultados reales desde CSV"
  };

  return labels[provider];
}

function getSuccessMessage(provider: RealProvider): string {
  const messages: Record<RealProvider, string> = {
    "api-football": "API-Football devolvió fixtures mapeables.",
    sportmonks: "Sportmonks devolvió fixtures mapeables.",
    "manual-real": "Se usó el CSV real sincronizado desde data/results_csv."
  };

  return messages[provider];
}
