import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface EnvValues {
  SPORTMONKS_API_TOKEN?: string;
  SPORTMONKS_BASE_URL?: string;
}

interface LeaguePayload {
  data?: Array<{
    id: number;
    name: string;
    country?: {
      name?: string;
    };
    seasons?: Array<{
      id?: number;
      name?: string;
      year?: number;
    }>;
  }>;
}

const env = readEnvLocal(process.cwd());
const apiToken = env.SPORTMONKS_API_TOKEN?.trim();
const baseUrl = env.SPORTMONKS_BASE_URL?.trim() || "https://api.sportmonks.com/v3/football";

if (!apiToken) {
  console.error("Falta SPORTMONKS_API_TOKEN en .env.local.");
  process.exitCode = 1;
} else {
  const url = buildSportmonksUrl(baseUrl, "/leagues/search/World Cup");
  url.searchParams.set("api_token", apiToken);
  url.searchParams.set("include", "country;seasons");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Sportmonks respondió ${response.status}.`);
    }

    const payload = (await response.json()) as LeaguePayload;
    const leagues = payload.data ?? [];
    if (leagues.length === 0) {
      console.log("No se encontraron competiciones World Cup en Sportmonks.");
    } else {
      console.log("Candidatas Sportmonks World Cup:");
      leagues.forEach((league) => {
        const seasons = league.seasons?.map((season) => `${season.id ?? "N/D"}:${season.name ?? season.year ?? "N/D"}`).join(", ");
        console.log(
          `- id=${league.id} | nombre=${league.name} | país=${league.country?.name ?? "N/D"} | temporadas=${
            seasons || "N/D"
          }`
        );
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

function buildSportmonksUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(`${normalizedBaseUrl}/${normalizedPath}`);
}

function readEnvLocal(projectRoot: string): EnvValues {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return {};

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key, valueParts.join("=").replace(/^["']|["']$/g, "")];
      })
  ) as EnvValues;
}
