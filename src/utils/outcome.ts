import type { Prediction } from "../types/prode";

export function outcomeFromGoals(homeGoals: number | null, awayGoals: number | null): Prediction {
  if (homeGoals === null || awayGoals === null) {
    return null;
  }

  if (homeGoals > awayGoals) {
    return "L";
  }

  if (homeGoals < awayGoals) {
    return "V";
  }

  return "E";
}
