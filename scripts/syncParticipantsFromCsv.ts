import { join } from "node:path";
import { matches } from "../src/data/matches";
import { formatSyncSummary, syncParticipantsFromCsv } from "./csvParticipants";

const projectRoot = process.cwd();
const outputFile = join(projectRoot, "src", "data", "generatedParticipants.ts");

try {
  const result = syncParticipantsFromCsv({ projectRoot, matches, outputFile });
  console.log(formatSyncSummary(projectRoot, outputFile, result));

  result.warnings.forEach((warning) => {
    console.warn(`Warning: ${warning}`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
