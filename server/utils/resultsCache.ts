import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ActualResult, ResultProviderName } from "../../src/types/prode";
import type { ServerResultsResponse } from "../types";

const cacheFile = join(process.cwd(), "data", "cache", "results-cache.json");
const defaultCacheTtlSeconds = 600;

interface CachedResultsFile {
  source?: ResultProviderName;
  status?: "ok" | "no-data" | "error";
  message?: string;
  updatedAt?: string;
  results?: ActualResult[];
}

export interface ResultsCacheEntry {
  response: Omit<ServerResultsResponse, "meta">;
  ageSeconds: number;
  isFresh: boolean;
}

export function readResultsCache(ttlSeconds = getResultsCacheTtlSeconds()): ResultsCacheEntry | null {
  if (!existsSync(cacheFile)) return null;

  try {
    const payload = JSON.parse(readFileSync(cacheFile, "utf8")) as CachedResultsFile;
    if (!Array.isArray(payload.results) || !payload.updatedAt || !payload.source) return null;
    if (!isCacheableSource(payload.source)) return null;

    const updatedAtMs = Date.parse(payload.updatedAt);
    if (!Number.isFinite(updatedAtMs)) return null;

    const ageSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));

    return {
      response: {
        source: "cache",
        status: "ok",
        message: "Usando cache real",
        updatedAt: payload.updatedAt,
        results: payload.results
      },
      ageSeconds,
      isFresh: ageSeconds < ttlSeconds
    };
  } catch {
    return null;
  }
}

export function writeResultsCache(response: ServerResultsResponse): void {
  if (!isCacheableSource(response.source)) return;
  if (!response.results.some((result) => result.provider && result.provider !== "pending")) return;

  const existingCache = readResultsCache(Number.MAX_SAFE_INTEGER);
  if (existingCache && countRealResults(existingCache.response.results) > countRealResults(response.results)) {
    return;
  }

  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(
    cacheFile,
    JSON.stringify(
      {
        source: response.source,
        status: response.status,
        message: response.message,
        updatedAt: response.updatedAt,
        results: response.results
      },
      null,
      2
    ),
    "utf8"
  );
}

export function getResultsCacheTtlSeconds(): number {
  const configuredTtl = Number(process.env.RESULTS_CACHE_TTL_SECONDS ?? defaultCacheTtlSeconds);
  if (!Number.isFinite(configuredTtl) || configuredTtl < 0) return defaultCacheTtlSeconds;
  return Math.floor(configuredTtl);
}

function isCacheableSource(source: ResultProviderName): source is "football-data" | "manual-real" {
  return source === "football-data" || source === "manual-real";
}

function countRealResults(results: ActualResult[]): number {
  return results.filter((result) => result.provider && result.provider !== "pending").length;
}
