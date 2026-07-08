export function TimerBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-mono text-2xl font-semibold text-[#d4af37]">{value}</span>
    </div>
  );
}
