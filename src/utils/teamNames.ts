const teamAliases: Record<string, string[]> = {
  "Países Bajos": ["Netherlands"],
  "Estados Unidos": ["USA", "United States"],
  Corea: ["South Korea", "Korea Republic"],
  "Costa de Marfil": ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
  "Arabia Saudí": ["Saudi Arabia"],
  "Nueva Zelanda": ["New Zealand"],
  "Cabo Verde": ["Cape Verde"],
  Curazao: ["Curaçao", "Curacao"],
  Marruecos: ["Morocco"],
  Alemania: ["Germany"],
  Inglaterra: ["England"],
  Francia: ["France"],
  España: ["Spain"],
  Bélgica: ["Belgium"],
  Suiza: ["Switzerland"],
  Suecia: ["Sweden"],
  Túnez: ["Tunisia"],
  Japón: ["Japan"],
  Portugal: ["Portugal"],
  Argentina: ["Argentina"],
  Croacia: ["Croatia"],
  Brasil: ["Brazil"],
  México: ["Mexico"],
  Canadá: ["Canada"],
  Catar: ["Qatar"],
  Bosnia: ["Bosnia and Herzegovina"],
  Chequia: ["Czechia", "Czech Republic"],
  Sudáfrica: ["South Africa"],
  Australia: ["Australia"],
  Turquía: ["Turkey"],
  Paraguay: ["Paraguay"],
  Ecuador: ["Ecuador"],
  Uruguay: ["Uruguay"],
  Haití: ["Haiti"],
  Escocia: ["Scotland"],
  Congo: ["Congo"],
  Colombia: ["Colombia"],
  Ghana: ["Ghana"],
  Panamá: ["Panama"],
  Senegal: ["Senegal"],
  Irak: ["Iraq"],
  Noruega: ["Norway"],
  Argelia: ["Algeria"],
  Austria: ["Austria"],
  Jordania: ["Jordan"],
  Irán: ["Iran"],
  Egipto: ["Egypt"]
};

const aliasToCanonical = new Map<string, string>();

Object.entries(teamAliases).forEach(([canonical, aliases]) => {
  const normalizedCanonical = normalizeRawTeamName(canonical);
  aliasToCanonical.set(normalizedCanonical, normalizedCanonical);
  aliases.forEach((alias) => aliasToCanonical.set(normalizeRawTeamName(alias), normalizedCanonical));
});

export function normalizeTeamName(teamName: string): string {
  const normalized = normalizeRawTeamName(teamName);
  return aliasToCanonical.get(normalized) ?? normalized;
}

export function teamsMatch(left: string, right: string): boolean {
  return normalizeTeamName(left) === normalizeTeamName(right);
}

function normalizeRawTeamName(teamName: string): string {
  return teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .trim();
}
