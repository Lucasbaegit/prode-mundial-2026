import { generatedParticipants, generatedParticipantCsvFiles } from "./generatedParticipants";
import { participants as localParticipants } from "./participants";
import type { Participant } from "../types/prode";

export const SHOW_DEMO_PARTICIPANTS = false;

const demoParticipantIds = new Set(["demo-conservador", "demo-random"]);

export interface ParticipantsLoadInfo {
  hasCsvParticipants: boolean;
  sourceLabel: "Participantes cargados desde CSV" | "Usando participantes demo/locales";
  csvFiles: string[];
}

export function getParticipants(): Participant[] {
  return mergeParticipants(localParticipants, generatedParticipants, SHOW_DEMO_PARTICIPANTS);
}

export function getParticipantsLoadInfo(): ParticipantsLoadInfo {
  const hasCsvParticipants = generatedParticipants.length > 0;

  return {
    hasCsvParticipants,
    sourceLabel: hasCsvParticipants
      ? "Participantes cargados desde CSV"
      : "Usando participantes demo/locales",
    csvFiles: generatedParticipantCsvFiles
  };
}

export function mergeParticipants(
  baseParticipants: Participant[],
  csvParticipants: Participant[],
  showDemoParticipants: boolean
): Participant[] {
  const hasCsvParticipants = csvParticipants.length > 0;
  const filteredBaseParticipants = baseParticipants.filter((participant) => {
    if (!hasCsvParticipants) return true;
    if (showDemoParticipants) return true;
    return !demoParticipantIds.has(participant.id);
  });

  const mergedById = new Map<string, Participant>();

  filteredBaseParticipants.forEach((participant) => {
    mergedById.set(participant.id, participant);
  });

  csvParticipants.forEach((participant) => {
    mergedById.set(participant.id, participant);
  });

  return [...mergedById.values()];
}
