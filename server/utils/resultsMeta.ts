import { matches } from "../../src/data/matches";
import type { ActualResult, ResultsMeta } from "../../src/types/prode";
import type { ServerResultsSource } from "../types";

interface BuildResultsMetaOptions {
  source: ServerResultsSource;
  results: ActualResult[];
  cacheHit: boolean;
  cacheAgeSeconds: number | null;
  cacheTtlSeconds: number;
  fetchedFromProvider: boolean;
}

export function buildResultsMeta({
  source,
  results,
  cacheHit,
  cacheAgeSeconds,
  cacheTtlSeconds,
  fetchedFromProvider
}: BuildResultsMetaOptions): ResultsMeta {
  return {
    totalMatches: matches.length,
    realResultsCount: results.filter((result) => result.provider && result.provider !== "pending").length,
    finishedCount: results.filter((result) => result.status === "finished").length,
    liveCount: results.filter((result) => result.status === "live").length,
    scheduledCount: results.filter((result) => result.status === "scheduled").length,
    pendingWithoutRealDataCount: results.filter((result) => !result.provider || result.provider === "pending").length,
    provider: source,
    cacheHit,
    cacheAgeSeconds,
    cacheTtlSeconds,
    fetchedFromProvider
  };
}
