"use client";

import { useState } from "react";
import {
  average,
  calculateStreak,
  formatSessionDate,
  type CognitiveDomain,
  type DailySession,
} from "@/lib/progress";

type DomainKey = "memory" | "focus" | "flexibility";

type DomainSummary = {
  key: DomainKey;
  label: CognitiveDomain;
  shortLabel: string;
  average: number;
  latest: number;
};

function domainAverage(sessions: DailySession[], domain: DomainKey): number {
  return average(sessions.map((session) => session[domain]));
}

function buildDomainSummaries(sessions: DailySession[]): DomainSummary[] {
  const latest = sessions[0];
  return [
    {
      key: "memory",
      label: "Memory",
      shortLabel: "MEM",
      average: domainAverage(sessions, "memory"),
      latest: latest?.memory ?? 0,
    },
    {
      key: "focus",
      label: "Focus",
      shortLabel: "FOC",
      average: domainAverage(sessions, "focus"),
      latest: latest?.focus ?? 0,
    },
    {
      key: "flexibility",
      label: "Flexibility",
      shortLabel: "FLEX",
      average: domainAverage(sessions, "flexibility"),
      latest: latest?.flexibility ?? 0,
    },
  ];
}

function highestDomain(summaries: DomainSummary[]): CognitiveDomain | "—" {
  if (summaries.length === 0) return "—";
  return summaries.reduce((best, item) => (item.average > best.average ? item : best), summaries[0]).label;
}

function lowestDomain(summaries: DomainSummary[]): CognitiveDomain | "—" {
  if (summaries.length === 0) return "—";
  return summaries.reduce((lowest, item) => (item.average < lowest.average ? item : lowest), summaries[0]).label;
}

function formatDelta(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
}

function deltaTone(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function ProgressPanel({
  sessions,
  onClear,
}: {
  sessions: DailySession[];
  onClear: () => void;
}) {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const recentSessions = sessions.slice(0, 7);
  const summaries = buildDomainSummaries(recentSessions);
  const averageCpi = average(recentSessions.map((session) => session.cpi));
  const bestCpi = recentSessions.reduce((best, session) => Math.max(best, session.cpi), 0);
  const streak = calculateStreak(sessions);
  const strongest = highestDomain(summaries);
  const recommended = lowestDomain(summaries);
  const latest = recentSessions[0];
  const previous = recentSessions[1];
  const cpiDelta = latest && previous ? latest.cpi - previous.cpi : 0;
  const maxDomainAverage = Math.max(...summaries.map((summary) => summary.average), 1);
  const hasTrend = recentSessions.length > 1;

  const handleClear = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }
    onClear();
    setIsConfirmingClear(false);
  };

  return (
    <section
      className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/90 to-[#0a0f1c]/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.48)] backdrop-blur-sm sm:mt-12"
      aria-label="Progress dashboard"
    >
      <div className="border-b border-white/[0.06] px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
              Progress dashboard
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Cognitive Performance Dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Review your Daily Forge trend, domain balance, streak, and next training focus. Results stay local in this browser until the database layer is added.
            </p>
          </div>
          {sessions.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
              {isConfirmingClear && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(false)}
                  className="rounded-full border border-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-500 transition hover:border-white/20 hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className={[
                  "rounded-full border px-4 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                  isConfirmingClear
                    ? "border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-300/50"
                    : "border-white/[0.08] text-zinc-500 hover:border-[#d4af37]/30 hover:text-[#d4af37]",
                ].join(" ")}
              >
                {isConfirmingClear ? "Confirm clear history" : "Clear local history"}
              </button>
            </div>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-8 sm:px-8">
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1c]/70 p-8 text-center">
            <p className="text-sm font-medium text-white">No progress recorded yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Complete a Daily Forge workout to activate CPI trends, streak tracking, and domain recommendations.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-3 xl:grid-cols-[1.15fr_2fr]">
            <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/80">Current average</p>
              <p className="mt-2 font-mono text-4xl font-semibold text-white">{averageCpi.toLocaleString()}</p>
              <p className="mt-1 text-sm text-zinc-500">
                Average CPI across last {recentSessions.length} session{recentSessions.length === 1 ? "" : "s"}.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <CompactMetric label="Best CPI" value={bestCpi.toLocaleString()} />
                <CompactMetric
                  label="Last change"
                  value={hasTrend ? formatDelta(cpiDelta) : "Baseline"}
                  accent={hasTrend ? deltaTone(cpiDelta) : "neutral"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardMetric label="Streak" value={`${streak}d`} detail="Consecutive training days" />
              <DashboardMetric label="Sessions" value={sessions.length.toLocaleString()} detail="Saved locally" />
              <DashboardMetric label="Best domain" value={strongest} detail="Highest recent average" />
              <DashboardMetric label="Train next" value={recommended} detail="Lowest recent average" />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1c]/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/80">Domain balance</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Recent Performance</h3>
                </div>
                <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  Last 7
                </span>
              </div>

              <div className="space-y-5">
                {summaries.map((summary) => {
                  const width = Math.max(8, Math.round((summary.average / maxDomainAverage) * 100));
                  const latestDelta = Math.round(summary.latest - summary.average);

                  return (
                    <div key={summary.key}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{summary.label}</p>
                          <p className="text-xs text-zinc-500">Latest {summary.latest.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg text-[#d4af37]">{summary.average.toLocaleString()}</p>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Avg</p>
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8c741e] to-[#d4af37] transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      {hasTrend && (
                        <p
                          className={[
                            "mt-1 text-xs",
                            latestDelta > 0
                              ? "text-emerald-300/70"
                              : latestDelta < 0
                                ? "text-red-300/70"
                                : "text-zinc-600",
                          ].join(" ")}
                        >
                          Latest vs avg: {formatDelta(latestDelta)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1c]/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/80">Session log</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Last 7 Daily Forge Results</h3>
                </div>
                <span className="rounded-full border border-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  Local
                </span>
              </div>

              <div className="grid gap-3">
                {recentSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/[0.06] bg-[#080c16]/80 p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start lg:grid-cols-[auto_1fr_auto]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/10 font-mono text-xs text-[#d4af37]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">CPI {session.cpi.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatSessionDate(session.completedAt)}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Strength: {session.primaryStrength} · Train next: {session.recommendedFocus}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-left sm:col-span-2 lg:col-span-1 lg:min-w-72 lg:text-right">
                        <MiniScore label="MEM" value={session.memory} />
                        <MiniScore label="FOC" value={session.focus} />
                        <MiniScore label="FLEX" value={session.flexibility} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1c]/70 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-xl text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-600">{detail}</p>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    accent === "positive" ? "text-emerald-300" : accent === "negative" ? "text-red-300" : "text-white";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-lg ${valueClass}`}>{value}</p>
    </div>
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
