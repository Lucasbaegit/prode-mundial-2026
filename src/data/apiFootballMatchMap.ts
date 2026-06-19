export interface ApiFootballMatchMapEntry {
  matchId: string;
  apiExternalId: string;
}

// Completar cuando API-Football publique/confirme los fixture ids reales.
// Ejemplo:
// { matchId: "A1", apiExternalId: "1234567" }
export const apiFootballMatchMap: ApiFootballMatchMapEntry[] = [];
