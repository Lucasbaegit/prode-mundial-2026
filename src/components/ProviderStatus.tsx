import type { ResultsLoadState } from "../types/prode";
import { formatRelativeTime } from "../utils/format";

interface ProviderStatusProps {
  loadState: ResultsLoadState | null;
  loading: boolean;
  onRefresh: () => void;
}

export function ProviderStatus({ loadState, loading, onRefresh }: ProviderStatusProps) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-insetLine">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Resultados
          </p>
          <p className="mt-1 text-lg font-black text-ink">
            {loadState?.label ?? "Preparando provider"}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Actualizado {formatRelativeTime(loadState?.updatedAt)}
          </p>
          {loadState?.message ? <p className="mt-2 text-sm text-stone-600">{loadState.message}</p> : null}
          {loadState?.error ? <p className="mt-2 text-sm font-semibold text-rust">{loadState.error}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="h-11 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:bg-night disabled:cursor-wait disabled:bg-stone-400"
        >
          {loading ? "Actualizando..." : "Actualizar resultados"}
        </button>
      </div>
    </section>
  );
}
