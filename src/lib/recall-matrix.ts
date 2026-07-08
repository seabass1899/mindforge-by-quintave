import { clampScore } from "./game-utils";

export const RM_GRID_SIZE = 9;
export const RM_INITIAL_LENGTH = 3;
export const RM_FLASH_MS = 520;
export const RM_GAP_MS = 220;
export const RM_PRE_MS = 700;

export type RmPhase = "intro" | "showing" | "input" | "result";

export type RmStats = {
  level: number;
  sequenceLength: number;
  correctTaps: number;
  mistakes: number;
  finalScore: number;
};

export function rmInitialStats(): RmStats {
  return {
    level: 1,
    sequenceLength: RM_INITIAL_LENGTH,
    correctTaps: 0,
    mistakes: 0,
    finalScore: 0,
  };
}

export function rmGenerateSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * RM_GRID_SIZE));
}

export function rmCalculateScore(stats: Omit<RmStats, "finalScore">): number {
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
