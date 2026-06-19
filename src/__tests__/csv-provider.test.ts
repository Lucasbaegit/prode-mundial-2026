import { describe, expect, it } from "vitest";
import { matches } from "../data/matches";
import { mockResults } from "../data/mockResults";
import { getParticipants } from "../data/getParticipants";
import { previousRankingPositions } from "../data/participants";
import { mockResultsProvider } from "../services/mockResultsProvider";
import { rankingToCsv } from "../utils/csv";
import { calculateRanking } from "../utils/ranking";

describe("CSV y provider mock", () => {
  it("exporta una fila por cada participante", () => {
    const participants = getParticipants();
    const ranking = calculateRanking(participants, matches, mockResults, previousRankingPositions);
    const csv = rankingToCsv(ranking);
    const rows = csv.split("\n");
    expect(rows).toHaveLength(participants.length + 1);
  });

  it("incluye encabezados esperados en CSV", () => {
    const participants = getParticipants();
    const ranking = calculateRanking(participants, matches, mockResults, previousRankingPositions);
    const csv = rankingToCsv(ranking);
    expect(csv.split("\n")[0]).toBe(
      "posicion,participante,puntos,aciertos,fallos,pendientes,sin_marcar,efectividad"
    );
  });

  it("provider mock devuelve resultados", async () => {
    await expect(mockResultsProvider.getResults()).resolves.toEqual(mockResults);
  });

  it("provider mock visible deja todos los partidos pendientes", async () => {
    const results = await mockResultsProvider.getResults();
    const statuses = new Set(results.map((result) => result.status));
    expect(statuses).toEqual(new Set(["scheduled"]));
    expect(results.every((result) => result.homeGoals === null && result.awayGoals === null)).toBe(true);
    expect(results.some((result) => result.status === "finished")).toBe(false);
  });

  it("ranking con resultados pending queda en cero puntos", () => {
    const participants = getParticipants();
    const ranking = calculateRanking(participants, matches, mockResults, previousRankingPositions);

    expect(ranking.every((entry) => entry.points === 0)).toBe(true);
    expect(ranking.every((entry) => entry.hits === 0 && entry.misses === 0)).toBe(true);
  });
});
