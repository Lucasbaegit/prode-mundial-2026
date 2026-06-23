import type { ResultsLoadState, ResultsMeta } from "../types/prode";
import { formatRelativeTime } from "../utils/format";

interface ProviderStatusProps {
  loadState: ResultsLoadState | null;
  loading: boolean;
  onRefresh: () => void;
}

export function ProviderStatus({ loadState, loading, onRefresh }: ProviderStatusProps) {
  const meta = loadState?.meta;

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-insetLine">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Resultados
          </p>
          <p className="mt-1 text-lg font-black text-ink">
            {loadState?.label ?? "Preparando provider"}
          </p>
          {loadState ? (
            <p
              className={`mt-1 text-xs font-black uppercase tracking-[0.16em] ${
                loadState.label === "Backend local no disponible" ? "text-rust" : "text-field"
              }`}
            >
              {loadState.label === "Backend local no disponible"
                ? "Backend local no disponible"
                : "Backend local conectado"}
            </p>
          ) : null}

          <p className="mt-2 text-sm font-semibold text-stone-700">
            {buildSummaryText(loadState)}
          </p>

          {meta ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip label="Reales" value={meta.realResultsCount} />
              <StatusChip label="Sin dato" value={meta.pendingWithoutRealDataCount} />
              <StatusChip label="Fuente" value={formatProvider(meta.provider)} />
              {meta.provider === "cache" ? (
                <StatusChip label="Cache" value={isCacheFresh(meta) ? "fresco" : "vencido"} />
              ) : null}
            </div>
          ) : null}

          {loadState?.message ? <p className="mt-2 text-sm text-stone-600">{loadState.message}</p> : null}
          {loadState?.error ? <p className="mt-2 text-sm font-semibold text-rust">{loadState.error}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="h-11 shrink-0 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:bg-night disabled:cursor-wait disabled:bg-stone-400"
        >
          {loading ? "Actualizando..." : "Actualizar resultados reales"}
        </button>
      </div>
    </section>
  );
}

interface StatusChipProps {
  label: string;
  value: string | number;
}

function StatusChip({ label, value }: StatusChipProps) {
  return (
    <span className="rounded-full bg-chalk px-3 py-1 text-xs font-black text-ink ring-1 ring-ink/10">
      <span className="text-stone-500">{label}:</span> {value}
    </span>
  );
}

function buildSummaryText(loadState: ResultsLoadState | null): string {
  if (!loadState) return "Preparando estado de resultados";

  const meta = loadState.meta;
  if (!meta) return `Actualizado ${formatRelativeTime(loadState.updatedAt)}`;

  if (meta.provider === "pending") {
    return `Sin fuente real: ${meta.pendingWithoutRealDataCount} partidos pendientes`;
  }

  if (meta.provider === "cache") {
    return `Usando cache real · ${meta.realResultsCount} resultados reales · actualizado ${formatRelativeTime(
      loadState.updatedAt
    )}`;
  }

  if (meta.provider === "manual-real") {
    return `Resultados reales desde CSV · ${meta.realResultsCount} cargados · ${meta.pendingWithoutRealDataCount} pendientes sin datos`;
  }

  return `${meta.realResultsCount} resultados reales cargados · ${meta.pendingWithoutRealDataCount} pendientes sin datos · Fuente: ${formatProvider(
    meta.provider
  )} · Actualizado ${formatRelativeTime(loadState.updatedAt)}`;
}

function formatProvider(provider: ResultsMeta["provider"]): string {
  if (provider === "football-data") return "football-data.org";
  if (provider === "manual-real") return "CSV";
  if (provider === "cache") return "cache real";
  return "pending";
}

function isCacheFresh(meta: ResultsMeta): boolean {
  return meta.cacheAgeSeconds !== null && meta.cacheAgeSeconds < meta.cacheTtlSeconds;
}
