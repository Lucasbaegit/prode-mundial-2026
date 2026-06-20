import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ServerResultsResponse } from "../types";

const cacheFile = join(process.cwd(), "data", "cache", "results-cache.json");

export function readResultsCache(): ServerResultsResponse | null {
  if (!existsSync(cacheFile)) return null;

  try {
    const payload = JSON.parse(readFileSync(cacheFile, "utf8")) as ServerResultsResponse;
    if (!Array.isArray(payload.results) || !payload.updatedAt || !payload.source) return null;
    return {
      ...payload,
      source: "cache",
      message: `Cache real: ${payload.message}`
    };
  } catch {
    return null;
  }
}

export function writeResultsCache(response: ServerResultsResponse): void {
  if (
    response.source !== "api-football" &&
    response.source !== "sportmonks" &&
    response.source !== "football-data"
  ) {
    return;
  }
  if (!response.results.some((result) => result.provider === response.source)) return;

  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(response, null, 2), "utf8");
}
