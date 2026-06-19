import { describe, expect, it } from "vitest";
import { matches } from "../data/matches";
import { mockResults } from "../data/mockResults";
import { participants, previousRankingPositions } from "../data/participants";
import { mockResultsProvider } from "../services/mockResultsProvider";
import { rankingToCsv } from "../utils/csv";
import { calculateRanking } from "../utils/ranking";

describe("CSV y provider mock", () => {
  it("exporta una fila por cada participante", () => {
    const ranking = calculateRanking(participants, matches, mockResults, previousRankingPositions);
    const csv = rankingToCsv(ranking);
    const rows = csv.split("\n");
    expect(rows).toHaveLength(participants.length + 1);
  });

  it("incluye encabezados esperados en CSV", () => {
    const ranking = calculateRanking(participants, matches, mockResults, previousRankingPositions);
    const csv = rankingToCsv(ranking);
    expect(csv.split("\n")[0]).toBe(
      "posicion,participante,puntos,aciertos,fallos,pendientes,sin_marcar,efectividad"
    );
  });

  it("provider mock devuelve resultados", async () => {
    await expect(mockResultsProvider.getResults()).resolves.toEqual(mockResults);
  });

  it("provider mock incluye finished, live y scheduled", async () => {
    const results = await mockResultsProvider.getResults();
    const statuses = new Set(results.map((result) => result.status));
    expect(statuses.has("finished")).toBe(true);
    expect(statuses.has("live")).toBe(true);
    expect(statuses.has("scheduled")).toBe(true);
  });
});
