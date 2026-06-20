import type { ServerProviderResult, ServerResultsResponse } from "./types";
import { getApiFootballResults } from "./providers/apiFootballServerProvider";
import { getManualResults } from "./providers/manualResultsServerProvider";
import { getPendingResults } from "./providers/pendingServerProvider";
import { getSportmonksResults } from "./providers/sportmonksServerProvider";
import { readResultsCache, writeResultsCache } from "./utils/resultsCache";

type ProviderName = "api-football" | "sportmonks" | "manual-real";

export async function getResultsResponse(): Promise<ServerResultsResponse> {
  const configuredProvider = normalizeProvider(process.env.RESULTS_PROVIDER);
  const providerOrder = getProviderOrder(configuredProvider);
  const attempts: string[] = [];

  for (const provider of providerOrder) {
    try {
      const providerResult = await getProviderResult(provider);
      const response = toResponse(providerResult, attempts);

      if (provider === "api-football" || provider === "sportmonks") {
        writeResultsCache(response);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[results] ${message}`);
      attempts.push(message);
    }

    if (provider === "sportmonks") {
      const cached = readResultsCache();
      if (cached) {
        return {
          ...cached,
          status: "ok",
          message: `APIs no disponibles; usando cache real. ${attempts.join(" | ")}`
        };
      }
    }
  }

  return getPendingResults("Sin fuente real: partidos pendientes.", attempts.join(" | "));
}

function normalizeProvider(value: string | undefined): "auto" | ProviderName {
  if (value === "api-football" || value === "sportmonks" || value === "manual-real") return value;
  return "auto";
}

function getProviderOrder(provider: "auto" | ProviderName): ProviderName[] {
  if (provider === "api-football") return ["api-football", "sportmonks", "manual-real"];
  if (provider === "sportmonks") return ["sportmonks", "manual-real"];
  if (provider === "manual-real") return ["manual-real"];
  return ["api-football", "sportmonks", "manual-real"];
}

async function getProviderResult(provider: ProviderName): Promise<ServerProviderResult> {
  if (provider === "api-football") return getApiFootballResults();
  if (provider === "sportmonks") return getSportmonksResults();
  return getManualResults();
}

function toResponse(providerResult: ServerProviderResult, attempts: string[]): ServerResultsResponse {
  const updatedAt = new Date().toISOString();
  return {
    source: providerResult.source,
    status: "ok",
    message:
      attempts.length > 0
        ? `${providerResult.message} Intentos previos: ${attempts.join(" | ")}`
        : providerResult.message,
    updatedAt,
    results: providerResult.results
  };
}
