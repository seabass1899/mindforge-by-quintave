export function Hero() {
  return (
    <div className="max-w-2xl">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#d4af37]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
        High-performance training
      </p>
      <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
        Train the mind.
        <span className="mt-1 block bg-gradient-to-r from-[#f0d78c] via-[#d4af37] to-[#b8941f] bg-clip-text text-transparent">
          Sharpen the signal.
        </span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
        Precision drills for working memory, focused attention, and cognitive flexibility. Choose a drill below to begin.
      </p>
    </div>
  );
}
