export function AppHeader() {
  return (
    <header className="relative overflow-hidden rounded-none border-b border-ink/10 bg-ink text-chalk">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-maize">
              Prode de Lucas
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">
              Prode Mundial 2026
            </h1>
            <p className="mt-3 max-w-2xl text-base text-chalk/80">
              Predicciones, resultados y puntajes en tiempo real.
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-white/15 bg-white/10 p-4 text-sm text-chalk/85 shadow-insetLine sm:min-w-80">
            <span className="font-bold text-white">Leyenda L/E/V</span>
            <span>L = gana el equipo de la izquierda/local.</span>
            <span>E = empate.</span>
            <span>V = gana el equipo de la derecha/visitante.</span>
          </div>
        </div>
      </div>
    </header>
  );
}
