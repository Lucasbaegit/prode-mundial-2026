import { matches } from "./matches";
import { createPendingResults } from "../utils/pendingResults";
import type { ActualResult } from "../types/prode";

// Mock visible de la app: no contiene resultados inventados.
// Los fixtures con partidos finished para scoring viven solo en tests.
export const mockResults: ActualResult[] = createPendingResults(matches, "2026-06-19T12:00:00-03:00").map(
  (result) => ({
    ...result,
    provider: "mock"
  })
);
