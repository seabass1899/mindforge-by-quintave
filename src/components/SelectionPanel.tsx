import { drillCatalog, type PlayableDrillId } from "@/lib/drills";

export function SelectionPanel({ onSelect }: { onSelect: (id: PlayableDrillId) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
      <div className="border-b border-white/[0.06] px-5 py-5 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">Select drill</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Choose Your Workout</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">Pick a cognitive domain to train individually, or use Daily Forge for the complete sequence.</p>
      </div>
      <div className="grid gap-4 px-5 py-6 sm:grid-cols-3 sm:px-8 sm:py-8">
        {drillCatalog.map((drill) => (
          <button
            key={drill.id}
            type="button"
            onClick={() => onSelect(drill.id)}
            className="group rounded-xl border border-white/[0.08] bg-[#0a0f1c] p-5 text-left transition hover:border-[#d4af37]/30 hover:bg-[#0d1424] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] sm:p-6"
          >
            <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
              {drill.category}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-[#f0d78c]">{drill.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{drill.description}</p>
            <p className="mt-4 text-xs text-zinc-600">{drill.duration}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
