export function Header() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 shadow-[0_0_22px_-10px_rgba(212,175,55,0.8)]">
          <span className="font-mono text-sm font-semibold text-[#d4af37]">M</span>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">MindForge</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#d4af37]/70">
            by Quintave
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400 sm:inline-block">
          Cognitive Training
        </span>
        <span className="rounded-full border border-[#d4af37]/15 bg-[#d4af37]/5 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-[#d4af37]/80">
          v0.2
        </span>
      </div>
    </header>
  );
}
