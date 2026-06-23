import { matches } from "../src/data/matches";
import { discoverFootballDataMatches } from "../server/providers/footballDataServerProvider";
import { loadEnvLocal } from "../server/utils/env";
import { getFixtureMatchDirection, type ExternalFixture } from "../server/utils/mapResults";

loadEnvLocal(process.cwd());

const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim();

if (!token) {
  console.log("football-data.org sin token.");
} else {
  try {
    const discovery = await discoverFootballDataMatches();

    console.log(`football-data.org rango completo: GET ${discovery.fullRangePath}`);
    if (discovery.fullRangeError) {
      console.log(`Rango completo fallo: ${discovery.fullRangeError}`);
    } else {
      console.log("Rango completo OK.");
    }
    console.log(`Estrategia usada: ${formatStrategy(discovery.strategy)}`);
    console.log(`Ventanas OK: ${discovery.windowSuccessCount}/${discovery.windowAttemptCount}`);
    if (discovery.windowErrors.length > 0) {
      console.log("Errores de ventanas:");
      discovery.windowErrors.forEach((error) => console.log(`- ${error}`));
    }
    if (discovery.rateLimitHit) {
      console.log("Rate limit detectado; se cortaron ventanas restantes.");
    }
    if (discovery.currentFallbackUsed) {
      console.log(`Fallback a /matches actual. Motivo: ${discovery.currentFallbackReason ?? "no informado"}`);
      console.log("Nota: /matches sin rango puede traer solo partidos del dia/current.");
    }
    console.log(`Total externo devuelto: ${discovery.total}`);
    console.log(`Total coincidente con fixture local: ${discovery.matchingFixtures.length}`);

    const matchingPreview = discovery.matchingFixtures.slice(0, 20);
    if (matchingPreview.length === 0) {
      console.log("football-data.org conectado, pero sin partidos coincidentes.");
    } else {
      console.log("Primeros 20 matches coincidentes:");
      matchingPreview.forEach((fixture) => console.log(formatMatchingFixture(fixture)));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function formatMatchingFixture(fixture: ExternalFixture): string {
  const localMatch = matches
    .map((match) => ({
      match,
      direction: getFixtureMatchDirection(fixture, match, { allowExplicitExternalId: false })
    }))
    .find((candidate) => candidate.direction);

  return `- ${localMatch?.match.id ?? "N/D"} | ${fixture.homeTeam} vs ${fixture.awayTeam} | status=${
    fixture.status
  } | goles=${formatGoals(fixture)} | orden=${localMatch?.direction ?? "N/D"}`;
}

function formatGoals(fixture: ExternalFixture): string {
  if (fixture.homeGoals === null || fixture.awayGoals === null) return "sin goles";
  return `${fixture.homeGoals}-${fixture.awayGoals}`;
}

function formatStrategy(strategy: "full-range" | "windows" | "current"): string {
  if (strategy === "full-range") return "rango completo";
  if (strategy === "windows") return "ventanas";
  return "/matches actual";
}
