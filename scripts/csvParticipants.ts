import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { Match, Participant, Prediction } from "../src/types/prode";

export const CSV_HEADERS = [
  "participant_id",
  "participant_name",
  "match_id",
  "home_team",
  "away_team",
  "prediction"
] as const;

export interface CsvSyncResult {
  participants: Participant[];
  files: string[];
  warnings: string[];
}

interface CsvParticipantRow {
  participant_id: string;
  participant_name: string;
  match_id: string;
  home_team: string;
  away_team: string;
  prediction: string;
}

export function readParticipantsFromCsvDir(csvDir: string, matches: Match[]): CsvSyncResult {
  if (!existsSync(csvDir)) {
    return { participants: [], files: [], warnings: [] };
  }

  const csvFiles = readdirSync(csvDir)
    .filter(isParticipantCsvFile)
    .sort((left, right) => left.localeCompare(right));

  const participants: Participant[] = [];
  const warnings: string[] = [];
  const seenParticipantIds = new Set<string>();

  csvFiles.forEach((fileName) => {
    const filePath = join(csvDir, fileName);
    const participant = participantFromCsv(readFileSync(filePath, "utf8"), fileName, matches, warnings);

    if (seenParticipantIds.has(participant.id)) {
      throw new Error(`participant_id duplicado en CSV: ${participant.id}`);
    }

    seenParticipantIds.add(participant.id);
    participants.push(participant);
  });

  return { participants, files: csvFiles, warnings };
}

export function isParticipantCsvFile(fileName: string): boolean {
  const normalizedFileName = fileName.toLowerCase();

  if (!normalizedFileName.endsWith(".csv")) return false;
  if (normalizedFileName.startsWith(".")) return false;
  if (normalizedFileName.startsWith("~$")) return false;
  if (normalizedFileName.endsWith(".example.csv")) return false;
  if (normalizedFileName.endsWith(".sample.csv")) return false;
  if (normalizedFileName.endsWith(".tmp.csv")) return false;
  if (normalizedFileName.endsWith(".temp.csv")) return false;
  if (normalizedFileName.includes(".tmp.")) return false;
  if (normalizedFileName.includes(".temp.")) return false;

  return true;
}

export function participantFromCsv(
  csvContent: string,
  fileName: string,
  matches: Match[],
  warnings: string[] = []
): Participant {
  const rows = parseParticipantCsv(csvContent, fileName);
  if (rows.length === 0) {
    throw new Error(`${fileName}: el CSV no tiene filas de participante.`);
  }

  const firstParticipantId = rows[0].participant_id.trim();
  const firstParticipantName = rows[0].participant_name.trim();

  if (!firstParticipantId) {
    throw new Error(`${fileName}: participant_id vacío.`);
  }

  if (!firstParticipantName) {
    throw new Error(`${fileName}: participant_name vacío.`);
  }

  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const predictions: Record<string, Prediction> = Object.fromEntries(
    matches.map((match) => [match.id, null])
  ) as Record<string, Prediction>;
  const seenMatchIds = new Set<string>();

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const participantId = row.participant_id.trim();
    const participantName = row.participant_name.trim();
    const matchId = row.match_id.trim();

    if (participantId !== firstParticipantId) {
      throw new Error(
        `${fileName}:${rowNumber}: participant_id "${participantId}" no coincide con "${firstParticipantId}".`
      );
    }

    if (participantName !== firstParticipantName) {
      throw new Error(
        `${fileName}:${rowNumber}: participant_name "${participantName}" no coincide con "${firstParticipantName}".`
      );
    }

    const match = matchMap.get(matchId);
    if (!match) {
      throw new Error(`${fileName}:${rowNumber}: match_id inexistente "${matchId}".`);
    }

    if (seenMatchIds.has(matchId)) {
      throw new Error(`${fileName}:${rowNumber}: match_id duplicado "${matchId}".`);
    }

    seenMatchIds.add(matchId);
    validateTeamName(fileName, rowNumber, "home_team", row.home_team, match.homeTeam, warnings);
    validateTeamName(fileName, rowNumber, "away_team", row.away_team, match.awayTeam, warnings);
    predictions[matchId] = parsePrediction(row.prediction, fileName, rowNumber);
  });

  if (seenMatchIds.size < matches.length) {
    warnings.push(
      `${fileName}: tiene ${seenMatchIds.size} filas; se completaron ${
        matches.length - seenMatchIds.size
      } partidos faltantes con null.`
    );
  }

  return {
    id: firstParticipantId,
    name: firstParticipantName,
    predictions
  };
}

export function parseParticipantCsv(csvContent: string, fileName = "csv"): CsvParticipantRow[] {
  const records = parseCsvRecords(csvContent).filter((record) =>
    record.some((value) => value.trim().length > 0)
  );

  if (records.length === 0) {
    throw new Error(`${fileName}: CSV vacío.`);
  }

  const [headerRecord, ...dataRecords] = records;
  const normalizedHeaders = headerRecord.map((header) => header.trim());
  const expectedHeaders = [...CSV_HEADERS];

  if (
    normalizedHeaders.length !== expectedHeaders.length ||
    normalizedHeaders.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new Error(
      `${fileName}: encabezado inválido. Esperado: ${expectedHeaders.join(",")}.`
    );
  }

  return dataRecords.map((record, index) => {
    const rowNumber = index + 2;
    if (record.length !== expectedHeaders.length) {
      throw new Error(
        `${fileName}:${rowNumber}: se esperaban ${expectedHeaders.length} columnas y hay ${record.length}.`
      );
    }

    return {
      participant_id: record[0].trim(),
      participant_name: record[1].trim(),
      match_id: record[2].trim(),
      home_team: record[3].trim(),
      away_team: record[4].trim(),
      prediction: record[5].trim()
    };
  });
}

export function parsePrediction(value: string, fileName = "csv", rowNumber = 0): Prediction {
  const normalizedValue = value.trim().toUpperCase();
  if (normalizedValue === "") return null;
  if (normalizedValue === "L" || normalizedValue === "E" || normalizedValue === "V") {
    return normalizedValue;
  }

  const location = rowNumber > 0 ? `${fileName}:${rowNumber}` : fileName;
  throw new Error(`${location}: prediction inválida "${value}". Usar L, E, V o vacío.`);
}

export function writeGeneratedParticipants(
  outputFile: string,
  participants: Participant[],
  csvFiles: string[]
): void {
  mkdirSync(dirname(outputFile), { recursive: true });
  const serializedParticipants = JSON.stringify(participants, null, 2)
    .replace(/"([A-Z][1-6])":/g, "$1:")
    .replace(/"predictions":/g, "predictions:");

  const fileContent = `/* Auto-generated by npm run sync:participants. Do not edit manually. */
import type { Participant } from "../types/prode";

export const generatedParticipants: Participant[] = ${serializedParticipants};

export const generatedParticipantCsvFiles: string[] = ${JSON.stringify(csvFiles, null, 2)};
`;

  writeFileSync(outputFile, fileContent, "utf8");
}

export function syncParticipantsFromCsv(options: {
  projectRoot: string;
  matches: Match[];
  csvDir?: string;
  outputFile?: string;
}): CsvSyncResult {
  const csvDir = options.csvDir ?? join(options.projectRoot, "data", "prodes_csv");
  const outputFile =
    options.outputFile ?? join(options.projectRoot, "src", "data", "generatedParticipants.ts");
  const result = readParticipantsFromCsvDir(csvDir, options.matches);
  writeGeneratedParticipants(outputFile, result.participants, result.files);
  return result;
}

function parseCsvRecords(csvContent: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const char = csvContent[index];
    const nextChar = csvContent[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRecord.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRecord.push(currentField);
      records.push(currentRecord);
      currentRecord = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new Error("CSV inválido: comillas sin cerrar.");
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  return records;
}

function validateTeamName(
  fileName: string,
  rowNumber: number,
  fieldName: "home_team" | "away_team",
  csvValue: string,
  fixtureValue: string,
  warnings: string[]
): void {
  if (csvValue.trim() === fixtureValue) return;

  warnings.push(
    `${fileName}:${rowNumber}: ${fieldName} "${csvValue}" no coincide con fixture "${fixtureValue}".`
  );
}

export function formatSyncSummary(projectRoot: string, outputFile: string, result: CsvSyncResult): string {
  const relativeOutput = relative(projectRoot, outputFile);
  if (result.files.length === 0) {
    return `No se encontraron CSV. Generado ${relativeOutput} con lista vacía.`;
  }

  return `Generado ${relativeOutput} con ${result.participants.length} participante(s) desde ${result.files
    .map((file) => basename(file))
    .join(", ")}.`;
}
