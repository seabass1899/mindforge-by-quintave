import { type ReactNode } from "react";

export function DrillShell({
  drillNumber,
  category,
  title,
  description,
  status,
  onBack,
  children,
}: {
  drillNumber: string;
  category: string;
  title: string;
  description: string;
  status: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
      <div className="border-b border-white/[0.06] px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 text-xs font-medium text-zinc-500 transition hover:text-[#d4af37] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
            >
              ← Choose Drill
            </button>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
              Drill {drillNumber} · {category}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">{description}</p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {status}
          </span>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
