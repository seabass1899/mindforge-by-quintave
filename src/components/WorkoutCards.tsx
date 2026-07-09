import { drillCatalog, type DrillId, type PlayableDrillId } from "@/lib/drills";

export function WorkoutCards({
  selectedDrill,
  onStart,
  onStartDaily,
}: {
  selectedDrill: DrillId;
  onStart: (id: PlayableDrillId) => void;
  onStartDaily: () => void;
}) {
  return (
    <section className="mt-10 sm:mt-14" aria-label="Today's cognitive workout">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/90 to-[#0a0f1c]/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm">
        <div className="border-b border-white/[0.06] px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                Daily protocol
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Today&apos;s Cognitive Workout
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                Complete the three core Daily Forge drills, or launch Vector Field as an advanced selective-attention lab.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="font-mono text-[#d4af37]">4</span>
                <span>drills live</span>
              </div>
              <button
                type="button"
                onClick={onStartDaily}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-5 text-sm font-semibold text-[#060912] shadow-[0_0_24px_-8px_rgba(212,175,55,0.7)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] sm:w-auto"
              >
                Begin Daily Forge
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-white/[0.04] md:grid-cols-4">
          {drillCatalog.map((drill, index) => (
            <article
              key={drill.id}
              className={`flex flex-col px-5 py-6 transition sm:px-7 sm:py-7 ${
                selectedDrill === drill.id
                  ? "bg-[#0d1424] ring-1 ring-inset ring-[#d4af37]/20"
                  : "bg-[#0a0f1c]"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-600">0{index + 1}</span>
                <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
                  {drill.category}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-white">{drill.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{drill.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
                <span className="text-xs text-zinc-600">{drill.duration}</span>
                <button
                  type="button"
                  onClick={() => onStart(drill.id)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-[#d4af37] transition hover:bg-[#d4af37]/10 hover:text-[#f0d78c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
                >
                  Start →
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
