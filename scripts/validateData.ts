import { join } from "node:path";
import { generatedResults } from "../src/data/generatedResults";
import { getParticipants, getParticipantsLoadInfo } from "../src/data/getParticipants";
import { matches } from "../src/data/matches";
import { mockResults } from "../src/data/mockResults";
import { validateProdeData } from "../src/utils/validation";
import { readParticipantsFromCsvDir } from "./csvParticipants";
import { readResultsFromCsvDir } from "./resultsCsv";

const projectRoot = process.cwd();
const participantsCsvDir = join(projectRoot, "data", "prodes_csv");
const resultsCsvDir = join(projectRoot, "data", "results_csv");
const participants = getParticipants();
const loadInfo = getParticipantsLoadInfo();
const resultsForValidation = generatedResults.length > 0 ? generatedResults : mockResults;
const report = validateProdeData(matches, participants, resultsForValidation);

try {
  const participantsCsvReport = readParticipantsFromCsvDir(participantsCsvDir, matches);
  participantsCsvReport.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

  const resultsCsvReport = readResultsFromCsvDir(resultsCsvDir, matches);
  resultsCsvReport.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

if (!report.valid || report.errors.length > 0) {
  console.error("Validacion de datos fallida:");
  report.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  report.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
  console.log(
    `Validacion OK: ${matches.length} partidos, ${participants.length} participantes, ${resultsForValidation.length} resultado(s), origen: ${loadInfo.sourceLabel}.`
  );
}
