import { matches } from "../data/matches";
import type { ResultProviderName, ResultsLoadState } from "../types/prode";
import { createPendingResults } from "../utils/pendingResults";

interface BackendResultsResponse {
  source: Exclude<ResultProviderName, "mock">;
  status: "ok" | "no-data" | "error";
  message: string;
  updatedAt: string;
  results: ResultsLoadState["results"];
}

const defaultResultsApiUrl = "http://localhost:8787/api/results";

export async function loadResultsWithFallback(): Promise<ResultsLoadState> {
  const apiUrl = import.meta.env.VITE_RESULTS_API_URL?.trim() || defaultResultsApiUrl;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Backend local respondió ${response.status}.`);
    }

    const payload = (await response.json()) as BackendResultsResponse;

    return {
      results: payload.results,
      provider: payload.source,
      requestedProvider: "auto",
      label: getBackendLabel(payload),
      message: payload.message,
      error: payload.status === "error" ? payload.message : undefined,
      updatedAt: payload.updatedAt,
      canPoll: payload.source === "api-football" || payload.source === "sportmonks"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar al backend local.";
    const updatedAt = new Date().toISOString();

    return {
      results: createPendingResults(matches, updatedAt),
      provider: "pending",
      requestedProvider: "auto",
      label: "Backend local no disponible",
      message: "Backend local no disponible. No se pudieron actualizar resultados reales.",
      error: message,
      updatedAt,
      canPoll: false
    };
  }
}

function getBackendLabel(payload: BackendResultsResponse): string {
  if (payload.source === "api-football") return "Resultados reales vía API-Football";
  if (payload.source === "sportmonks") return "Resultados reales vía Sportmonks";
  if (payload.source === "manual-real") return "Resultados reales desde CSV";
  if (payload.source === "cache") return "Backend local conectado: usando cache real";
  return "Sin fuente real: partidos pendientes";
}
