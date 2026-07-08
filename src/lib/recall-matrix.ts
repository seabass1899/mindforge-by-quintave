import { clampScore } from "./game-utils";

export const RM_GRID_SIZE = 9;
export const RM_INITIAL_LENGTH = 3;
export const RM_FLASH_MS = 500;
export const RM_GAP_MS = 190;
export const RM_PRE_MS = 650;
export const RM_NOISE_MS = 340;

export type RmPhase = "intro" | "showing" | "input" | "result";
export type RmMode = "forward" | "reverse" | "interference";

export type RmStats = {
  level: number;
  sequenceLength: number;
  correctTaps: number;
  mistakes: number;
  cleanRounds: number;
  reverseRounds: number;
  interferenceRounds: number;
  finalScore: number;
};

export function rmInitialStats(): RmStats {
  return {
    level: 1,
    sequenceLength: RM_INITIAL_LENGTH,
    correctTaps: 0,
    mistakes: 0,
    cleanRounds: 0,
    reverseRounds: 0,
    interferenceRounds: 0,
    finalScore: 0,
  };
}

export function rmModeForLevel(level: number): RmMode {
  // Keep the first four levels as forward-recall calibration rounds.
  // Challenge modes start later so users get enough runway before the drill
  // introduces interference or reverse-order recall.
  if (level >= 6 && level % 3 === 0) return "reverse";
  if (level >= 5 && level % 2 === 1) return "interference";
  return "forward";
}

export function rmModeLabel(mode: RmMode): string {
  switch (mode) {
    case "forward":
      return "Forward recall";
    case "reverse":
      return "Reverse recall";
    case "interference":
      return "Noise filter";
  }
}

export function rmModeInstruction(mode: RmMode): string {
  switch (mode) {
    case "forward":
      return "Repeat the sequence in the same order.";
    case "reverse":
      return "Repeat the sequence in reverse order.";
    case "interference":
      return "Ignore the blue noise pulse, then memorize and repeat the gold sequence.";
  }
}

export function rmExpectedSequence(sequence: number[], mode: RmMode): number[] {
  return mode === "reverse" ? [...sequence].reverse() : sequence;
}

export function rmGenerateSequence(length: number): number[] {
  // For a 3x3 grid, repeated cells become visually ambiguous because the
  // player cannot easily tell whether a tile appeared once or multiple times.
  // Keep sequences unique while the requested length fits the grid. If a later
  // version exceeds 9 cells, cycle through shuffled pools while still avoiding
  // immediate repeats.
  const sequence: number[] = [];
  let pool = Array.from({ length: RM_GRID_SIZE }, (_, index) => index);

  const shufflePool = () => {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  };

  shufflePool();

  while (sequence.length < length) {
    if (pool.length === 0) {
      pool = Array.from({ length: RM_GRID_SIZE }, (_, index) => index);
      shufflePool();
    }

    const previous = sequence[sequence.length - 1];
    let next = pool.shift() ?? Math.floor(Math.random() * RM_GRID_SIZE);

    if (next === previous && pool.length > 0) {
      const replacement = pool.shift() as number;
      pool.push(next);
      next = replacement;
    }

    sequence.push(next);
  }

  return sequence;
}

export function rmGenerateNoiseCells(sequence: number[], count = 2): number[] {
  const sequenceSet = new Set(sequence);
  const candidates = Array.from({ length: RM_GRID_SIZE }, (_, index) => index).filter(
    (index) => !sequenceSet.has(index),
  );

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, Math.min(count, candidates.length));
}

export function rmCalculateScore(stats: Omit<RmStats, "finalScore">): number {
  const {
    level,
    sequenceLength,
    correctTaps,
    mistakes,
    cleanRounds,
    reverseRounds,
    interferenceRounds,
  } = stats;
  const totalTaps = correctTaps + mistakes;
  const accuracy = totalTaps > 0 ? correctTaps / totalTaps : 0;
  const levelsCompleted = Math.max(0, level - 1);
  const challengeBonus = reverseRounds * 140 + interferenceRounds * 110;
  const cleanBonus = cleanRounds * 75;

  return clampScore(
    levelsCompleted * 210 +
      correctTaps * 24 +
      accuracy * levelsCompleted * sequenceLength * 22 +
      levelsCompleted * sequenceLength * 12 +
      challengeBonus +
      cleanBonus -
      mistakes * 90,
  );
}

export function rmPhaseLabel(phase: RmPhase): string {
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
