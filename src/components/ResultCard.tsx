type ResultMetric = {
  label: string;
  value: string | number;
};

export function ResultCard({
  label,
  score,
  scoreLabel,
  metrics,
  note,
  onPlayAgain,
  onChooseDrill,
  playAgainLabel = "Play Again",
  chooseDrillLabel = "Choose Drill",
}: {
  label: string;
  score: number;
  scoreLabel: string;
  metrics: ResultMetric[];
  note: string;
  onPlayAgain: () => void;
  onChooseDrill: () => void;
  playAgainLabel?: string;
  chooseDrillLabel?: string;
}) {
  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">{label}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{score.toLocaleString()}</p>
        <p className="mt-1 text-sm text-zinc-400">{scoreLabel}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-2">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{item.label}</p>
              <p className="mt-1 font-mono text-lg text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-zinc-500">{note}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold text-[#060912] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
          >
            {playAgainLabel}
          </button>
          <button
            type="button"
            onClick={onChooseDrill}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
          >
            {chooseDrillLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
