"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GRID_SIZE = 9;
const INITIAL_SEQUENCE_LENGTH = 3;
const FLASH_MS = 520;
const GAP_MS = 220;
const PRE_SEQUENCE_MS = 700;

type GamePhase = "intro" | "showing" | "input" | "result";

type GameStats = {
  level: number;
  sequenceLength: number;
  correctTaps: number;
  mistakes: number;
  finalScore: number;
};

const drills = [
  {
    id: "recall-matrix",
    name: "Recall Matrix",
    category: "Memory",
    description: "Reconstruct spatial patterns from memory under time pressure.",
    duration: "4 min",
    active: true,
  },
  {
    id: "signal-lock",
    name: "Signal Lock",
    category: "Focus",
    description: "Filter noise and sustain attention on a single target stream.",
    duration: "3 min",
    active: false,
  },
  {
    id: "cognitive-switch",
    name: "Cognitive Switch",
    category: "Flexibility",
    description: "Shift rules mid-task and adapt without losing accuracy.",
    duration: "5 min",
    active: false,
  },
];

function generateSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * GRID_SIZE));
}

function calculateScore(stats: Omit<GameStats, "finalScore">): number {
  const { level, sequenceLength, correctTaps, mistakes } = stats;
  const totalTaps = correctTaps + mistakes;
  const accuracy = totalTaps > 0 ? correctTaps / totalTaps : 0;
  const levelsCompleted = Math.max(0, level - 1);

  const levelScore = levelsCompleted * 200;
  const tapScore = correctTaps * 25;
  const accuracyBonus = Math.round(
    accuracy * levelsCompleted * sequenceLength * 20,
  );
  const depthBonus = levelsCompleted * sequenceLength * 10;

  return Math.round(levelScore + tapScore + accuracyBonus + depthBonus);
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

function phaseLabel(phase: GamePhase): string {
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

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [confirmedCells, setConfirmedCells] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [stats, setStats] = useState<GameStats>({
    level: 1,
    sequenceLength: INITIAL_SEQUENCE_LENGTH,
    correctTaps: 0,
    mistakes: 0,
    finalScore: 0,
  });

  const sequenceAbortRef = useRef<AbortController | null>(null);
  const drillRef = useRef<HTMLElement>(null);

  const scrollToDrill = useCallback(() => {
    drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const resetGame = useCallback(() => {
    sequenceAbortRef.current?.abort();
    setPhase("intro");
    setSequence([]);
    setUserInput([]);
    setActiveCell(null);
    setConfirmedCells([]);
    setRound(0);
    setStats({
      level: 1,
      sequenceLength: INITIAL_SEQUENCE_LENGTH,
      correctTaps: 0,
      mistakes: 0,
      finalScore: 0,
    });
  }, []);

  const startGame = useCallback(() => {
    sequenceAbortRef.current?.abort();
    const firstSequence = generateSequence(INITIAL_SEQUENCE_LENGTH);
    setSequence(firstSequence);
    setUserInput([]);
    setActiveCell(null);
    setConfirmedCells([]);
    setRound(1);
    setStats({
      level: 1,
      sequenceLength: INITIAL_SEQUENCE_LENGTH,
      correctTaps: 0,
      mistakes: 0,
      finalScore: 0,
    });
    setPhase("showing");
    scrollToDrill();
  }, [scrollToDrill]);

  const advanceLevel = useCallback(
    (current: GameStats) => {
      const nextLength = current.sequenceLength + 1;
      const nextStats = {
        ...current,
        level: current.level + 1,
        sequenceLength: nextLength,
      };
      setStats(nextStats);
      setSequence(generateSequence(nextLength));
      setUserInput([]);
      setConfirmedCells([]);
      setRound((value) => value + 1);
      setPhase("showing");
    },
    [],
  );

  const endGame = useCallback((current: GameStats) => {
    const finalScore = calculateScore(current);
    setStats({ ...current, finalScore });
    setPhase("result");
    setActiveCell(null);
    setConfirmedCells([]);
  }, []);

  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0) return;

    const controller = new AbortController();
    sequenceAbortRef.current = controller;

    const runSequence = async () => {
      try {
        setActiveCell(null);
        await delay(PRE_SEQUENCE_MS, controller.signal);

        for (const cell of sequence) {
          setActiveCell(cell);
          await delay(FLASH_MS, controller.signal);
          setActiveCell(null);
          await delay(GAP_MS, controller.signal);
        }

        setPhase("input");
        setUserInput([]);
        setConfirmedCells([]);
      } catch {
        /* aborted between rounds */
      }
    };

    void runSequence();

    return () => {
      controller.abort();
    };
  }, [phase, round, sequence]);

  const handleCellClick = (cellIndex: number) => {
    if (phase !== "input") return;

    const step = userInput.length;
    const expected = sequence[step];

    if (cellIndex !== expected) {
      const failedStats = {
        ...stats,
        mistakes: stats.mistakes + 1,
      };
      setActiveCell(cellIndex);
      window.setTimeout(() => {
        endGame(failedStats);
      }, 320);
      return;
    }

    const nextInput = [...userInput, cellIndex];
    setUserInput(nextInput);
    setConfirmedCells(nextInput);
    setActiveCell(cellIndex);
    window.setTimeout(() => setActiveCell(null), 180);

    const updatedStats = {
      ...stats,
      correctTaps: stats.correctTaps + 1,
    };
    setStats(updatedStats);

    if (nextInput.length === sequence.length) {
      window.setTimeout(() => advanceLevel(updatedStats), 420);
    }
  };

  const accuracy =
    stats.correctTaps + stats.mistakes > 0
      ? Math.round(
          (stats.correctTaps / (stats.correctTaps + stats.mistakes)) * 100,
        )
      : 100;

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
              Precision drills for working memory, focus, and mental agility.
              Start with Recall Matrix below.
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
                    <span className="font-mono text-[#d4af37]">12</span>
                    <span>min total</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-3">
                {drills.map((drill, index) => (
                  <article
                    key={drill.id}
                    className={`flex flex-col px-6 py-6 sm:px-7 sm:py-7 ${
                      drill.active
                        ? "bg-[#0d1424] ring-1 ring-inset ring-[#d4af37]/20"
                        : "bg-[#0a0f1c] opacity-70"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-600">
                        0{index + 1}
                      </span>
                      <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
                        {drill.active ? "Live" : drill.category}
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
                      {drill.active ? (
                        <button
                          type="button"
                          onClick={startGame}
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
            aria-label="Recall Matrix drill"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
              <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                      Drill 01 · Memory
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      Recall Matrix
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      Watch the grid flash a pattern, then reproduce it in order.
                      Each clear round adds one cell to the sequence.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                    {phaseLabel(phase)}
                  </span>
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                {phase === "intro" && (
                  <div className="mx-auto max-w-md text-center">
                    <p className="text-sm leading-relaxed text-zinc-400">
                      Sequences begin at length{" "}
                      <span className="font-mono text-[#d4af37]">3</span>.
                      Stay sharp — one wrong cell ends the run.
                    </p>
                    <button
                      type="button"
                      onClick={startGame}
                      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-8 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110 sm:w-auto"
                    >
                      Start Recall Matrix
                    </button>
                  </div>
                )}

                {(phase === "showing" ||
                  phase === "input" ||
                  phase === "result") && (
                  <div className="mx-auto max-w-sm">
                    <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Level", value: stats.level },
                        { label: "Sequence", value: stats.sequenceLength },
                        { label: "Correct", value: stats.correctTaps },
                        { label: "Mistakes", value: stats.mistakes },
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
                      {Array.from({ length: GRID_SIZE }, (_, index) => {
                        const isFlashing = activeCell === index;
                        const isConfirmed = confirmedCells.includes(index);
                        const isWrongFlash =
                          phase === "result" &&
                          activeCell === index &&
                          stats.mistakes > 0;

                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={phase !== "input"}
                            onClick={() => handleCellClick(index)}
                            aria-label={`Cell ${index + 1}`}
                            className={[
                              "aspect-square rounded-xl border transition-all duration-200",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                              phase === "input"
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

                    {phase === "showing" && (
                      <p className="mt-5 text-center text-sm text-zinc-500">
                        Memorize the pattern…
                      </p>
                    )}
                    {phase === "input" && (
                      <p className="mt-5 text-center text-sm text-zinc-500">
                        Tap{" "}
                        <span className="font-mono text-[#d4af37]">
                          {userInput.length + 1}
                        </span>{" "}
                        of{" "}
                        <span className="font-mono text-[#d4af37]">
                          {sequence.length}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {phase === "result" && (
                  <div className="mx-auto mt-8 max-w-md">
                    <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
                        Run complete
                      </p>
                      <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                        {stats.finalScore.toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">Final score</p>

                      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                        <div className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Level reached
                          </p>
                          <p className="mt-1 font-mono text-lg text-white">
                            {stats.level}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Max sequence
                          </p>
                          <p className="mt-1 font-mono text-lg text-white">
                            {stats.sequenceLength}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Accuracy
                          </p>
                          <p className="mt-1 font-mono text-lg text-white">
                            {accuracy}%
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Correct taps
                          </p>
                          <p className="mt-1 font-mono text-lg text-white">
                            {stats.correctTaps}
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 text-xs leading-relaxed text-zinc-500">
                        Score weights level progression, correct taps,
                        accuracy, and sequence depth.
                      </p>

                      <button
                        type="button"
                        onClick={resetGame}
                        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/20"
                      >
                        Play Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mt-10 flex flex-col items-start gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Consistency compounds. Clear one more level today.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110"
            >
              Start Recall Matrix
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
