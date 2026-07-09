export const VF_DURATION_SEC = 45;
export const VF_GRID_SIZE = 9;
export const VF_START_TIMEOUT_MS = 2600;
export const VF_MIN_TIMEOUT_MS = 1250;

export type VfPhase = "intro" | "playing" | "result";
export type VfDirection = "up" | "down" | "left" | "right";
export type VfTrialType = "clear" | "conflict" | "shift" | "interference";

export type VfCell = {
  direction: VfDirection;
  isTarget: boolean;
};

export type VfRound = {
  targetDirection: VfDirection;
  targetIndex: number;
  cells: VfCell[];
  level: number;
  trialType: VfTrialType;
  timeoutMs: number;
};

export type VfStats = {
  correct: number;
  mistakes: number;
  misses: number;
  rounds: number;
  conflictTrials: number;
  conflictCorrect: number;
  shiftedTrials: number;
  shiftedCorrect: number;
  bestStreak: number;
  currentStreak: number;
  responseTimes: number[];
  finalScore: number;
};

const directions: VfDirection[] = ["up", "down", "left", "right"];
const targetIndexes = [1, 3, 4, 5, 7];

export function vfInitialStats(): VfStats {
  return {
    correct: 0,
    mistakes: 0,
    misses: 0,
    rounds: 0,
    conflictTrials: 0,
    conflictCorrect: 0,
    shiftedTrials: 0,
    shiftedCorrect: 0,
    bestStreak: 0,
    currentStreak: 0,
    responseTimes: [],
    finalScore: 0,
  };
}

function randomDirection(): VfDirection {
  return directions[Math.floor(Math.random() * directions.length)];
}

function oppositeDirection(direction: VfDirection): VfDirection {
  if (direction === "up") return "down";
  if (direction === "down") return "up";
  if (direction === "left") return "right";
  return "left";
}

function otherDirection(direction: VfDirection): VfDirection {
  const options = directions.filter((item) => item !== direction);
  return options[Math.floor(Math.random() * options.length)];
}

function trialTypeForRound(roundNumber: number): VfTrialType {
  if (roundNumber <= 4) return "clear";
  if (roundNumber % 9 === 0) return "interference";
  if (roundNumber >= 10 && roundNumber % 4 === 0) return "shift";
  if (roundNumber >= 5) return "conflict";
  return "clear";
}

export function vfGenerateRound(roundNumber: number): VfRound {
  const level = Math.min(5, Math.floor((roundNumber - 1) / 6) + 1);
  const trialType = trialTypeForRound(roundNumber);
  const targetDirection = randomDirection();
  const targetIndex = trialType === "shift"
    ? targetIndexes[Math.floor(Math.random() * targetIndexes.length)]
    : 4;
  const timeoutMs = Math.max(VF_MIN_TIMEOUT_MS, VF_START_TIMEOUT_MS - (level - 1) * 275);
  const cells = Array.from({ length: VF_GRID_SIZE }, (_, index) => {
    if (index === targetIndex) {
      return { direction: targetDirection, isTarget: true };
    }

    let direction: VfDirection;
    if (trialType === "clear") {
      direction = Math.random() < 0.35 ? targetDirection : randomDirection();
    } else if (trialType === "conflict" || trialType === "interference") {
      direction = Math.random() < 0.72 ? oppositeDirection(targetDirection) : otherDirection(targetDirection);
    } else {
      direction = Math.random() < 0.55 ? oppositeDirection(targetDirection) : randomDirection();
    }

    return { direction, isTarget: false };
  });

  return {
    targetDirection,
    targetIndex,
    cells,
    level,
    trialType,
    timeoutMs,
  };
}

export function vfDirectionSymbol(direction: VfDirection): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "left") return "←";
  return "→";
}

export function vfDirectionLabel(direction: VfDirection): string {
  if (direction === "up") return "Up";
  if (direction === "down") return "Down";
  if (direction === "left") return "Left";
  return "Right";
}

export function vfTrialLabel(trialType: VfTrialType): string {
  switch (trialType) {
    case "clear":
      return "Clear signal";
    case "conflict":
      return "Conflict field";
    case "shift":
      return "Shifted signal";
    case "interference":
      return "Interference pulse";
  }
}

export function vfTrialInstruction(trialType: VfTrialType): string {
  switch (trialType) {
    case "clear":
      return "Read the highlighted signal direction.";
    case "conflict":
      return "Ignore the surrounding field. Follow only the highlighted vector.";
    case "shift":
      return "The active signal may move off-center. Follow the gold-highlighted vector.";
    case "interference":
      return "Suppress the noisy field and respond to the highlighted vector.";
  }
}

export function vfPhaseLabel(phase: VfPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Read the vector";
    case "result":
      return "Session complete";
  }
}

export function vfCalculateScore(stats: Omit<VfStats, "finalScore">): number {
  const { correct, mistakes, misses, rounds, conflictTrials, conflictCorrect, shiftedTrials, shiftedCorrect, bestStreak, responseTimes } = stats;
  const attempted = correct + mistakes;
  const accuracy = attempted > 0 ? correct / attempted : 0;
  const completion = rounds > 0 ? correct / rounds : 0;
  const conflictAccuracy = conflictTrials > 0 ? conflictCorrect / conflictTrials : 1;
  const shiftAccuracy = shiftedTrials > 0 ? shiftedCorrect / shiftedTrials : 1;
  const avgMs = responseTimes.length > 0
    ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
    : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (1350 - avgMs) / 1350) * 220 : 0;

  return Math.max(
    0,
    Math.round(
      correct * 48 +
        accuracy * 260 +
        completion * 160 +
        conflictAccuracy * 150 +
        shiftAccuracy * 120 +
        bestStreak * 14 +
        speedBonus -
        mistakes * 34 -
        misses * 42,
    ),
  );
}
