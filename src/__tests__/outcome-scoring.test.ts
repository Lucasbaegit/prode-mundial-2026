import { describe, expect, it } from "vitest";
import type { ActualResult, Match, Participant } from "../types/prode";
import { outcomeFromGoals } from "../utils/outcome";
import { calculateMatchScore, calculateParticipantSummary } from "../utils/scoring";

const match: Match = {
  id: "A1",
  group: "A",
  homeTeam: "Local",
  awayTeam: "Visitante"
};

function participant(prediction: Participant["predictions"][string]): Participant {
  return {
    id: "p1",
    name: "Participante",
    predictions: { A1: prediction }
  };
}

function result(status: ActualResult["status"], outcome: ActualResult["outcome"]): ActualResult {
  return {
    matchId: "A1",
    status,
    homeGoals: outcome === "L" ? 2 : outcome === "V" ? 0 : outcome === "E" ? 1 : null,
    awayGoals: outcome === "L" ? 0 : outcome === "V" ? 2 : outcome === "E" ? 1 : null,
    outcome
  };
}

describe("outcomeFromGoals", () => {
  it("devuelve L si gana el local", () => {
    expect(outcomeFromGoals(3, 1)).toBe("L");
  });

  it("devuelve E si empatan", () => {
    expect(outcomeFromGoals(2, 2)).toBe("E");
  });

  it("devuelve V si gana el visitante", () => {
    expect(outcomeFromGoals(0, 1)).toBe("V");
  });

  it("devuelve null si faltan goles", () => {
    expect(outcomeFromGoals(null, 1)).toBeNull();
  });
});

describe("calculateMatchScore", () => {
  it("suma 1 con partido finished y acierto", () => {
    const score = calculateMatchScore(match, participant("L"), result("finished", "L"));
    expect(score.points).toBe(1);
    expect(score.verdict).toBe("hit");
  });

  it("suma 0 con partido finished y fallo", () => {
    const score = calculateMatchScore(match, participant("V"), result("finished", "L"));
    expect(score.points).toBe(0);
    expect(score.verdict).toBe("miss");
  });

  it("suma 0 si el partido está scheduled", () => {
    const score = calculateMatchScore(match, participant("L"), result("scheduled", null));
    expect(score.points).toBe(0);
    expect(score.verdict).toBe("pending");
  });

  it("suma 0 si el partido está live", () => {
    const score = calculateMatchScore(match, participant("L"), result("live", null));
    expect(score.points).toBe(0);
    expect(score.verdict).toBe("live");
  });

  it("marca sin marcar cuando la predicción es null", () => {
    const score = calculateMatchScore(match, participant(null), result("finished", "L"));
    expect(score.points).toBe(0);
    expect(score.verdict).toBe("unmarked");
  });
});

describe("calculateParticipantSummary", () => {
  it("calcula resumen de participante con aciertos, fallos y null", () => {
    const localMatches: Match[] = [
      match,
      { ...match, id: "A2" },
      { ...match, id: "A3" }
    ];
    const localParticipant: Participant = {
      id: "p1",
      name: "Participante",
      predictions: { A1: "L", A2: "V", A3: null }
    };
    const localResults: ActualResult[] = [
      { matchId: "A1", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" },
      { matchId: "A2", status: "finished", homeGoals: 2, awayGoals: 0, outcome: "L" },
      { matchId: "A3", status: "scheduled", homeGoals: null, awayGoals: null, outcome: null }
    ];

    const summary = calculateParticipantSummary(localParticipant, localMatches, localResults);

    expect(summary.points).toBe(1);
    expect(summary.hits).toBe(1);
    expect(summary.misses).toBe(1);
    expect(summary.unmarked).toBe(1);
    expect(summary.efficiency).toBe(0.5);
  });
});
