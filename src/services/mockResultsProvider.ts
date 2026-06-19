import { mockResults } from "../data/mockResults";
import type { ResultsProvider } from "../types/prode";

export const mockResultsProvider: ResultsProvider = {
  async getResults() {
    return mockResults;
  }
};
