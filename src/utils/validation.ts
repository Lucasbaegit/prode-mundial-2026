import { GROUPS, type ActualResult, type Group, type Match, type Participant } from "../types/prode";

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const allowedPredictions = new Set(["L", "E", "V", null]);

export function groupMatchesByGroup(matches: Match[]): Record<Group, Match[]> {
  return GROUPS.reduce(
    (acc, group) => {
      acc[group] = matches.filter((match) => match.group === group);
      return acc;
    },
    {} as Record<Group, Match[]>
  );
}

export function validateProdeData(
  matches: Match[],
  participants: Participant[],
  results: ActualResult[]
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const matchIds = new Set(matches.map((match) => match.id));

  collectDuplicates(matches.map((match) => match.id)).forEach((id) =>
    errors.push(`Match id duplicado: ${id}`)
  );

  if (matches.length !== 72) {
    errors.push(`Se esperaban 72 partidos y hay ${matches.length}.`);
  }

  const matchesByGroup = groupMatchesByGroup(matches);
  GROUPS.forEach((group) => {
    const groupCount = matchesByGroup[group].length;
    if (groupCount !== 6) {
      errors.push(`El grupo ${group} debe tener 6 partidos y tiene ${groupCount}.`);
    }
  });

  collectDuplicates(participants.map((participant) => participant.id)).forEach((id) =>
    errors.push(`Participant id duplicado: ${id}`)
  );

  collectDuplicates(participants.map((participant) => participant.name.trim().toLowerCase())).forEach(
    (name) => errors.push(`Nombre de participante duplicado: ${name}`)
  );

  participants.forEach((participant) => {
    if (!participant.name.trim()) {
      errors.push(`Participante con nombre vacío: ${participant.id}`);
    }

    Object.entries(participant.predictions).forEach(([matchId, prediction]) => {
      if (!matchIds.has(matchId)) {
        errors.push(`${participant.name} tiene predicción para matchId inexistente: ${matchId}`);
      }

      if (!allowedPredictions.has(prediction)) {
        errors.push(`${participant.name} tiene predicción inválida en ${matchId}.`);
      }
    });
  });

  const lucas = participants.find((participant) => participant.id === "lucas");
  if (!lucas) {
    errors.push("Falta el participante Lucas.");
  } else {
    const lucasPredictionIds = new Set(Object.keys(lucas.predictions));
    if (lucasPredictionIds.size !== 72) {
      errors.push(`Lucas debe tener 72 predicciones/null y tiene ${lucasPredictionIds.size}.`);
    }

    matches.forEach((match) => {
      if (!lucasPredictionIds.has(match.id)) {
        errors.push(`Lucas no tiene entrada para ${match.id}.`);
      }
    });
  }

  collectDuplicates(results.map((result) => result.matchId)).forEach((id) =>
    errors.push(`Resultado duplicado para matchId: ${id}`)
  );

  results.forEach((result) => {
    if (!matchIds.has(result.matchId)) {
      errors.push(`Resultado con matchId inexistente: ${result.matchId}`);
    }

    if (result.status !== "finished" && result.outcome !== null) {
      warnings.push(`Resultado ${result.matchId} no está finalizado pero tiene outcome.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function collectDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });

  return [...duplicates];
}
