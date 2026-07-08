const drills = [
  {
    name: "Recall Matrix",
    category: "Memory",
    description: "Reconstruct spatial patterns from memory under time pressure.",
    duration: "4 min",
  },
  {
    name: "Signal Lock",
    category: "Focus",
    description: "Filter noise and sustain attention on a single target stream.",
    duration: "3 min",
  },
  {
    name: "Cognitive Switch",
    category: "Flexibility",
    description: "Shift rules mid-task and adapt without losing accuracy.",
    duration: "5 min",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-[#060912] font-sans text-zinc-100">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(30,58,95,0.35),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10">
              <span className="font-mono text-sm font-semibold text-[#d4af37]">
                M
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                MindForge
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#d4af37]/70">
                by Quintave
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400 sm:inline-block">
            Cognitive Training
          </span>
        </header>

        {/* Hero */}
        <main className="mt-16 flex flex-1 flex-col sm:mt-24">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#d4af37]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              High-performance training
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Train the mind.
              <span className="mt-1 block bg-gradient-to-r from-[#f0d78c] via-[#d4af37] to-[#b8941f] bg-clip-text text-transparent">
                Sharpen the signal.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Precision drills built for sustained attention, working memory,
              and mental agility. One focused session at a time.
            </p>
          </div>

          {/* Today's Workout */}
          <section className="mt-14 sm:mt-20">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/90 to-[#0a0f1c]/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm">
              <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                      Daily protocol
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      Today&apos;s Cognitive Workout
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="font-mono text-[#d4af37]">12</span>
                    <span>min total</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-3">
                {drills.map((drill, index) => (
                  <article
                    key={drill.name}
                    className="group flex flex-col bg-[#0a0f1c] px-6 py-6 transition-colors hover:bg-[#0d1424] sm:px-7 sm:py-7"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-600">
                        0{index + 1}
                      </span>
                      <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
                        {drill.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-white group-hover:text-[#f0d78c]">
                      {drill.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">
                      {drill.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
                      <span className="text-xs text-zinc-600">{drill.duration}</span>
                      <span className="text-xs font-medium text-[#d4af37]/70 transition-colors group-hover:text-[#d4af37]">
                        Begin →
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Footer CTA strip */}
          <div className="mt-10 flex flex-col items-start gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Consistency compounds. Show up today.
            </p>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110"
            >
              Start Workout
            </button>
          </div>
        </main>

        <footer className="mt-16 border-t border-white/[0.05] pt-8 text-center text-xs text-zinc-600 sm:mt-20">
          © {new Date().getFullYear()} Quintave · MindForge
        </footer>
      </div>
    </div>
  );
}
