import {
  average,
  calculateStreak,
  formatSessionDate,
  type CognitiveDomain,
  type DailySession,
} from "@/lib/progress";

function domainAverage(sessions: DailySession[], domain: "memory" | "focus" | "flexibility"): number {
  return average(sessions.map((session) => session[domain]));
}

function highestDomain(sessions: DailySession[]): CognitiveDomain | "—" {
  if (sessions.length === 0) return "—";
  const scores = [
    { label: "Memory" as const, value: domainAverage(sessions, "memory") },
    { label: "Focus" as const, value: domainAverage(sessions, "focus") },
    { label: "Flexibility" as const, value: domainAverage(sessions, "flexibility") },
  ];
  return scores.reduce((best, item) => (item.value > best.value ? item : best), scores[0]).label;
}

function lowestDomain(sessions: DailySession[]): CognitiveDomain | "—" {
  if (sessions.length === 0) return "—";
  const scores = [
    { label: "Memory" as const, value: domainAverage(sessions, "memory") },
    { label: "Focus" as const, value: domainAverage(sessions, "focus") },
    { label: "Flexibility" as const, value: domainAverage(sessions, "flexibility") },
  ];
  return scores.reduce((lowest, item) => (item.value < lowest.value ? item : lowest), scores[0]).label;
}

export function ProgressPanel({
  sessions,
  onClear,
}: {
  sessions: DailySession[];
  onClear: () => void;
}) {
  const recentSessions = sessions.slice(0, 7);
  const averageCpi = average(recentSessions.map((session) => session.cpi));
  const bestCpi = recentSessions.reduce((best, session) => Math.max(best, session.cpi), 0);
  const streak = calculateStreak(sessions);
  const strongest = highestDomain(recentSessions);
  const recommended = lowestDomain(recentSessions);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/80 to-[#0a0f1c]/80 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
              Progress memory
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Local Performance History
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
              Your last Daily Forge results are saved in this browser until the database layer is added.
            </p>
          </div>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-zinc-500 transition hover:text-[#d4af37]"
            >
              Clear local history
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="px-6 py-6 sm:px-8">
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1c]/70 p-6 text-center">
            <p className="text-sm text-zinc-400">
              Complete a Daily Forge workout to activate your progress panel.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { label: "Avg CPI", value: averageCpi.toLocaleString() },
              { label: "Best CPI", value: bestCpi.toLocaleString() },
              { label: "Streak", value: `${streak}d` },
              { label: "Best domain", value: strongest },
              { label: "Train next", value: recommended },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/70 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{metric.label}</p>
                <p className="mt-1 font-mono text-lg text-white">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            {recentSessions.map((session, index) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-xl border border-white/[0.06] bg-[#0a0f1c]/60 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/10 font-mono text-xs text-[#d4af37]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    CPI {session.cpi.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatSessionDate(session.completedAt)} · Strength: {session.primaryStrength} · Focus: {session.recommendedFocus}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-right sm:min-w-72">
                  <MiniScore label="MEM" value={session.memory} />
                  <MiniScore label="FOC" value={session.focus} />
                  <MiniScore label="FLEX" value={session.flexibility} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="font-mono text-sm text-zinc-300">{value.toLocaleString()}</p>
    </div>
  );
}
