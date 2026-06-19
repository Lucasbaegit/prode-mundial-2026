import { describe, expect, it, vi } from "vitest";
import type { Match } from "../types/prode";
import {
  type ApiFootballFixture,
  mapApiFootballStatus,
  transformApiFootballFixtures
} from "../services/apiFootballProvider";
import { matches } from "../data/matches";

function fixture(
  id: number,
  home: string,
  away: string,
  statusShort: string,
  homeGoals: number | null,
  awayGoals: number | null
): ApiFootballFixture {
  return {
    fixture: {
      id,
      date: "2026-06-19T18:00:00+00:00",
      status: {
        short: statusShort,
        elapsed: statusShort === "LIVE" ? 42 : null
      }
    },
    league: {
      id: 1,
      name: "FIFA World Cup",
      season: 2026
    },
    teams: {
      home: { name: home },
      away: { name: away }
    },
    goals: {
      home: homeGoals,
      away: awayGoals
    }
  };
}

describe("apiFootballProvider", () => {
  it("mapea FT como finished", () => {
    expect(mapApiFootballStatus("FT")).toBe("finished");
  });

  it("mapea NS como scheduled", () => {
    expect(mapApiFootballStatus("NS")).toBe("scheduled");
  });

  it("mapea estados live como live", () => {
    ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].forEach((status) => {
      expect(mapApiFootballStatus(status)).toBe("live");
    });
  });

  it("transforma fixture API por nombres normalizados", () => {
    const result = transformApiFootballFixtures(
      [fixture(101, "Mexico", "South Africa", "FT", 2, 1)],
      [matches[0]]
    );

    expect(result[0]).toMatchObject({
      matchId: "A1",
      status: "finished",
      homeGoals: 2,
      awayGoals: 1,
      outcome: "L",
      provider: "api-football"
    });
  });

  it("mapea por apiExternalId aunque los nombres externos no coincidan", () => {
    const localMatch: Match = {
      ...matches[0],
      apiExternalId: "777"
    };
    const result = transformApiFootballFixtures(
      [fixture(777, "External Home", "External Away", "FT", 0, 1)],
      [localMatch]
    );

    expect(result[0]).toMatchObject({
      matchId: "A1",
      status: "finished",
      outcome: "V",
      provider: "api-football"
    });
  });

  it("deja pendiente el partido no mapeado", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = transformApiFootballFixtures(
      [fixture(102, "Germany", "Curacao", "FT", 3, 0)],
      [matches[0]]
    );

    expect(result[0]).toMatchObject({
      matchId: "A1",
      status: "scheduled",
      homeGoals: null,
      awayGoals: null,
      outcome: null,
      provider: "pending"
    });
    warnSpy.mockRestore();
  });

  it("calcula outcome empate desde goles reales", () => {
    const result = transformApiFootballFixtures(
      [fixture(103, "Korea Republic", "Czech Republic", "FT", 1, 1)],
      [matches[1]]
    );

    expect(result[0].outcome).toBe("E");
  });
});
