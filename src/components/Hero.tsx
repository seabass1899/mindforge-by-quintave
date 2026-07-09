export function Hero({
  onStartDaily,
  onViewProgress,
}: {
  onStartDaily: () => void;
  onViewProgress: () => void;
}) {
  return (
    <section className="max-w-3xl" aria-labelledby="mindforge-hero-title">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#d4af37]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
        Premium cognitive performance system
      </p>
      <h1
        id="mindforge-hero-title"
        className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl"
      >
        Train the mind.
        <span className="mt-1 block bg-gradient-to-r from-[#f0d78c] via-[#d4af37] to-[#b8941f] bg-clip-text text-transparent">
          Sharpen the signal.
        </span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
        A focused daily protocol for working memory, attentional control, and cognitive flexibility. Run the full Daily Forge sequence or train a single domain.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStartDaily}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold text-[#060912] shadow-[0_0_28px_-10px_rgba(212,175,55,0.85)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
        >
          Begin Daily Forge
        </button>
        <button
          type="button"
          onClick={onViewProgress}
          className="inline-flex h-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 text-sm font-semibold text-zinc-300 transition hover:border-[#d4af37]/30 hover:text-[#f0d78c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
        >
          View Progress
        </button>
      </div>
    </section>
  );
}
