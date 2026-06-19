import { describe, expect, it } from "vitest";
import type { ActualResult, Match, Participant } from "../types/prode";
import { calculateRanking } from "../utils/ranking";

const rankingMatches: Match[] = [
  { id: "A1", group: "A", homeTeam: "A", awayTeam: "B" },
  { id: "A2", group: "A", homeTeam: "C", awayTeam: "D" },
  { id: "A3", group: "A", homeTeam: "E", awayTeam: "F" }
];

const finishedResults: ActualResult[] = [
  { matchId: "A1", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" },
  { matchId: "A2", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" },
  { matchId: "A3", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" }
];

function makeParticipant(id: string, name: string, predictions: Participant["predictions"]): Participant {
  return { id, name, predictions };
}

describe("calculateRanking", () => {
  it("ordena primero por puntos", () => {
    const ranking = calculateRanking(
      [
        makeParticipant("a", "Ana", { A1: "L", A2: "V", A3: "V" }),
        makeParticipant("b", "Beto", { A1: "L", A2: "L", A3: "V" })
      ],
      rankingMatches,
      finishedResults
    );

    expect(ranking[0].participantName).toBe("Beto");
    expect(ranking[0].points).toBe(2);
  });

  it("desempata por mayor efectividad", () => {
    const ranking = calculateRanking(
      [
        makeParticipant("a", "Ana", { A1: "L", A2: "V", A3: "V" }),
        makeParticipant("b", "Beto", { A1: "L", A2: null, A3: null })
      ],
      rankingMatches,
      finishedResults
    );

    expect(ranking[0].participantName).toBe("Beto");
    expect(ranking[0].efficiency).toBe(1);
  });

  it("desempata por menor cantidad de sin marcar", () => {
    const tieMatches: Match[] = [
      ...rankingMatches,
      { id: "A4", group: "A", homeTeam: "G", awayTeam: "H" }
    ];
    const tieResults: ActualResult[] = [
      { matchId: "A1", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" },
      { matchId: "A2", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" },
      { matchId: "A3", status: "scheduled", homeGoals: null, awayGoals: null, outcome: null },
      { matchId: "A4", status: "scheduled", homeGoals: null, awayGoals: null, outcome: null }
    ];
    const ranking = calculateRanking(
      [
        makeParticipant("a", "Ana", { A1: "L", A2: "V", A3: null, A4: null }),
        makeParticipant("b", "Beto", { A1: "L", A2: "V", A3: "L", A4: null })
      ],
      tieMatches,
      tieResults
    );

    expect(ranking[0].participantName).toBe("Beto");
  });

  it("desempata finalmente por orden alfabético", () => {
    const ranking = calculateRanking(
      [
        makeParticipant("b", "Beto", { A1: "L", A2: "V", A3: "V" }),
        makeParticipant("a", "Ana", { A1: "L", A2: "V", A3: "V" })
      ],
      rankingMatches,
      finishedResults
    );

    expect(ranking[0].participantName).toBe("Ana");
  });

  it("calcula distancia contra líder y participante superior", () => {
    const ranking = calculateRanking(
      [
        makeParticipant("a", "Ana", { A1: "L", A2: "L", A3: "L" }),
        makeParticipant("b", "Beto", { A1: "L", A2: "L", A3: "V" }),
        makeParticipant("c", "Carla", { A1: "L", A2: "V", A3: "V" })
      ],
      rankingMatches,
      finishedResults
    );

    expect(ranking[2].distanceToLeader).toBe(2);
    expect(ranking[2].distanceToAbove).toBe(1);
  });

  it("prepara movimiento de ranking contra posiciones previas", () => {
    const ranking = calculateRanking(
      [
        makeParticipant("a", "Ana", { A1: "L", A2: "L", A3: "L" }),
        makeParticipant("b", "Beto", { A1: "L", A2: "V", A3: "V" })
      ],
      rankingMatches,
      finishedResults,
      { a: 2, b: 1 }
    );

    expect(ranking[0].movement).toBe("up");
    expect(ranking[1].movement).toBe("down");
  });
});
