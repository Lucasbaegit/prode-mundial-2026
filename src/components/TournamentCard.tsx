import type { ResultsMeta, TournamentSummary } from "../types/prode";
import { formatDateTime } from "../utils/format";

interface TournamentCardProps {
  summary: TournamentSummary;
  keyPendingMatches: number;
  nextPointsInPlay: number;
  resultsMeta?: ResultsMeta;
}

export function TournamentCard({
  summary,
  keyPendingMatches,
  nextPointsInPlay,
  resultsMeta
}: TournamentCardProps) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-insetLine">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Torneo</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Prode de Lucas</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            1 punto por acierto. Los partidos en vivo o pendientes no suman hasta finalizar.
          </p>
        </div>
        <span className="w-fit rounded-full bg-field/10 px-3 py-1 text-sm font-black text-field ring-1 ring-field/20">
          {summary.tournamentStatus}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Participantes" value={summary.participantCount} />
        <Metric label="Partidos computados" value={summary.finishedMatches} />
        <Metric label="Pendientes" value={summary.scheduledMatches} />
        <Metric label="En vivo" value={summary.liveMatches} />
        <Metric label="Lider" value={summary.leaderName} />
        <Metric label="Mayor aciertos" value={summary.topHits} />
        <Metric label="Peor sin marcar" value={summary.worstUnmarked} />
        <Metric label="Ultima actualizacion" value={formatDateTime(summary.lastUpdated)} />
        <Metric label="Partidos clave pendientes" value={keyPendingMatches} />
        <Metric label="Proximos puntos en juego" value={nextPointsInPlay} />
        <Metric label="Total partidos" value={summary.totalMatches} />
        <Metric label="Resultados reales" value={resultsMeta?.realResultsCount ?? 0} />
        <Metric label="Sin dato real" value={resultsMeta?.pendingWithoutRealDataCount ?? summary.totalMatches} />
        <Metric label="Fuente activa" value={formatProvider(resultsMeta?.provider)} />
        <Metric label="Cache" value={formatCacheState(resultsMeta)} />
        <Metric label="Puntuacion" value="1 punto" />
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg bg-chalk p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function formatProvider(provider: ResultsMeta["provider"] | undefined): string {
  if (provider === "football-data") return "football-data.org";
  if (provider === "manual-real") return "CSV";
  if (provider === "cache") return "cache";
  if (provider === "pending") return "pending";
  return "N/D";
}

function formatCacheState(meta: ResultsMeta | undefined): string {
  if (!meta || meta.cacheAgeSeconds === null) return "sin cache";
  return meta.cacheAgeSeconds < meta.cacheTtlSeconds ? "fresco" : "vencido";
}
