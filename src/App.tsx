import { useCallback, useEffect, useMemo, useState } from "react";
import { matches } from "./data/matches";
import { participants, previousRankingPositions } from "./data/participants";
import type {
  ActualResult,
  FilterState,
  Group,
  Match,
  MatchScore,
  Participant,
  ResultsLoadState
} from "./types/prode";
import { GROUPS } from "./types/prode";
import { AppHeader } from "./components/AppHeader";
import { ErrorState } from "./components/ErrorState";
import { FiltersBar } from "./components/FiltersBar";
import { GroupCard } from "./components/GroupCard";
import { Leaderboard } from "./components/Leaderboard";
import { LoadingState } from "./components/LoadingState";
import { ParticipantSelector } from "./components/ParticipantSelector";
import { Podium } from "./components/Podium";
import { ProviderStatus } from "./components/ProviderStatus";
import { SummaryCards } from "./components/SummaryCards";
import { TournamentCard } from "./components/TournamentCard";
import { downloadRankingCsv } from "./utils/csv";
import { calculateRanking, calculateTournamentSummary } from "./utils/ranking";
import { buildResultMap, calculateMatchScore, getResultForMatch } from "./utils/scoring";
import { groupMatchesByGroup, validateProdeData } from "./utils/validation";
import { loadResultsWithFallback } from "./services/resultsProvider";

const initialFilters: FilterState = {
  group: "all",
  status: "all",
  participantResult: "all"
};

export default function App() {
  const [selectedParticipantId, setSelectedParticipantId] = useState("lucas");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loadState, setLoadState] = useState<ResultsLoadState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshResults = useCallback(async () => {
    setLoading(true);
    setRefreshError(null);
    try {
      const nextState = await loadResultsWithFallback();
      setLoadState(nextState);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "No se pudieron cargar resultados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshResults();
  }, [refreshResults]);

  useEffect(() => {
    if (loadState?.requestedProvider !== "api-football") return;

    const intervalId = window.setInterval(() => {
      void refreshResults();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadState?.requestedProvider, refreshResults]);

  const results = loadState?.results ?? [];
  const selectedParticipant =
    selectedParticipantId === "all"
      ? null
      : participants.find((participant) => participant.id === selectedParticipantId) ?? participants[0];

  const validation = useMemo(
    () => validateProdeData(matches, participants, results),
    [results]
  );

  const ranking = useMemo(
    () => calculateRanking(participants, matches, results, previousRankingPositions),
    [results]
  );

  const tournamentSummary = useMemo(
    () => calculateTournamentSummary(matches, participants, results, ranking),
    [results, ranking]
  );

  const selectedSummary = selectedParticipant
    ? ranking.find((entry) => entry.participantId === selectedParticipant.id)
    : null;

  const resultRowsByGroup = useMemo(
    () => buildRowsByGroup(matches, results, selectedParticipant, filters),
    [results, selectedParticipant, filters]
  );

  const visibleGroups = filters.group === "all" ? GROUPS : [filters.group];

  const keyPendingMatches = useMemo(
    () => {
      const resultsById = buildResultMap(results);
      return matches.filter((match) =>
        participants.some((participant) => {
          const result = getResultForMatch(match, resultsById);
          return result.status !== "finished" && participant.predictions[match.id] !== null;
        })
      ).length;
    },
    [results]
  );

  const nextPointsInPlay = useMemo(() => {
    const resultsById = buildResultMap(results);
    return matches.reduce((total, match) => {
      const result = getResultForMatch(match, resultsById);
      if (result.status === "finished") return total;
      return (
        total +
        participants.filter((participant) => participant.predictions[match.id] !== null).length
      );
    }, 0);
  }, [results]);

  return (
    <div className="min-h-screen bg-chalk text-ink">
      <AppHeader />

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
          <ParticipantSelector
            participants={participants}
            selectedParticipantId={selectedParticipantId}
            onChange={(participantId) => {
              setSelectedParticipantId(participantId);
              if (participantId === "all") {
                setFilters((current) => ({ ...current, participantResult: "all" }));
              }
            }}
          />
          <ProviderStatus loadState={loadState} loading={loading} onRefresh={refreshResults} />
        </div>

        {loading && !loadState ? <LoadingState /> : null}
        {refreshError ? <ErrorState message={refreshError} /> : null}
        {!validation.valid ? (
          <ErrorState
            title="Validación de datos"
            message={validation.errors.join(" ")}
          />
        ) : null}

        <TournamentCard
          summary={tournamentSummary}
          keyPendingMatches={keyPendingMatches}
          nextPointsInPlay={nextPointsInPlay}
        />

        {selectedSummary ? <SummaryCards summary={selectedSummary} /> : null}

        {selectedParticipantId === "all" ? (
          <>
            <Podium ranking={ranking} />
            <Leaderboard ranking={ranking} onExportCsv={() => downloadRankingCsv(ranking)} />
          </>
        ) : (
          <Leaderboard ranking={ranking} onExportCsv={() => downloadRankingCsv(ranking)} />
        )}

        <FiltersBar
          filters={filters}
          onChange={setFilters}
          disableParticipantResult={selectedParticipantId === "all"}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          {visibleGroups.map((group) => (
            <GroupCard key={group} group={group} rows={resultRowsByGroup[group]} />
          ))}
        </section>
      </main>
    </div>
  );
}

function buildRowsByGroup(
  allMatches: Match[],
  results: ActualResult[],
  selectedParticipant: Participant | null,
  filters: FilterState
): Record<Group, Array<{ match: Match; result: ActualResult; score?: MatchScore }>> {
  const resultsById = buildResultMap(results);
  const matchesByGroup = groupMatchesByGroup(allMatches);

  return GROUPS.reduce(
    (acc, group) => {
      const rows = matchesByGroup[group]
        .filter((match) => filters.group === "all" || match.group === filters.group)
        .map((match) => {
          const result = getResultForMatch(match, resultsById);
          const score = selectedParticipant
            ? calculateMatchScore(match, selectedParticipant, result)
            : undefined;
          return { match, result, score };
        })
        .filter((row) => filters.status === "all" || row.result.status === filters.status)
        .filter((row) => {
          if (!selectedParticipant || filters.participantResult === "all") return true;
          return row.score?.verdict === filters.participantResult;
        });

      acc[group] = rows;
      return acc;
    },
    {} as Record<Group, Array<{ match: Match; result: ActualResult; score?: MatchScore }>>
  );
}
