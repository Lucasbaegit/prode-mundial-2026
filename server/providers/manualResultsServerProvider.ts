import { generatedResults } from "../../src/data/generatedResults";
import type { ServerProviderResult } from "../types";

export async function getManualResults(): Promise<ServerProviderResult> {
  if (generatedResults.length === 0) {
    throw new Error("CSV manual: no hay resultados reales sincronizados.");
  }

  return {
    source: "manual-real",
    message: "APIs sin datos; usando CSV real.",
    results: generatedResults
  };
}
