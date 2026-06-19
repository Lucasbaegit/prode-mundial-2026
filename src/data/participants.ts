import { matches } from "./matches";
import type { Participant, Prediction } from "../types/prode";

const lucasPredictions: Record<string, Prediction> = {
  A1: "L",
  A2: "L",
  A3: "L",
  A4: "L",
  A5: "V",
  A6: "V",

  B1: "L",
  B2: "V",
  B3: null,
  B4: "L",
  B5: "L",
  B6: "L",

  C1: "V",
  C2: "V",
  C3: "V",
  C4: "L",
  C5: "V",
  C6: "L",

  D1: "L",
  D2: "V",
  D3: "L",
  D4: "L",
  D5: "E",
  D6: "L",

  E1: "L",
  E2: "V",
  E3: "L",
  E4: "L",
  E5: "V",
  E6: "E",

  F1: "L",
  F2: "L",
  F3: "L",
  F4: "V",
  F5: "L",
  F6: "V",

  G1: "L",
  G2: "L",
  G3: "L",
  G4: "V",
  G5: "L",
  G6: "V",

  H1: "L",
  H2: "V",
  H3: "L",
  H4: "L",
  H5: "V",
  H6: "V",

  I1: "L",
  I2: "V",
  I3: "L",
  I4: "L",
  I5: "V",
  I6: "L",

  J1: "L",
  J2: "L",
  J3: "L",
  J4: "V",
  J5: "L",
  J6: "V",

  K1: "L",
  K2: "V",
  K3: "L",
  K4: "L",
  K5: "V",
  K6: "L",

  L1: "L",
  L2: "L",
  L3: "L",
  L4: "V",
  L5: "V",
  L6: "L"
};

function makeDemoPredictions(pattern: Prediction[]): Record<string, Prediction> {
  return Object.fromEntries(
    matches.map((match, index) => [match.id, pattern[index % pattern.length]])
  ) as Record<string, Prediction>;
}

export const participants: Participant[] = [
  {
    id: "lucas",
    name: "Lucas",
    predictions: lucasPredictions
  },
  {
    id: "demo-conservador",
    name: "Demo Conservador",
    predictions: makeDemoPredictions(["L", "L", "E", "L", null, "V"])
  },
  {
    id: "demo-random",
    name: "Demo Random",
    predictions: makeDemoPredictions(["V", "E", null, "L", "V", "L", "E"])
  }
];

export const previousRankingPositions: Record<string, number> = {
  lucas: 2,
  "demo-conservador": 1,
  "demo-random": 3
};
