export const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L"
] as const;

export type Group = (typeof GROUPS)[number];
export type Prediction = "L" | "E" | "V" | null;
export type MatchStatus = "scheduled" | "live" | "finished";
export type ResultProviderName =
  | "api-football"
  | "sportmonks"
  | "football-data"
  | "manual-real"
  | "cache"
  | "mock"
  | "pending";
export type RequestedResultsProvider =
  | "auto"
  | "api-football"
  | "sportmonks"
  | "football-data"
  | "manual-real"
  | "mock";
export type RankingMovement = "up" | "down" | "same";

export interface Match {
  id: string;
  group: Group;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: string;
  apiExternalId?: string;
  apiHomeTeamName?: string;
  apiAwayTeamName?: string;
}

export interface Participant {
  id: string;
  name: string;
  predictions: Record<string, Prediction>;
}

export interface ActualResult {
  matchId: string;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  outcome: Prediction;
  updatedAt?: string;
  provider?: ResultProviderName;
}

export interface MatchScore {
  matchId: string;
  prediction: Prediction;
  outcome: Prediction;
  status: MatchStatus;
  points: number;
  verdict: "hit" | "miss" | "pending" | "live" | "unmarked";
}

export interface ParticipantSummary {
  participantId: string;
  participantName: string;
  points: number;
  hits: number;
  misses: number;
  finished: number;
  scheduled: number;
  live: number;
  unmarked: number;
  efficiency: number;
  distanceToLeader: number;
  distanceToAbove: number;
  couldStillScore: number;
  lastUpdated?: string;
}

export interface RankingEntry extends ParticipantSummary {
  position: number;
  movement: RankingMovement;
}

export interface TournamentSummary {
  participantCount: number;
  totalMatches: number;
  finishedMatches: number;
  scheduledMatches: number;
  liveMatches: number;
  tournamentStatus: "Pendiente" | "En curso" | "Finalizado";
  leaderName: string;
  topHits: number;
  worstUnmarked: number;
  lastUpdated?: string;
}

export interface FilterState {
  group: Group | "all";
  status: MatchStatus | "all";
  participantResult: "all" | "hit" | "miss" | "unmarked" | "pending";
}

export interface ResultsProvider {
  getResults(): Promise<ActualResult[]>;
}

export interface ResultsLoadState {
  results: ActualResult[];
  provider: ResultProviderName;
  requestedProvider: RequestedResultsProvider;
  label: string;
  message?: string;
  error?: string;
  updatedAt: string;
  canPoll: boolean;
}
