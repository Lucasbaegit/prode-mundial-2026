import { join } from "node:path";
import { matches } from "../src/data/matches";
import { formatResultsSyncSummary, syncResultsFromCsv } from "./resultsCsv";

const projectRoot = process.cwd();
const outputFile = join(projectRoot, "src", "data", "generatedResults.ts");

try {
  const result = syncResultsFromCsv({ projectRoot, matches, outputFile });
  console.log(formatResultsSyncSummary(projectRoot, outputFile, result));
  result.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
