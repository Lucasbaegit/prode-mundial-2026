import { describe, expect, it, vi } from "vitest";
import { matches } from "../data/matches";
import {
  mapSportmonksStatus,
  type SportmonksFixture,
  transformSportmonksFixtures
} from "../services/sportmonksProvider";

function sportmonksFixture(statusName = "Full Time"): SportmonksFixture {
  return {
    id: 10,
    name: "Mexico vs South Africa",
    starting_at: "2026-06-11 20:00:00",
    state: {
      id: statusName === "Full Time" ? 5 : 1,
      name: statusName,
      short_name: statusName === "Full Time" ? "FT" : "NS"
    },
    participants: [
      { id: 1, name: "Mexico", meta: { location: "home" } },
      { id: 2, name: "South Africa", meta: { location: "away" } }
    ],
    scores: [
      { description: "CURRENT", score: { goals: 2, participant: "home" } },
      { description: "CURRENT", score: { goals: 0, participant: "away" } }
    ]
  };
}

describe("sportmonksProvider", () => {
  it("mapea estado finalizado", () => {
    expect(mapSportmonksStatus({ state: { id: 5, name: "Full Time", short_name: "FT" } })).toBe(
      "finished"
    );
  });

  it("mapea estado pendiente", () => {
    expect(mapSportmonksStatus({ state: { id: 1, name: "Not Started", short_name: "NS" } })).toBe(
      "scheduled"
    );
  });

  it("transforma fixture Sportmonks a ActualResult", () => {
    const result = transformSportmonksFixtures([sportmonksFixture()], [matches[0]]);

    expect(result[0]).toMatchObject({
      matchId: "A1",
      status: "finished",
      homeGoals: 2,
      awayGoals: 0,
      outcome: "L",
      provider: "sportmonks"
    });
  });

  it("deja pendiente si no puede mapear equipos", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = transformSportmonksFixtures([sportmonksFixture()], [matches[1]]);

    expect(result[0]).toMatchObject({
      matchId: "A2",
      status: "scheduled",
      provider: "pending"
    });
    warnSpy.mockRestore();
  });
});
