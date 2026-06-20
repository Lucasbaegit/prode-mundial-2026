import { matches } from "../../src/data/matches";
import { createPendingResults } from "../../src/utils/pendingResults";
import type { ServerResultsResponse } from "../types";

export function getPendingResults(message: string, error?: string): ServerResultsResponse {
  const updatedAt = new Date().toISOString();
  return {
    source: "pending",
    status: "no-data",
    message: error ? `${message} ${error}` : message,
    updatedAt,
    results: createPendingResults(matches, updatedAt)
  };
}
