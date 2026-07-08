"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type DrillId = "select" | "recall-matrix" | "signal-lock" | "cognitive-switch";

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
    duration: "45 sec",
    available: true,
  },
];

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

function clampScore(score: number): number {
  return Math.max(0, Math.round(score));
}

// Recall Matrix --------------------------------------------------------------

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

  return clampScore(
    levelsCompleted * 200 +
      correctTaps * 25 +
      accuracy * levelsCompleted * sequenceLength * 20 +
      levelsCompleted * sequenceLength * 10,
  );
}

function rmPhaseLabel(phase: RmPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "showing":
      return "Watch the sequence";
    case "input":
      return "Your turn";
    case "result":
      return "Session complete";
  }
}

// Signal Lock ----------------------------------------------------------------

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

  return clampScore(
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

// Cognitive Switch -----------------------------------------------------------

const CS_DURATION_SEC = 45;
const CS_RULES = ["color", "shape", "number"] as const;
const CS_COLORS = ["gold", "blue", "violet", "green"] as const;
const CS_SHAPES = ["circle", "square", "triangle", "diamond"] as const;
const CS_NUMBERS = [1, 2, 3, 4] as const;

type CsPhase = "intro" | "playing" | "result";
type CsRule = (typeof CS_RULES)[number];
type CsColor = (typeof CS_COLORS)[number];
type CsShape = (typeof CS_SHAPES)[number];
type CsNumber = (typeof CS_NUMBERS)[number];

type CsItem = {
  color: CsColor;
  shape: CsShape;
  number: CsNumber;
};

type CsRound = {
  rule: CsRule;
  reference: CsItem;
  choices: CsItem[];
  correctIndex: number;
  isSwitchRound: boolean;
};

type CsStats = {
  correct: number;
  mistakes: number;
  rounds: number;
  ruleSwitches: number;
  switchAttempts: number;
  switchCorrect: number;
  responseTimes: number[];
  finalScore: number;
};

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickDifferent<T>(items: readonly T[], current: T): T {
  return pickOne(items.filter((item) => item !== current));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function csRuleForRound(roundNumber: number): CsRule {
  return CS_RULES[Math.floor((roundNumber - 1) / 3) % CS_RULES.length];
}

function csRandomItem(): CsItem {
  return {
    color: pickOne(CS_COLORS),
    shape: pickOne(CS_SHAPES),
    number: pickOne(CS_NUMBERS),
  };
}

function csChoiceForRule(reference: CsItem, rule: CsRule, shouldMatch: boolean): CsItem {
  const item = csRandomItem();

  if (rule === "color") {
    item.color = shouldMatch
      ? reference.color
      : pickDifferent(CS_COLORS, reference.color);
  }

  if (rule === "shape") {
    item.shape = shouldMatch
      ? reference.shape
      : pickDifferent(CS_SHAPES, reference.shape);
  }

  if (rule === "number") {
    item.number = shouldMatch
      ? reference.number
      : pickDifferent(CS_NUMBERS, reference.number);
  }

  return item;
}

function csGenerateRound(rule: CsRule, isSwitchRound: boolean): CsRound {
  const reference = csRandomItem();
  const correct = csChoiceForRule(reference, rule, true);
  const distractorOne = csChoiceForRule(reference, rule, false);
  const distractorTwo = csChoiceForRule(reference, rule, false);
  const choices = shuffle([correct, distractorOne, distractorTwo]);
  const correctIndex = choices.indexOf(correct);

  return {
    rule,
    reference,
    choices,
    correctIndex,
    isSwitchRound,
  };
}

function csCalculateScore(stats: Omit<CsStats, "finalScore">): number {
  const { correct, mistakes, ruleSwitches, switchAttempts, switchCorrect, responseTimes } = stats;
  const totalAnswers = correct + mistakes;
  const accuracy = totalAnswers > 0 ? correct / totalAnswers : 0;
  const switchAccuracy = switchAttempts > 0 ? switchCorrect / switchAttempts : 1;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus =
    avgMs > 0 ? Math.max(0, (1800 - avgMs) / 1800) * 180 : 0;

  return clampScore(
    correct * 40 +
      accuracy * 220 +
      switchAccuracy * 200 +
      speedBonus +
      ruleSwitches * 20 -
      mistakes * 25,
  );
}

function csPhaseLabel(phase: CsPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Switch under pressure";
    case "result":
      return "Session complete";
  }
}

function csRuleLabel(rule: CsRule): string {
  return rule.toUpperCase();
}

// Page -----------------------------------------------------------------------

export default function Home() {
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
  const [slStats, setSlStats] = useState<SlStats>({
    hits: 0,
    misses: 0,
    mistakes: 0,
    responseTimes: [],
    finalScore: 0,
  });
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
  const [csStats, setCsStats] = useState<CsStats>({
    correct: 0,
    mistakes: 0,
    rounds: 0,
    ruleSwitches: 0,
    switchAttempts: 0,
    switchCorrect: 0,
    responseTimes: [],
    finalScore: 0,
  });
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
    setCsStats({
      correct: 0,
      mistakes: 0,
      rounds: 0,
      ruleSwitches: 0,
      switchAttempts: 0,
      switchCorrect: 0,
      responseTimes: [],
      finalScore: 0,
    });
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
    setCsStats({
      correct: 0,
      mistakes: 0,
      rounds: 0,
      ruleSwitches: 0,
      switchAttempts: 0,
      switchCorrect: 0,
      responseTimes: [],
      finalScore: 0,
    });
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
    csStats.switchAttempts > 0
      ? Math.round((csStats.switchCorrect / csStats.switchAttempts) * 100)
      : 100;

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
    <div className="relative min-h-screen overflow-hidden bg-[#060912] font-sans text-zinc-100">
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

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10">
              <span className="font-mono text-sm font-semibold text-[#d4af37]">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">MindForge</p>
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
              Precision drills for working memory, focused attention, and cognitive flexibility. Choose a drill below to begin.
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
                    <span className="font-mono text-[#d4af37]">3</span>
                    <span>drills live</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-3">
                {drillCatalog.map((drill, index) => (
                  <article
                    key={drill.id}
                    className={`flex flex-col px-6 py-6 sm:px-7 sm:py-7 ${
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
                        onClick={() => startDrill(drill.id)}
                        className="text-xs font-medium text-[#d4af37] transition hover:text-[#f0d78c]"
                      >
                        Start -&gt;
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section ref={drillRef} className="mt-10 scroll-mt-8 sm:mt-12" aria-label="Drill arena">
            {selectedDrill === "select" && (
              <SelectionPanel onSelect={selectDrill} />
            )}

            {selectedDrill === "recall-matrix" && (
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
            )}

            {selectedDrill === "signal-lock" && (
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
                                {role === "distractor" && (
                                  <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-[#4a6a8a]/60" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-5 text-center text-sm text-zinc-500">
                          Tap the <span className="text-[#d4af37]">gold signal</span> and ignore the blue distractors.
                        </p>
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
                          { label: "Click accuracy", value: `${slAccuracy}%` },
                          { label: "Avg response", value: slAvgResponseMs > 0 ? `${slAvgResponseMs}ms` : "-" },
                          { label: "Total rounds", value: slStats.hits + slStats.misses },
                        ]}
                        note="Score weights hits, click accuracy, completion rate, response speed, and penalties for mistakes and timeouts."
                        onPlayAgain={startSignalLock}
                        onChooseDrill={goToSelection}
                      />
                    )}
                  </div>
                )}
              </DrillShell>
            )}

            {selectedDrill === "cognitive-switch" && (
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
                    text="You have 45 seconds. Match the reference item by COLOR, SHAPE, or NUMBER. The active rule changes every three rounds."
                    buttonText="Start Cognitive Switch"
                    onStart={startCognitiveSwitch}
                  />
                )}

                {csPhase === "playing" && (
                  <div className="mx-auto max-w-2xl">
                    <TimerBar label="Time remaining" value={`${csTimeLeft}s`} />
                    <MetricGrid
                      metrics={[
                        { label: "Correct", value: csStats.correct },
                        { label: "Mistakes", value: csStats.mistakes },
                        { label: "Accuracy", value: `${csAccuracy}%` },
                        { label: "Switches", value: csStats.ruleSwitches },
                      ]}
                    />

                    <div className="mb-5 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-center">
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/70">Active rule</p>
                      <p className="mt-1 text-2xl font-semibold tracking-wide text-[#f0d78c]">
                        Match by {csRuleLabel(csRound.rule)}
                      </p>
                      {csRound.isSwitchRound && (
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-400">Rule switched. Recalibrate.</p>
                      )}
                    </div>

                    <div className="mb-5 rounded-xl border border-white/[0.08] bg-[#0a0f1c]/80 p-5 text-center">
                      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">Reference item</p>
                      <CognitiveItemCard item={csRound.reference} size="large" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {csRound.choices.map((choice, index) => {
                        const isFeedback = csFeedbackIndex === index;
                        return (
                          <button
                            key={`${choice.color}-${choice.shape}-${choice.number}-${index}`}
                            type="button"
                            disabled={csLocked}
                            onClick={() => csHandleChoice(index)}
                            className={[
                              "rounded-xl border p-4 text-left transition-all duration-150",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]",
                              csLocked ? "cursor-default" : "cursor-pointer hover:border-[#d4af37]/35 hover:bg-[#0d1424]",
                              isFeedback && csFeedbackType === "correct"
                                ? "border-[#d4af37] bg-[#d4af37]/15 shadow-[0_0_24px_-6px_rgba(212,175,55,0.55)]"
                                : isFeedback && csFeedbackType === "wrong"
                                  ? "border-red-400/60 bg-red-500/15"
                                  : "border-white/[0.08] bg-[#0a0f1c]",
                            ].join(" ")}
                          >
                            <p className="mb-3 font-mono text-xs text-zinc-600">Choice 0{index + 1}</p>
                            <CognitiveItemCard item={choice} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                      { label: "Avg response", value: csAvgResponseMs > 0 ? `${csAvgResponseMs}ms` : "-" },
                    ]}
                    note="Score rewards accuracy, speed, correct answers, and performance immediately after rule changes."
                    onPlayAgain={startCognitiveSwitch}
                    onChooseDrill={goToSelection}
                  />
                )}
              </DrillShell>
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

function SelectionPanel({ onSelect }: { onSelect: (id: DrillId) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f1629]/95 to-[#080c16]/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]">
      <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">Select drill</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Choose Your Workout</h2>
        <p className="mt-2 text-sm text-zinc-500">Pick a cognitive drill to train memory, focus, or flexibility.</p>
      </div>
      <div className="grid gap-4 px-6 py-6 sm:grid-cols-3 sm:px-8 sm:py-8">
        {drillCatalog.map((drill) => (
          <button
            key={drill.id}
            type="button"
            onClick={() => onSelect(drill.id)}
            className="group rounded-xl border border-white/[0.08] bg-[#0a0f1c] p-6 text-left transition hover:border-[#d4af37]/30 hover:bg-[#0d1424]"
          >
            <span className="rounded-md border border-[#d4af37]/15 bg-[#d4af37]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#d4af37]/90">
              {drill.category}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-white group-hover:text-[#f0d78c]">{drill.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{drill.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function DrillShell({
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
      <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button type="button" onClick={onBack} className="mb-2 text-xs font-medium text-zinc-500 transition hover:text-[#d4af37]">
              &lt;- Choose Drill
            </button>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">
              Drill {drillNumber} · {category}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {status}
          </span>
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}

function IntroCard({ text, buttonText, onStart }: { text: string; buttonText: string; onStart: () => void }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-8 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110 sm:w-auto"
      >
        {buttonText}
      </button>
    </div>
  );
}

function TimerBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-mono text-2xl font-semibold text-[#d4af37]">{value}</span>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: { label: string; value: string | number }[] }) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-2 py-2.5 text-center sm:px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{item.label}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-[#d4af37] sm:text-lg">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  label,
  score,
  scoreLabel,
  metrics,
  note,
  onPlayAgain,
  onChooseDrill,
}: {
  label: string;
  score: number;
  scoreLabel: string;
  metrics: { label: string; value: string | number }[];
  note: string;
  onPlayAgain: () => void;
  onChooseDrill: () => void;
}) {
  return (
    <div className="mx-auto mt-2 max-w-md">
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]/80">{label}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{score.toLocaleString()}</p>
        <p className="mt-1 text-sm text-zinc-400">{scoreLabel}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/60 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{item.label}</p>
              <p className="mt-1 font-mono text-lg text-white">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-zinc-500">{note}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-6 text-sm font-semibold text-[#060912] transition hover:brightness-110"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onChooseDrill}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/20"
          >
            Choose Drill
          </button>
        </div>
      </div>
    </div>
  );
}

function CognitiveItemCard({ item, size = "normal" }: { item: CsItem; size?: "normal" | "large" }) {
  const colorStyles: Record<CsColor, string> = {
    gold: "border-[#d4af37]/50 bg-[#d4af37]/15 text-[#f0d78c]",
    blue: "border-[#4a76a8]/50 bg-[#1e3a5f]/30 text-[#9ec4ed]",
    violet: "border-[#8b5cf6]/50 bg-[#4c1d95]/25 text-[#c4b5fd]",
    green: "border-[#22c55e]/45 bg-[#064e3b]/25 text-[#86efac]",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${colorStyles[item.color]} ${size === "large" ? "mx-auto max-w-xs" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] opacity-70">{item.color}</p>
          <p className={`${size === "large" ? "text-2xl" : "text-lg"} font-semibold capitalize text-white`}>{item.shape}</p>
        </div>
        <div className={`${size === "large" ? "h-14 w-14 text-2xl" : "h-11 w-11 text-xl"} flex items-center justify-center rounded-full border border-current/30 bg-black/20 font-mono font-semibold text-white`}>
          {item.number}
        </div>
      </div>
    </div>
  );
}
