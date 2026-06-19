import { join } from "node:path";
import { matches } from "../src/data/matches";
import { mockResults } from "../src/data/mockResults";
import { getParticipants, getParticipantsLoadInfo } from "../src/data/getParticipants";
import { validateProdeData } from "../src/utils/validation";
import { readParticipantsFromCsvDir } from "./csvParticipants";

const projectRoot = process.cwd();
const csvDir = join(projectRoot, "data", "prodes_csv");
const participants = getParticipants();
const loadInfo = getParticipantsLoadInfo();
const report = validateProdeData(matches, participants, mockResults);

try {
  const csvReport = readParticipantsFromCsvDir(csvDir, matches);
  csvReport.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

if (!report.valid || report.errors.length > 0) {
  console.error("Validación de datos fallida:");
  report.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  report.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
  console.log(
    `Validación OK: ${matches.length} partidos, ${participants.length} participantes, origen: ${loadInfo.sourceLabel}.`
  );
}
