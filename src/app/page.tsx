"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Shared ───────────────────────────────────────────────────────────────────

type DrillId = "select" | "recall-matrix" | "signal-lock";

const drillCatalog = [
  {
    id: "recall-matrix" as const,
    name: "Recall Matrix",
    category: "Memory",
    description: "Reconstruct spatial patterns from memory under time pressure.",
    duration: "4 min",
    available: true,
  },
  {
    id: "signal-lock" as const,
    name: "Signal Lock",
    category: "Focus",
    description: "Filter noise and lock onto the target signal under distraction.",
    duration: "30 sec",
    available: true,
  },
  {
    id: "cognitive-switch" as const,
    name: "Cognitive Switch",
    category: "Flexibility",
    description: "Shift rules mid-task and adapt without losing accuracy.",
    duration: "5 min",
    available: false,
  },
];

// ─── Recall Matrix ────────────────────────────────────────────────────────────

const RM_GRID_SIZE = 9;
const RM_INITIAL_LENGTH = 3;
const RM_FLASH_MS = 520;
const RM_GAP_MS = 220;
const RM_PRE_MS = 700;

type RmPhase = "intro" | "showing" | "input" | "result";

type RmStats = {
  level: number;
  sequenceLength: number;
  correctTaps: number;
  mistakes: number;
  finalScore: number;
};

function rmGenerateSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * RM_GRID_SIZE));
}

function rmCalculateScore(stats: Omit<RmStats, "finalScore">): number {
  const { level, sequenceLength, correctTaps, mistakes } = stats;
  const totalTaps = correctTaps + mistakes;
  const accuracy = totalTaps > 0 ? correctTaps / totalTaps : 0;
  const levelsCompleted = Math.max(0, level - 1);
  return Math.round(
    levelsCompleted * 200 +
      correctTaps * 25 +
      accuracy * levelsCompleted * sequenceLength * 20 +
      levelsCompleted * sequenceLength * 10,
  );
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function rmPhaseLabel(phase: RmPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "showing":
      return "Watch the sequence";
    case "input":
      return "Your turn — repeat the pattern";
    case "result":
      return "Session complete";
  }
}

// ─── Signal Lock ──────────────────────────────────────────────────────────────

const SL_GRID_DIM = 4;
const SL_GRID_SIZE = SL_GRID_DIM * SL_GRID_DIM;
const SL_DURATION_SEC = 30;
const SL_ROUND_TIMEOUT_MS = 2800;

type SlPhase = "intro" | "playing" | "result";
type SlCellRole = "neutral" | "target" | "distractor";

type SlRound = {
  target: number;
  distractors: number[];
};

type SlStats = {
  hits: number;
  misses: number;
  mistakes: number;
  responseTimes: number[];
  finalScore: number;
};

function slGenerateRound(): SlRound {
  const pool = Array.from({ length: SL_GRID_SIZE }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const distractorCount = 3 + Math.floor(Math.random() * 3);
  return {
    target: pool[0],
    distractors: pool.slice(1, 1 + distractorCount),
  };
}

function slCellRole(index: number, round: SlRound): SlCellRole {
  if (index === round.target) return "target";
  if (round.distractors.includes(index)) return "distractor";
  return "neutral";
}

function slCalculateScore(stats: Omit<SlStats, "finalScore">): number {
  const { hits, misses, mistakes, responseTimes } = stats;
  const totalClicks = hits + mistakes;
  const clickAccuracy = totalClicks > 0 ? hits / totalClicks : 0;
  const totalRounds = hits + misses;
  const completionRate = totalRounds > 0 ? hits / totalRounds : 0;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus =
    avgMs > 0 ? Math.max(0, (1200 - avgMs) / 1200) * 150 : 0;

  return Math.round(
    hits * 35 +
      clickAccuracy * 180 +
      completionRate * 120 +
      speedBonus -
      mistakes * 20 -
      misses * 25,
  );
}

function slPhaseLabel(phase: SlPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Lock the signal";
    case "result":
      return "Session complete";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedDrill, setSelectedDrill] = useState<DrillId>("select");
  const drillRef = useRef<HTMLElement>(null);

  const scrollToDrill = useCallback(() => {
    drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectDrill = useCallback(
    (id: DrillId) => {
      setSelectedDrill(id);
      scrollToDrill();
    },
    [scrollToDrill],
  );

  // Recall Matrix state
  const [rmPhase, setRmPhase] = useState<RmPhase>("intro");
  const [rmSequence, setRmSequence] = useState<number[]>([]);
  const [rmUserInput, setRmUserInput] = useState<number[]>([]);
  const [rmActiveCell, setRmActiveCell] = useState<number | null>(null);
  const [rmConfirmedCells, setRmConfirmedCells] = useState<number[]>([]);
  const [rmRound, setRmRound] = useState(0);
  const [rmStats, setRmStats] = useState<RmStats>({
    level: 1,
    sequenceLength: RM_INITIAL_LENGTH,
    correctTaps: 0,
    mistakes: 0,
    finalScore: 0,
  });
  const rmAbortRef = useRef<AbortController | null>(null);

  const resetRecallMatrix = useCallback(() => {
    rmAbortRef.current?.abort();
    setRmPhase("intro");
    setRmSequence([]);
    setRmUserInput([]);
    setRmActiveCell(null);
    setRmConfirmedCells([]);
    setRmRound(0);
    setRmStats({
      level: 1,
      sequenceLength: RM_INITIAL_LENGTH,
      correctTaps: 0,
      mistakes: 0,
      finalScore: 0,
    });
  }, []);

  const startRecallMatrix = useCallback(() => {
    rmAbortRef.current?.abort();
    setRmSequence(rmGenerateSequence(RM_INITIAL_LENGTH));
    setRmUserInput([]);
    setRmActiveCell(null);
    setRmConfirmedCells([]);
    setRmRound(1);
    setRmStats({
      level: 1,
      sequenceLength: RM_INITIAL_LENGTH,
      correctTaps: 0,
      mistakes: 0,
      finalScore: 0,
    });
    setRmPhase("showing");
    setSelectedDrill("recall-matrix");
    scrollToDrill();
  }, [scrollToDrill]);

  const rmAdvanceLevel = useCallback((current: RmStats) => {
    const nextLength = current.sequenceLength + 1;
    setRmStats({
      ...current,
      level: current.level + 1,
      sequenceLength: nextLength,
    });
    setRmSequence(rmGenerateSequence(nextLength));
    setRmUserInput([]);
    setRmConfirmedCells([]);
    setRmRound((v) => v + 1);
    setRmPhase("showing");
  }, []);

  const rmEndGame = useCallback((current: RmStats) => {
    setRmStats({ ...current, finalScore: rmCalculateScore(current) });
    setRmPhase("result");
    setRmActiveCell(null);
    setRmConfirmedCells([]);
  }, []);

  useEffect(() => {
    if (rmPhase !== "showing" || rmSequence.length === 0) return;
    const controller = new AbortController();
    rmAbortRef.current = controller;

    const run = async () => {
      try {
        setRmActiveCell(null);
        await delay(RM_PRE_MS, controller.signal);
        for (const cell of rmSequence) {
          setRmActiveCell(cell);
          await delay(RM_FLASH_MS, controller.signal);
          setRmActiveCell(null);
          await delay(RM_GAP_MS, controller.signal);
        }
        setRmPhase("input");
        setRmUserInput([]);
        setRmConfirmedCells([]);
      } catch {
        /* aborted */
      }
    };
    void run();
    return () => controller.abort();
  }, [rmPhase, rmRound, rmSequence]);

  const rmHandleCellClick = (cellIndex: number) => {
    if (rmPhase !== "input") return;
    const step = rmUserInput.length;
    if (cellIndex !== rmSequence[step]) {
      const failed = { ...rmStats, mistakes: rmStats.mistakes + 1 };
      setRmActiveCell(cellIndex);
      window.setTimeout(() => rmEndGame(failed), 320);
      return;
    }
    const nextInput = [...rmUserInput, cellIndex];
    setRmUserInput(nextInput);
    setRmConfirmedCells(nextInput);
    setRmActiveCell(cellIndex);
    window.setTimeout(() => setRmActiveCell(null), 180);
    const updated = { ...rmStats, correctTaps: rmStats.correctTaps + 1 };
    setRmStats(updated);
    if (nextInput.length === rmSequence.length) {
      window.setTimeout(() => rmAdvanceLevel(updated), 420);
    }
  };

  const rmAccuracy =
    rmStats.correctTaps + rmStats.mistakes > 0
      ? Math.round(
          (rmStats.correctTaps / (rmStats.correctTaps + rmStats.mistakes)) *
            100,
        )
      : 100;

  // Signal Lock state
  const [slPhase, setSlPhase] = useState<SlPhase>("intro");
  const [slRound, setSlRound] = useState<SlRound>(() => slGenerateRound());
  const [slRoundId, setSlRoundId] = useState(0);
  const [slTimeLeft, setSlTimeLeft] = useState(SL_DURATION_SEC);
  const [slFlashCell, setSlFlashCell] = useState<number | null>(null);
  const [slFlashType, setSlFlashType] = useState<"hit" | "miss" | null>(null);
  const [slStats, setSlStats] = useState<SlStats>({
    hits: 0,
    misses: 0,
    mistakes: 0,
    responseTimes: [],
    finalScore: 0,
  });
  const slRoundStartRef = useRef<number>(0);
  const slEndedRef = useRef(false);

  const resetSignalLock = useCallback(() => {
    slEndedRef.current = false;
    setSlPhase("intro");
    setSlRound(slGenerateRound());
    setSlRoundId(0);
    setSlTimeLeft(SL_DURATION_SEC);
    setSlFlashCell(null);
    setSlFlashType(null);
    setSlStats({
      hits: 0,
      misses: 0,
      mistakes: 0,
      responseTimes: [],
      finalScore: 0,
    });
  }, []);

  const slEndGame = useCallback((current: SlStats) => {
    if (slEndedRef.current) return;
    slEndedRef.current = true;
    setSlStats({ ...current, finalScore: slCalculateScore(current) });
    setSlPhase("result");
    setSlFlashCell(null);
    setSlFlashType(null);
  }, []);

  const slNextRound = useCallback(() => {
    if (slEndedRef.current) return;
    setSlRound(slGenerateRound());
    setSlRoundId((v) => v + 1);
    slRoundStartRef.current = Date.now();
  }, []);

  const startSignalLock = useCallback(() => {
    slEndedRef.current = false;
    const firstRound = slGenerateRound();
    setSlRound(firstRound);
    setSlRoundId(1);
    setSlTimeLeft(SL_DURATION_SEC);
    setSlFlashCell(null);
    setSlFlashType(null);
    setSlStats({
      hits: 0,
      misses: 0,
      mistakes: 0,
      responseTimes: [],
      finalScore: 0,
    });
    slRoundStartRef.current = Date.now();
    setSlPhase("playing");
    setSelectedDrill("signal-lock");
    scrollToDrill();
  }, [scrollToDrill]);

  useEffect(() => {
    if (slPhase !== "playing") return;
    const tick = window.setInterval(() => {
      setSlTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          setSlStats((current) => {
            slEndGame(current);
            return current;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [slPhase, slEndGame]);

  useEffect(() => {
    if (slPhase !== "playing") return;
    const timeoutId = window.setTimeout(() => {
      if (slEndedRef.current) return;
      setSlStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      slNextRound();
    }, SL_ROUND_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [slPhase, slRoundId, slNextRound]);

  const slHandleCellClick = (cellIndex: number) => {
    if (slPhase !== "playing" || slEndedRef.current) return;

    if (cellIndex === slRound.target) {
      const responseMs = Date.now() - slRoundStartRef.current;
      setSlFlashCell(cellIndex);
      setSlFlashType("hit");
      setSlStats((prev) => ({
        ...prev,
        hits: prev.hits + 1,
        responseTimes: [...prev.responseTimes, responseMs],
      }));
      window.setTimeout(() => {
        setSlFlashCell(null);
        setSlFlashType(null);
        if (!slEndedRef.current) slNextRound();
      }, 160);
      return;
    }

    setSlFlashCell(cellIndex);
    setSlFlashType("miss");
    setSlStats((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));
    window.setTimeout(() => {
      setSlFlashCell(null);
      setSlFlashType(null);
    }, 220);
  };

  const slAvgResponseMs =
    slStats.responseTimes.length > 0
      ? Math.round(
          slStats.responseTimes.reduce((a, b) => a + b, 0) /
            slStats.responseTimes.length,
        )
      : 0;

  const slAccuracy =
    slStats.hits + slStats.mistakes > 0
      ? Math.round((slStats.hits / (slStats.hits + slStats.mistakes)) * 100)
      : 100;

  const goToSelection = () => {
    setSelectedDrill("select");
    resetRecallMatrix();
    resetSignalLock();
  };

  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-[#060912] font-sans text-zinc-100">
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

        <main className="mt-12 flex flex-1 flex-col sm:mt-16">
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
              Precision drills for working memory and focused attention. Choose
              a drill below to begin.
            </p>
          </div>

          <section className="mt-10 sm:mt-14">
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
                    <span className="font-mono text-[#d4af37]">2</span>
                    <span>drills live</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-3">
                {drillCatalog.map((drill, index) => (
                  <article
                    key={drill.id}
                    className={`flex flex-col px-6 py-6 sm:px-7 sm:py-7 ${
                      drill.available
                        ? selectedDrill === drill.id
                          ? "bg-[#0d1424] ring-1 ring-inset ring-[#d4af37]/20"
                          : "bg-[#0a0f1c]"
                        : "bg-[#0a0f1c] opacity-60"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-600">
                        0{index + 1}
                      </span>
                      <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
                        {drill.available ? drill.category : "Soon"}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {drill.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">
                      {drill.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">
                      <span className="text-xs text-zinc-600">
                        {drill.duration}
                      </span>
                      {drill.available ? (
                        <button
                          type="button"
                          onClick={() =>
                            drill.id === "recall-matrix"
                              ? startRecallMatrix()
                              : startSignalLock()
                          }
                          className="text-xs font-medium text-[#d4af37] transition hover:text-[#f0d78c]"
                        >
                          Start →
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">Soon</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            ref={drillRef}
            className="mt-10 scroll-mt-8 sm:mt-12"
            aria-label="Drill arena"
          >
            {/* ── Drill selection ── */}
            {selectedDrill === "select" && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
                <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                    Select drill
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Choose Your Workout
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Pick a cognitive drill to train memory or focused attention.
                  </p>
                </div>
                <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
                  <button
                    type="button"
                    onClick={() => selectDrill("recall-matrix")}
                    className="group rounded-xl border border-white/[0.08] bg-[#0a0f1c] p-6 text-left transition hover:border-[#d4af37]/30 hover:bg-[#0d1424]"
                  >
                    <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
                      Memory
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-[#f0d78c]">
                      Recall Matrix
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      Watch a flashing sequence, then reproduce it from memory.
                      Sequences grow with each clear round.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDrill("signal-lock")}
                    className="group rounded-xl border border-white/[0.08] bg-[#0a0f1c] p-6 text-left transition hover:border-[#d4af37]/30 hover:bg-[#0d1424]"
                  >
                    <span className="rounded-md border border-[#3b5f8a]/30 bg-[#1e3a5f]/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#7ba3cc]/90">
                      Focus
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-[#f0d78c]">
                      Signal Lock
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      Find the gold target signal among distractors. Lock on
                      fast — you have 30 seconds.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* ── Recall Matrix ── */}
            {selectedDrill === "recall-matrix" && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
                <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={goToSelection}
                        className="mb-2 text-xs font-medium text-zinc-500 transition hover:text-[#d4af37]"
                      >
                        ← Choose Drill
                      </button>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                        Drill 01 · Memory
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Recall Matrix
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500">
                        Watch the grid flash a pattern, then reproduce it in
                        order. Each clear round adds one cell.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                      {rmPhaseLabel(rmPhase)}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  {rmPhase === "intro" && (
                    <div className="mx-auto max-w-md text-center">
                      <p className="text-sm leading-relaxed text-zinc-400">
                        Sequences begin at length{" "}
                        <span className="font-mono text-[#d4af37]">3</span>.
                        One wrong cell ends the run.
                      </p>
                      <button
                        type="button"
                        onClick={startRecallMatrix}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-8 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110 sm:w-auto"
                      >
                        Start Recall Matrix
                      </button>
                    </div>
                  )}

                  {(rmPhase === "showing" ||
                    rmPhase === "input" ||
                    rmPhase === "result") && (
                    <div className="mx-auto max-w-sm">
                      <div className="mb-6 grid grid-cols-4 gap-3">
                        {[
                          { label: "Level", value: rmStats.level },
                          { label: "Sequence", value: rmStats.sequenceLength },
                          { label: "Correct", value: rmStats.correctTaps },
                          { label: "Mistakes", value: rmStats.mistakes },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-3 py-2.5 text-center"
                          >
                            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                              {item.label}
                            </p>
                            <p className="mt-0.5 font-mono text-lg font-semibold text-[#d4af37]">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div
                        className="grid grid-cols-3 gap-2.5 sm:gap-3"
                        role="grid"
                        aria-label="3 by 3 recall matrix"
                      >
                        {Array.from({ length: RM_GRID_SIZE }, (_, index) => {
                          const isFlashing = rmActiveCell === index;
                          const isConfirmed = rmConfirmedCells.includes(index);
                          const isWrongFlash =
                            rmPhase === "result" &&
                            rmActiveCell === index &&
                            rmStats.mistakes > 0;

                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={rmPhase !== "input"}
                              onClick={() => rmHandleCellClick(index)}
                              aria-label={`Cell ${index + 1}`}
                              className={[
                                "aspect-square rounded-xl border transition-all duration-200",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                                rmPhase === "input"
                                  ? "cursor-pointer hover:border-[#d4af37]/40"
                                  : "cursor-default",
                                isWrongFlash
                                  ? "border-red-400/70 bg-red-500/25 shadow-[0_0_28px_-4px_rgba(239,68,68,0.55)]"
                                  : isFlashing
                                    ? "scale-[1.03] border-[#d4af37] bg-[#d4af37]/30 shadow-[0_0_32px_-4px_rgba(212,175,55,0.65)]"
                                    : isConfirmed
                                      ? "border-[#d4af37]/35 bg-[#d4af37]/10"
                                      : "border-white/[0.08] bg-[#0a0f1c]",
                              ].join(" ")}
                            />
                          );
                        })}
                      </div>

                      {rmPhase === "showing" && (
                        <p className="mt-5 text-center text-sm text-zinc-500">
                          Memorize the pattern…
                        </p>
                      )}
                      {rmPhase === "input" && (
                        <p className="mt-5 text-center text-sm text-zinc-500">
                          Tap{" "}
                          <span className="font-mono text-[#d4af37]">
                            {rmUserInput.length + 1}
                          </span>{" "}
                          of{" "}
                          <span className="font-mono text-[#d4af37]">
                            {rmSequence.length}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {rmPhase === "result" && (
                    <div className="mx-auto mt-8 max-w-md">
                      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6 text-center">
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                          Run complete
                        </p>
                        <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                          {rmStats.finalScore.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">Final score</p>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                          {[
                            { label: "Level reached", value: rmStats.level },
                            {
                              label: "Max sequence",
                              value: rmStats.sequenceLength,
                            },
                            { label: "Accuracy", value: `${rmAccuracy}%` },
                            {
                              label: "Correct taps",
                              value: rmStats.correctTaps,
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3"
                            >
                              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                                {item.label}
                              </p>
                              <p className="mt-1 font-mono text-lg text-white">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={startRecallMatrix}
                            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold text-[#060912] transition hover:brightness-110"
                          >
                            Play Again
                          </button>
                          <button
                            type="button"
                            onClick={goToSelection}
                            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/20"
                          >
                            Choose Drill
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Signal Lock ── */}
            {selectedDrill === "signal-lock" && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
                <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={goToSelection}
                        className="mb-2 text-xs font-medium text-zinc-500 transition hover:text-[#d4af37]"
                      >
                        ← Choose Drill
                      </button>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                        Drill 02 · Focus
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Signal Lock
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500">
                        Lock onto the gold signal. Ignore blue-gray distractors.
                        Speed and accuracy both matter.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                      {slPhaseLabel(slPhase)}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  {slPhase === "intro" && (
                    <div className="mx-auto max-w-md text-center">
                      <p className="text-sm leading-relaxed text-zinc-400">
                        You have{" "}
                        <span className="font-mono text-[#d4af37]">30</span>{" "}
                        seconds. Tap the gold target on each round — avoid
                        distractors. Slow rounds count as misses.
                      </p>
                      <button
                        type="button"
                        onClick={startSignalLock}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-8 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110 sm:w-auto"
                      >
                        Start Signal Lock
                      </button>
                    </div>
                  )}

                  {(slPhase === "playing" || slPhase === "result") && (
                    <div className="mx-auto max-w-md">
                      {slPhase === "playing" && (
                        <>
                          <div className="mb-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-4 py-3">
                            <span className="text-xs uppercase tracking-wider text-zinc-500">
                              Time remaining
                            </span>
                            <span className="font-mono text-2xl font-semibold text-[#d4af37]">
                              {slTimeLeft}s
                            </span>
                          </div>

                          <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
                            {[
                              { label: "Hits", value: slStats.hits },
                              { label: "Misses", value: slStats.misses },
                              { label: "Mistakes", value: slStats.mistakes },
                              {
                                label: "Accuracy",
                                value: `${slAccuracy}%`,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-2 py-2.5 text-center sm:px-3"
                              >
                                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                                  {item.label}
                                </p>
                                <p className="mt-0.5 font-mono text-base font-semibold text-[#d4af37] sm:text-lg">
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div
                            className="grid grid-cols-4 gap-2 sm:gap-2.5"
                            role="grid"
                            aria-label="4 by 4 signal lock grid"
                          >
                            {Array.from({ length: SL_GRID_SIZE }, (_, index) => {
                              const role = slCellRole(index, slRound);
                              const isFlash = slFlashCell === index;

                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => slHandleCellClick(index)}
                                  aria-label={
                                    role === "target"
                                      ? "Target signal"
                                      : role === "distractor"
                                        ? "Distractor"
                                        : "Neutral cell"
                                  }
                                  className={[
                                    "relative aspect-square rounded-lg border transition-all duration-150",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                                    "cursor-pointer",
                                    isFlash && slFlashType === "hit"
                                      ? "scale-105 border-[#d4af37] bg-[#d4af37]/40 shadow-[0_0_28px_-2px_rgba(212,175,55,0.7)]"
                                      : isFlash && slFlashType === "miss"
                                        ? "border-red-400/60 bg-red-500/20"
                                        : role === "target"
                                          ? "border-[#d4af37]/60 bg-[#d4af37]/15 shadow-[0_0_20px_-6px_rgba(212,175,55,0.5)]"
                                          : role === "distractor"
                                            ? "border-[#3b5f8a]/40 bg-[#1a2a42]/80"
                                            : "border-white/[0.06] bg-[#0a0f1c]",
                                  ].join(" ")}
                                >
                                  {role === "target" && !isFlash && (
                                    <span className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                                  )}
                                  {role === "distractor" && (
                                    <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-[#4a6a8a]/60" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <p className="mt-5 text-center text-sm text-zinc-500">
                            Tap the{" "}
                            <span className="text-[#d4af37]">gold signal</span>{" "}
                            — ignore the blue distractors
                          </p>
                        </>
                      )}

                      {slPhase === "result" && (
                        <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6 text-center">
                          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                            Focus session complete
                          </p>
                          <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                            {slStats.finalScore.toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            Focus score
                          </p>

                          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                            {[
                              { label: "Hits", value: slStats.hits },
                              { label: "Misses", value: slStats.misses },
                              { label: "Mistakes", value: slStats.mistakes },
                              { label: "Accuracy", value: `${slAccuracy}%` },
                              {
                                label: "Avg response",
                                value:
                                  slAvgResponseMs > 0
                                    ? `${slAvgResponseMs}ms`
                                    : "—",
                              },
                              {
                                label: "Total rounds",
                                value: slStats.hits + slStats.misses,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3"
                              >
                                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                                  {item.label}
                                </p>
                                <p className="mt-1 font-mono text-lg text-white">
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          <p className="mt-5 text-xs leading-relaxed text-zinc-500">
                            Score weights hits, click accuracy, completion rate,
                            response speed, and penalizes mistakes and misses.
                          </p>

                          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={startSignalLock}
                              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold text-[#060912] transition hover:brightness-110"
                            >
                              Play Again
                            </button>
                            <button
                              type="button"
                              onClick={goToSelection}
                              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/20"
                            >
                              Choose Drill
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="mt-16 border-t border-white/[0.05] pt-8 text-center text-xs text-zinc-600 sm:mt-20">
          © {new Date().getFullYear()} Quintave · MindForge
        </footer>
      </div>
    </div>
  );
}
