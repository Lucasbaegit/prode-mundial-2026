import { matches } from "../src/data/matches";
import { discoverFootballDataMatches } from "../server/providers/footballDataServerProvider";
import { loadEnvLocal } from "../server/utils/env";
import { getFixtureMatchDirection, type ExternalFixture } from "../server/utils/mapResults";

loadEnvLocal(process.cwd());

const token = process.env.FOOTBALL_DATA_API_TOKEN?.trim();

if (!token) {
  console.log("Falta FOOTBALL_DATA_API_TOKEN en .env.local.");
} else {
  try {
    const discovery = await discoverFootballDataMatches();

    console.log("football-data.org GET /matches");
    console.log(`Total devuelto: ${discovery.total}`);
    console.log(`Coincidentes con fixture local: ${discovery.matchingFixtures.length}`);

    const matchingPreview = discovery.matchingFixtures.slice(0, 10);
    if (matchingPreview.length === 0) {
      console.log("No se detectaron partidos coincidentes con el fixture local.");
    } else {
      console.log("Primeros 10 matches coincidentes:");
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
  const goals =
    fixture.homeGoals === null || fixture.awayGoals === null
      ? "sin goles"
      : `${fixture.homeGoals}-${fixture.awayGoals}`;

  return `- ${localMatch?.match.id ?? "N/D"} | ${fixture.homeTeam} vs ${fixture.awayTeam} | status=${
    fixture.status
  } | goles=${goals} | orden=${localMatch?.direction ?? "N/D"}`;
}
