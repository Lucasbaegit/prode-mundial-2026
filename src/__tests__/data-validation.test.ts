import { describe, expect, it } from "vitest";
import { matches } from "../data/matches";
import { mockResults } from "../data/mockResults";
import { participants } from "../data/participants";
import type { Match, Participant } from "../types/prode";
import { groupMatchesByGroup, validateProdeData } from "../utils/validation";

describe("validación de datos reales", () => {
  it("valida el dataset principal sin errores", () => {
    const report = validateProdeData(matches, participants, mockResults);
    expect(report.valid).toBe(true);
  });

  it("tiene 72 partidos", () => {
    expect(matches).toHaveLength(72);
  });

  it("cada grupo tiene exactamente 6 partidos", () => {
    const grouped = groupMatchesByGroup(matches);
    Object.values(grouped).forEach((groupMatches) => expect(groupMatches).toHaveLength(6));
  });

  it("Lucas tiene 72 entradas de predicción o null", () => {
    const lucas = participants.find((participant) => participant.id === "lucas");
    expect(Object.keys(lucas?.predictions ?? {})).toHaveLength(72);
  });

  it("incluye la predicción null de Lucas en B3", () => {
    const lucas = participants.find((participant) => participant.id === "lucas");
    expect(lucas?.predictions.B3).toBeNull();
  });

  it("detecta ids duplicados de partido", () => {
    const duplicatedMatches: Match[] = [matches[0], { ...matches[1], id: matches[0].id }];
    const report = validateProdeData(duplicatedMatches, participants, mockResults);
    expect(report.errors.some((error) => error.includes("Match id duplicado"))).toBe(true);
  });

  it("detecta participantes duplicados", () => {
    const duplicatedParticipants: Participant[] = [participants[0], { ...participants[0] }];
    const report = validateProdeData(matches, duplicatedParticipants, mockResults);
    expect(report.errors.some((error) => error.includes("Participant id duplicado"))).toBe(true);
  });

  it("detecta matchId inexistente en predicciones", () => {
    const invalidParticipant: Participant = {
      id: "invalid",
      name: "Invalid",
      predictions: { ZZ9: "L" }
    };
    const report = validateProdeData(matches, [...participants, invalidParticipant], mockResults);
    expect(report.errors.some((error) => error.includes("matchId inexistente"))).toBe(true);
  });

  it("detecta matchId inexistente en resultados", () => {
    const report = validateProdeData(matches, participants, [
      ...mockResults,
      { matchId: "ZZ9", status: "finished", homeGoals: 1, awayGoals: 0, outcome: "L" }
    ]);
    expect(report.errors.some((error) => error.includes("Resultado con matchId inexistente"))).toBe(
      true
    );
  });
});
