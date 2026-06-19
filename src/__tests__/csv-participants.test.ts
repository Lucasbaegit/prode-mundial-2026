import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matches } from "../data/matches";
import { mergeParticipants } from "../data/getParticipants";
import { participants as localParticipants } from "../data/participants";
import type { Participant } from "../types/prode";
import {
  isParticipantCsvFile,
  parsePrediction,
  participantFromCsv,
  readParticipantsFromCsvDir
} from "../../scripts/csvParticipants";

const header = "participant_id,participant_name,match_id,home_team,away_team,prediction";

function csvForRows(rows: string[]): string {
  return [header, ...rows].join("\n");
}

function rowFor(matchId: string, prediction: string, id = "csv-user", name = "CSV User"): string {
  const match = matches.find((candidate) => candidate.id === matchId);
  if (!match) throw new Error(`Fixture faltante en test: ${matchId}`);
  return [id, name, match.id, match.homeTeam, match.awayTeam, prediction].join(",");
}

describe("carga de participantes desde CSV", () => {
  it("filtra ejemplos, samples, ocultos y temporales", () => {
    expect(isParticipantCsvFile("lucas.csv")).toBe(true);
    expect(isParticipantCsvFile("lucas.example.csv")).toBe(false);
    expect(isParticipantCsvFile("lucas.sample.csv")).toBe(false);
    expect(isParticipantCsvFile(".lucas.csv")).toBe(false);
    expect(isParticipantCsvFile("~$lucas.csv")).toBe(false);
    expect(isParticipantCsvFile("lucas.tmp.csv")).toBe(false);
    expect(isParticipantCsvFile("lucas.temp.csv")).toBe(false);
  });

  it("no carga lucas.example.csv como participante real", () => {
    const tempDir = join(tmpdir(), `prode-csv-ignore-example-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    try {
      writeFileSync(
        join(tempDir, "lucas.example.csv"),
        csvForRows([rowFor("A1", "L", "lucas", "Lucas")])
      );

      const result = readParticipantsFromCsvDir(tempDir, matches);

      expect(result.files).toEqual([]);
      expect(result.participants).toEqual([]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("ignora templates pero carga CSV reales", () => {
    const tempDir = join(tmpdir(), `prode-csv-real-only-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    try {
      writeFileSync(
        join(tempDir, "lucas.example.csv"),
        csvForRows([rowFor("A1", "L", "lucas", "Lucas")])
      );
      writeFileSync(
        join(tempDir, "juan.csv"),
        csvForRows([rowFor("A1", "E", "juan", "Juan")])
      );

      const result = readParticipantsFromCsvDir(tempDir, matches);

      expect(result.files).toEqual(["juan.csv"]);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].id).toBe("juan");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("parsea L/E/V y prediction vacía como null", () => {
    expect(parsePrediction("L")).toBe("L");
    expect(parsePrediction("E")).toBe("E");
    expect(parsePrediction("V")).toBe("V");
    expect(parsePrediction("")).toBeNull();
  });

  it("rechaza prediction inválida", () => {
    expect(() => parsePrediction("X", "test.csv", 2)).toThrow("prediction inválida");
  });

  it("rechaza match_id inexistente", () => {
    const csv = csvForRows(["csv-user,CSV User,ZZ9,Local,Visitante,L"]);
    expect(() => participantFromCsv(csv, "invalid-match.csv", matches)).toThrow("match_id inexistente");
  });

  it("completa CSV incompleto con null", () => {
    const warnings: string[] = [];
    const participant = participantFromCsv(
      csvForRows([rowFor("A1", "L"), rowFor("A2", "")]),
      "incomplete.csv",
      matches,
      warnings
    );

    expect(Object.keys(participant.predictions)).toHaveLength(72);
    expect(participant.predictions.A1).toBe("L");
    expect(participant.predictions.A2).toBeNull();
    expect(participant.predictions.L6).toBeNull();
    expect(warnings.some((warning) => warning.includes("se completaron 70"))).toBe(true);
  });

  it("detecta participante duplicado entre archivos CSV", () => {
    const tempDir = join(tmpdir(), `prode-csv-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    try {
      writeFileSync(join(tempDir, "a.csv"), csvForRows([rowFor("A1", "L", "dup", "Duplicado")]));
      writeFileSync(join(tempDir, "b.csv"), csvForRows([rowFor("A2", "E", "dup", "Duplicado")]));

      expect(() => readParticipantsFromCsvDir(tempDir, matches)).toThrow("participant_id duplicado");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("CSV correcto genera Participant válido", () => {
    const rows = matches.map((match, index) =>
      [match.id === "A1" ? "csv-user" : "csv-user", "CSV User", match.id, match.homeTeam, match.awayTeam, index % 3 === 0 ? "L" : index % 3 === 1 ? "E" : "V"].join(",")
    );
    const participant = participantFromCsv(csvForRows(rows), "full.csv", matches);

    expect(participant.id).toBe("csv-user");
    expect(participant.name).toBe("CSV User");
    expect(Object.keys(participant.predictions)).toHaveLength(72);
    expect(participant.predictions.A1).toBe("L");
    expect(participant.predictions.A2).toBe("E");
    expect(participant.predictions.A3).toBe("V");
  });

  it("Lucas desde CSV reemplaza Lucas hardcodeado si comparten id", () => {
    const csvLucas: Participant = {
      id: "lucas",
      name: "Lucas CSV",
      predictions: Object.fromEntries(matches.map((match) => [match.id, null])) as Participant["predictions"]
    };

    const merged = mergeParticipants(localParticipants, [csvLucas], false);
    const lucasEntries = merged.filter((participant) => participant.id === "lucas");

    expect(lucasEntries).toHaveLength(1);
    expect(lucasEntries[0].name).toBe("Lucas CSV");
    expect(merged.some((participant) => participant.id === "demo-random")).toBe(false);
  });
});
