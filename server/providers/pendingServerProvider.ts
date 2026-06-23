import { matches } from "../../src/data/matches";
import { createPendingResults } from "../../src/utils/pendingResults";
import type { ServerResultsResponse } from "../types";
import { getResultsCacheTtlSeconds } from "../utils/resultsCache";
import { buildResultsMeta } from "../utils/resultsMeta";

export function getPendingResults(message: string, error?: string): ServerResultsResponse {
  const updatedAt = new Date().toISOString();
  const results = createPendingResults(matches, updatedAt);
  return {
    source: "pending",
    status: "no-data",
    message: error ? `${message} ${error}` : message,
    updatedAt,
    results,
    meta: buildResultsMeta({
      source: "pending",
      results,
      cacheHit: false,
      cacheAgeSeconds: null,
      cacheTtlSeconds: getResultsCacheTtlSeconds(),
      fetchedFromProvider: false
    })
  };
}
