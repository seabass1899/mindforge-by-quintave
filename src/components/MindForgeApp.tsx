"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppBackground } from "@/components/AppBackground";
import { CognitiveItemDisplay } from "@/components/CognitiveItem";
import { DrillShell } from "@/components/DrillShell";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { IntroCard } from "@/components/IntroCard";
import { MetricGrid } from "@/components/MetricGrid";
import { ResultCard } from "@/components/ResultCard";
import { SelectionPanel } from "@/components/SelectionPanel";
import { TimerBar } from "@/components/TimerBar";
import { WorkoutCards } from "@/components/WorkoutCards";
import { type DrillId } from "@/lib/drills";
import { delay } from "@/lib/game-utils";
import {
  RM_FLASH_MS,
  RM_GAP_MS,
  RM_GRID_SIZE,
  RM_INITIAL_LENGTH,
  RM_PRE_MS,
  rmCalculateScore,
  rmGenerateSequence,
  rmInitialStats,
  rmPhaseLabel,
  type RmPhase,
  type RmStats,
} from "@/lib/recall-matrix";
import {
  SL_DURATION_SEC,
  SL_GRID_SIZE,
  SL_ROUND_TIMEOUT_MS,
  slCalculateScore,
  slCellRole,
  slGenerateRound,
  slInitialStats,
  slPhaseLabel,
  type SlPhase,
  type SlRound,
  type SlStats,
} from "@/lib/signal-lock";
import {
  CS_DURATION_SEC,
  csCalculateScore,
  csGenerateRound,
  csInitialStats,
  csPhaseLabel,
  csRuleForRound,
  csRuleLabel,
  type CsPhase,
  type CsRound,
  type CsStats,
} from "@/lib/cognitive-switch";

export function MindForgeApp() {
  const [selectedDrill, setSelectedDrill] = useState<DrillId>("select");
  const drillRef = useRef<HTMLElement>(null);

  const scrollToDrill = useCallback(() => {
    window.setTimeout(() => {
      drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }, []);

  // Recall Matrix state
  const [rmPhase, setRmPhase] = useState<RmPhase>("intro");
  const [rmSequence, setRmSequence] = useState<number[]>([]);
  const [rmUserInput, setRmUserInput] = useState<number[]>([]);
  const [rmActiveCell, setRmActiveCell] = useState<number | null>(null);
  const [rmConfirmedCells, setRmConfirmedCells] = useState<number[]>([]);
  const [rmRound, setRmRound] = useState(0);
  const [rmStats, setRmStats] = useState<RmStats>(() => rmInitialStats());
  const rmAbortRef = useRef<AbortController | null>(null);

  const resetRecallMatrix = useCallback(() => {
    rmAbortRef.current?.abort();
    setRmPhase("intro");
    setRmSequence([]);
    setRmUserInput([]);
    setRmActiveCell(null);
    setRmConfirmedCells([]);
    setRmRound(0);
    setRmStats(rmInitialStats());
  }, []);

  const startRecallMatrix = useCallback(() => {
    rmAbortRef.current?.abort();
    setRmSequence(rmGenerateSequence(RM_INITIAL_LENGTH));
    setRmUserInput([]);
    setRmActiveCell(null);
    setRmConfirmedCells([]);
    setRmRound(1);
    setRmStats(rmInitialStats());
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
    setRmRound((value) => value + 1);
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
        // Sequence was reset or drill changed.
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
    const updated = { ...rmStats, correctTaps: rmStats.correctTaps + 1 };

    setRmUserInput(nextInput);
    setRmConfirmedCells(nextInput);
    setRmActiveCell(cellIndex);
    setRmStats(updated);
    window.setTimeout(() => setRmActiveCell(null), 180);

    if (nextInput.length === rmSequence.length) {
      window.setTimeout(() => rmAdvanceLevel(updated), 420);
    }
  };

  const rmAccuracy =
    rmStats.correctTaps + rmStats.mistakes > 0
      ? Math.round((rmStats.correctTaps / (rmStats.correctTaps + rmStats.mistakes)) * 100)
      : 100;

  // Signal Lock state
  const [slPhase, setSlPhase] = useState<SlPhase>("intro");
  const [slRound, setSlRound] = useState<SlRound>(() => slGenerateRound());
  const [slRoundId, setSlRoundId] = useState(0);
  const [slTimeLeft, setSlTimeLeft] = useState(SL_DURATION_SEC);
  const [slFlashCell, setSlFlashCell] = useState<number | null>(null);
  const [slFlashType, setSlFlashType] = useState<"hit" | "miss" | null>(null);
  const [slStats, setSlStats] = useState<SlStats>(() => slInitialStats());
  const slRoundStartRef = useRef(0);
  const slEndedRef = useRef(false);

  const resetSignalLock = useCallback(() => {
    slEndedRef.current = false;
    setSlPhase("intro");
    setSlRound(slGenerateRound());
    setSlRoundId(0);
    setSlTimeLeft(SL_DURATION_SEC);
    setSlFlashCell(null);
    setSlFlashType(null);
    setSlStats(slInitialStats());
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
    setSlRoundId((value) => value + 1);
    slRoundStartRef.current = Date.now();
  }, []);

  const startSignalLock = useCallback(() => {
    slEndedRef.current = false;
    setSlRound(slGenerateRound());
    setSlRoundId(1);
    setSlTimeLeft(SL_DURATION_SEC);
    setSlFlashCell(null);
    setSlFlashType(null);
    setSlStats(slInitialStats());
    slRoundStartRef.current = Date.now();
    setSlPhase("playing");
    setSelectedDrill("signal-lock");
    scrollToDrill();
  }, [scrollToDrill]);

  useEffect(() => {
    if (slPhase !== "playing") return;

    const tick = window.setInterval(() => {
      setSlTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(tick);
          setSlStats((current) => {
            slEndGame(current);
            return current;
          });
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [slPhase, slEndGame]);

  useEffect(() => {
    if (slPhase !== "playing") return;

    const timeoutId = window.setTimeout(() => {
      if (slEndedRef.current) return;
      setSlStats((previous) => ({ ...previous, misses: previous.misses + 1 }));
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
      setSlStats((previous) => ({
        ...previous,
        hits: previous.hits + 1,
        responseTimes: [...previous.responseTimes, responseMs],
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
    setSlStats((previous) => ({ ...previous, mistakes: previous.mistakes + 1 }));
    window.setTimeout(() => {
      setSlFlashCell(null);
      setSlFlashType(null);
    }, 220);
  };

  const slAvgResponseMs =
    slStats.responseTimes.length > 0
      ? Math.round(slStats.responseTimes.reduce((a, b) => a + b, 0) / slStats.responseTimes.length)
      : 0;

  const slAccuracy =
    slStats.hits + slStats.mistakes > 0
      ? Math.round((slStats.hits / (slStats.hits + slStats.mistakes)) * 100)
      : 100;

  // Cognitive Switch state
  const [csPhase, setCsPhase] = useState<CsPhase>("intro");
  const [csRoundNumber, setCsRoundNumber] = useState(1);
  const [csRound, setCsRound] = useState<CsRound>(() => csGenerateRound(csRuleForRound(1), false));
  const [csTimeLeft, setCsTimeLeft] = useState(CS_DURATION_SEC);
  const [csFeedbackIndex, setCsFeedbackIndex] = useState<number | null>(null);
  const [csFeedbackType, setCsFeedbackType] = useState<"correct" | "wrong" | null>(null);
  const [csLocked, setCsLocked] = useState(false);
  const [csStats, setCsStats] = useState<CsStats>(() => csInitialStats());
  const csRoundStartRef = useRef(0);
  const csEndedRef = useRef(false);

  const resetCognitiveSwitch = useCallback(() => {
    const firstRound = csGenerateRound(csRuleForRound(1), false);
    csEndedRef.current = false;
    setCsPhase("intro");
    setCsRoundNumber(1);
    setCsRound(firstRound);
    setCsTimeLeft(CS_DURATION_SEC);
    setCsFeedbackIndex(null);
    setCsFeedbackType(null);
    setCsLocked(false);
    setCsStats(csInitialStats());
  }, []);

  const csEndGame = useCallback((current: CsStats) => {
    if (csEndedRef.current) return;
    csEndedRef.current = true;
    setCsStats({ ...current, finalScore: csCalculateScore(current) });
    setCsPhase("result");
    setCsFeedbackIndex(null);
    setCsFeedbackType(null);
    setCsLocked(false);
  }, []);

  const startCognitiveSwitch = useCallback(() => {
    const firstRound = csGenerateRound(csRuleForRound(1), false);
    csEndedRef.current = false;
    setCsRoundNumber(1);
    setCsRound(firstRound);
    setCsTimeLeft(CS_DURATION_SEC);
    setCsFeedbackIndex(null);
    setCsFeedbackType(null);
    setCsLocked(false);
    setCsStats(csInitialStats());
    csRoundStartRef.current = Date.now();
    setCsPhase("playing");
    setSelectedDrill("cognitive-switch");
    scrollToDrill();
  }, [scrollToDrill]);

  useEffect(() => {
    if (csPhase !== "playing") return;

    const tick = window.setInterval(() => {
      setCsTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(tick);
          setCsStats((current) => {
            csEndGame(current);
            return current;
          });
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [csPhase, csEndGame]);

  const csHandleChoice = (choiceIndex: number) => {
    if (csPhase !== "playing" || csEndedRef.current || csLocked) return;

    const isCorrect = choiceIndex === csRound.correctIndex;
    const responseMs = Date.now() - csRoundStartRef.current;
    const nextRoundNumber = csRoundNumber + 1;
    const nextRule = csRuleForRound(nextRoundNumber);
    const isRuleSwitch = nextRule !== csRound.rule;
    const nextRound = csGenerateRound(nextRule, isRuleSwitch);

    setCsLocked(true);
    setCsFeedbackIndex(choiceIndex);
    setCsFeedbackType(isCorrect ? "correct" : "wrong");
    setCsStats((previous) => ({
      ...previous,
      correct: previous.correct + (isCorrect ? 1 : 0),
      mistakes: previous.mistakes + (isCorrect ? 0 : 1),
      rounds: previous.rounds + 1,
      ruleSwitches: previous.ruleSwitches + (isRuleSwitch ? 1 : 0),
      switchAttempts: previous.switchAttempts + (csRound.isSwitchRound ? 1 : 0),
      switchCorrect: previous.switchCorrect + (csRound.isSwitchRound && isCorrect ? 1 : 0),
      responseTimes: [...previous.responseTimes, responseMs],
    }));

    window.setTimeout(() => {
      if (csEndedRef.current) return;
      setCsRoundNumber(nextRoundNumber);
      setCsRound(nextRound);
      setCsFeedbackIndex(null);
      setCsFeedbackType(null);
      setCsLocked(false);
      csRoundStartRef.current = Date.now();
    }, 320);
  };

  const csAccuracy =
    csStats.correct + csStats.mistakes > 0
      ? Math.round((csStats.correct / (csStats.correct + csStats.mistakes)) * 100)
      : 100;

  const csSwitchAccuracy =
    csStats.switchAttempts > 0 ? Math.round((csStats.switchCorrect / csStats.switchAttempts) * 100) : 100;

  const csAvgResponseMs =
    csStats.responseTimes.length > 0
      ? Math.round(csStats.responseTimes.reduce((a, b) => a + b, 0) / csStats.responseTimes.length)
      : 0;

  const startDrill = (id: DrillId) => {
    if (id === "recall-matrix") startRecallMatrix();
    if (id === "signal-lock") startSignalLock();
    if (id === "cognitive-switch") startCognitiveSwitch();
  };

  const selectDrill = (id: DrillId) => {
    setSelectedDrill(id);
    scrollToDrill();
  };

  const goToSelection = () => {
    setSelectedDrill("select");
    resetRecallMatrix();
    resetSignalLock();
    resetCognitiveSwitch();
  };

  return (
    <AppBackground>
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
        <Header />
        <main className="mt-12 flex flex-1 flex-col sm:mt-16">
          <Hero />
          <WorkoutCards selectedDrill={selectedDrill} onStart={startDrill} />

          <section ref={drillRef} className="mt-10 scroll-mt-8 sm:mt-12" aria-label="Drill arena">
            {selectedDrill === "select" && <SelectionPanel onSelect={selectDrill} />}
            {selectedDrill === "recall-matrix" && renderRecallMatrix()}
            {selectedDrill === "signal-lock" && renderSignalLock()}
            {selectedDrill === "cognitive-switch" && renderCognitiveSwitch()}
          </section>
        </main>

        <footer className="mt-16 border-t border-white/[0.05] pt-8 text-center text-xs text-zinc-600 sm:mt-20">
          © {new Date().getFullYear()} Quintave · MindForge
        </footer>
      </div>
    </AppBackground>
  );

  function renderRecallMatrix() {
    return (
      <DrillShell
        drillNumber="01"
        category="Memory"
        title="Recall Matrix"
        description="Watch the grid flash a pattern, then reproduce it in order. Each clear round adds one cell."
        status={rmPhaseLabel(rmPhase)}
        onBack={goToSelection}
      >
        {rmPhase === "intro" && (
          <IntroCard
            text="Sequences begin at length 3. One wrong cell ends the run."
            buttonText="Start Recall Matrix"
            onStart={startRecallMatrix}
          />
        )}

        {(rmPhase === "showing" || rmPhase === "input" || rmPhase === "result") && (
          <div className="mx-auto max-w-sm">
            <MetricGrid
              metrics={[
                { label: "Level", value: rmStats.level },
                { label: "Sequence", value: rmStats.sequenceLength },
                { label: "Correct", value: rmStats.correctTaps },
                { label: "Mistakes", value: rmStats.mistakes },
              ]}
            />

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="grid" aria-label="3 by 3 recall matrix">
              {Array.from({ length: RM_GRID_SIZE }, (_, index) => {
                const isFlashing = rmActiveCell === index;
                const isConfirmed = rmConfirmedCells.includes(index);
                const isWrongFlash = rmPhase === "result" && rmActiveCell === index && rmStats.mistakes > 0;

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
                      rmPhase === "input" ? "cursor-pointer hover:border-[#d4af37]/40" : "cursor-default",
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

            {rmPhase === "showing" && <p className="mt-5 text-center text-sm text-zinc-500">Memorize the pattern...</p>}
            {rmPhase === "input" && (
              <p className="mt-5 text-center text-sm text-zinc-500">
                Tap <span className="font-mono text-[#d4af37]">{rmUserInput.length + 1}</span> of{" "}
                <span className="font-mono text-[#d4af37]">{rmSequence.length}</span>
              </p>
            )}
          </div>
        )}

        {rmPhase === "result" && (
          <ResultCard
            label="Run complete"
            score={rmStats.finalScore}
            scoreLabel="Final score"
            metrics={[
              { label: "Level reached", value: rmStats.level },
              { label: "Max sequence", value: rmStats.sequenceLength },
              { label: "Accuracy", value: `${rmAccuracy}%` },
              { label: "Correct taps", value: rmStats.correctTaps },
            ]}
            note="Score weights level progression, correct taps, accuracy, and sequence depth."
            onPlayAgain={startRecallMatrix}
            onChooseDrill={goToSelection}
          />
        )}
      </DrillShell>
    );
  }

  function renderSignalLock() {
    return (
      <DrillShell
        drillNumber="02"
        category="Focus"
        title="Signal Lock"
        description="Lock onto the gold signal. Ignore blue-gray distractors. Speed and accuracy both matter."
        status={slPhaseLabel(slPhase)}
        onBack={goToSelection}
      >
        {slPhase === "intro" && (
          <IntroCard
            text="You have 30 seconds. Tap the gold target on each round and avoid distractors. Slow rounds count as misses."
            buttonText="Start Signal Lock"
            onStart={startSignalLock}
          />
        )}

        {(slPhase === "playing" || slPhase === "result") && (
          <div className="mx-auto max-w-md">
            {slPhase === "playing" && (
              <>
                <TimerBar label="Time remaining" value={`${slTimeLeft}s`} />
                <MetricGrid
                  metrics={[
                    { label: "Hits", value: slStats.hits },
                    { label: "Misses", value: slStats.misses },
                    { label: "Mistakes", value: slStats.mistakes },
                    { label: "Accuracy", value: `${slAccuracy}%` },
                  ]}
                />

                <div className="grid grid-cols-4 gap-2 sm:gap-2.5" role="grid" aria-label="4 by 4 signal lock grid">
                  {Array.from({ length: SL_GRID_SIZE }, (_, index) => {
                    const role = slCellRole(index, slRound);
                    const isFlash = slFlashCell === index;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => slHandleCellClick(index)}
                        aria-label={role === "target" ? "Target signal" : role === "distractor" ? "Distractor" : "Neutral cell"}
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
                        {role === "distractor" && <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-[#4a6a8a]/60" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {slPhase === "result" && (
              <ResultCard
                label="Focus session complete"
                score={slStats.finalScore}
                scoreLabel="Focus score"
                metrics={[
                  { label: "Hits", value: slStats.hits },
                  { label: "Misses", value: slStats.misses },
                  { label: "Mistakes", value: slStats.mistakes },
                  { label: "Accuracy", value: `${slAccuracy}%` },
                  { label: "Avg response", value: slAvgResponseMs > 0 ? `${slAvgResponseMs}ms` : "—" },
                  { label: "Total rounds", value: slStats.hits + slStats.misses },
                ]}
                note="Score weights hits, click accuracy, completion rate, response speed, and penalizes mistakes and misses."
                onPlayAgain={startSignalLock}
                onChooseDrill={goToSelection}
              />
            )}
          </div>
        )}
      </DrillShell>
    );
  }

  function renderCognitiveSwitch() {
    return (
      <DrillShell
        drillNumber="03"
        category="Flexibility"
        title="Cognitive Switch"
        description="Match by the active rule only. The rule changes every three rounds, so suppress the old rule and adapt fast."
        status={csPhaseLabel(csPhase)}
        onBack={goToSelection}
      >
        {csPhase === "intro" && (
          <IntroCard
            text="You have 45 seconds. Match the reference item by color, shape, or number based only on the active rule."
            buttonText="Start Cognitive Switch"
            onStart={startCognitiveSwitch}
          />
        )}

        {(csPhase === "playing" || csPhase === "result") && (
          <div className="mx-auto max-w-2xl">
            {csPhase === "playing" && (
              <>
                <TimerBar label="Time remaining" value={`${csTimeLeft}s`} />
                <div className="mb-5 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-5 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/80">Active rule</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#f0d78c]">{csRuleLabel(csRound.rule)}</p>
                  {csRound.isSwitchRound && <p className="mt-2 text-xs text-[#d4af37]">Rule switched — adapt.</p>}
                </div>

                <MetricGrid
                  metrics={[
                    { label: "Correct", value: csStats.correct },
                    { label: "Mistakes", value: csStats.mistakes },
                    { label: "Rounds", value: csStats.rounds },
                    { label: "Switches", value: csStats.ruleSwitches },
                  ]}
                />

                <div className="mx-auto max-w-xs">
                  <p className="mb-2 text-center text-xs uppercase tracking-[0.18em] text-zinc-500">Reference</p>
                  <CognitiveItemDisplay item={csRound.reference} />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {csRound.choices.map((choice, index) => {
                    const isSelected = csFeedbackIndex === index;
                    const isCorrect = index === csRound.correctIndex;

                    return (
                      <button
                        key={`${choice.color}-${choice.shape}-${choice.number}-${index}`}
                        type="button"
                        onClick={() => csHandleChoice(index)}
                        disabled={csLocked}
                        className={[
                          "rounded-xl border bg-[#0a0f1c] p-2 text-left transition",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                          csLocked ? "cursor-default" : "cursor-pointer hover:border-[#d4af37]/35 hover:bg-[#0d1424]",
                          isSelected && csFeedbackType === "correct"
                            ? "border-emerald-400/70 bg-emerald-500/10"
                            : isSelected && csFeedbackType === "wrong"
                              ? "border-red-400/70 bg-red-500/10"
                              : csLocked && isCorrect
                                ? "border-[#d4af37]/60 bg-[#d4af37]/10"
                                : "border-white/[0.08]",
                        ].join(" ")}
                      >
                        <CognitiveItemDisplay item={choice} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {csPhase === "result" && (
              <ResultCard
                label="Flexibility session complete"
                score={csStats.finalScore}
                scoreLabel="Flexibility score"
                metrics={[
                  { label: "Correct", value: csStats.correct },
                  { label: "Mistakes", value: csStats.mistakes },
                  { label: "Accuracy", value: `${csAccuracy}%` },
                  { label: "Rule switches", value: csStats.ruleSwitches },
                  { label: "Switch accuracy", value: `${csSwitchAccuracy}%` },
                  { label: "Avg response", value: csAvgResponseMs > 0 ? `${csAvgResponseMs}ms` : "—" },
                ]}
                note="Score rewards accuracy, speed, correct answers, and performance immediately after rule changes."
                onPlayAgain={startCognitiveSwitch}
                onChooseDrill={goToSelection}
              />
            )}
          </div>
        )}
      </DrillShell>
    );
  }
}
