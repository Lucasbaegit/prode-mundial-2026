import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface EnvValues {
  VITE_API_FOOTBALL_KEY?: string;
  VITE_API_FOOTBALL_BASE_URL?: string;
  VITE_API_FOOTBALL_SEASON?: string;
}

interface LeaguePayload {
  response?: Array<{
    league: {
      id: number;
      name: string;
      type?: string;
    };
    country?: {
      name?: string;
    };
    seasons?: Array<{
      year: number;
    }>;
  }>;
}

const env = readEnvLocal(process.cwd());
const apiKey = env.VITE_API_FOOTBALL_KEY?.trim();
const baseUrl = env.VITE_API_FOOTBALL_BASE_URL?.trim() || "https://v3.football.api-sports.io";
const season = env.VITE_API_FOOTBALL_SEASON?.trim() || "2026";

if (!apiKey) {
  console.error("Falta VITE_API_FOOTBALL_KEY en .env.local.");
  process.exitCode = 1;
} else {
  const url = new URL("/leagues", baseUrl);
  url.searchParams.set("search", "World Cup");

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football respondió ${response.status}.`);
    }

    const payload = (await response.json()) as LeaguePayload;
    const candidates = (payload.response ?? []).filter((candidate) =>
      candidate.seasons?.some((candidateSeason) => String(candidateSeason.year) === season)
    );

    if (candidates.length === 0) {
      console.log(`No se encontraron ligas World Cup con temporada ${season}.`);
    } else {
      console.log(`Candidatas World Cup para temporada ${season}:`);
      candidates.forEach((candidate) => {
        console.log(
          `- id=${candidate.league.id} | nombre=${candidate.league.name} | país=${
            candidate.country?.name ?? "N/D"
          } | tipo=${candidate.league.type ?? "N/D"}`
        );
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
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
