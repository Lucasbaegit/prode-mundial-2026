import { describe, expect, it } from "vitest";
import { matches } from "../data/matches";
import { resultsFromCsv } from "../../scripts/resultsCsv";

const header = "match_id,home_goals,away_goals,status,updated_at";

describe("manual results CSV", () => {
  it("convierte CSV real finished a ActualResult", () => {
    const results = resultsFromCsv(
      `${header}\nA1,2,0,finished,2026-06-11T20:00:00Z`,
      "results.csv",
      matches
    );

    expect(results[0]).toMatchObject({
      matchId: "A1",
      status: "finished",
      homeGoals: 2,
      awayGoals: 0,
      outcome: "L",
      provider: "manual-real"
    });
  });

  it("rechaza match_id inexistente", () => {
    expect(() =>
      resultsFromCsv(`${header}\nZZ9,2,0,finished,2026-06-11T20:00:00Z`, "bad.csv", matches)
    ).toThrow("match_id inexistente");
  });

  it("rechaza status inválido", () => {
    expect(() =>
      resultsFromCsv(`${header}\nA1,2,0,done,2026-06-11T20:00:00Z`, "bad.csv", matches)
    ).toThrow("status inválido");
  });

  it("rechaza goles inválidos", () => {
    expect(() =>
      resultsFromCsv(`${header}\nA1,x,0,finished,2026-06-11T20:00:00Z`, "bad.csv", matches)
    ).toThrow("home_goals inválido");
  });
});
