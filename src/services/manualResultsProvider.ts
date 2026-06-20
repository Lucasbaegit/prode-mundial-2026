import { generatedResults } from "../data/generatedResults";
import type { ActualResult, ResultsProvider } from "../types/prode";

export const manualResultsProvider: ResultsProvider = {
  async getResults() {
    return getManualResults();
  }
};

export function getManualResults(): ActualResult[] {
  if (generatedResults.length === 0) {
    throw new Error("manual-real: no hay CSV real de resultados sincronizado.");
  }

  return generatedResults;
}
