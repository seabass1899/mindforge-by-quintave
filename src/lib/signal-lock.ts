import { clampScore } from "./game-utils";

export const SL_GRID_DIM = 4;
export const SL_GRID_SIZE = SL_GRID_DIM * SL_GRID_DIM;
export const SL_DURATION_SEC = 30;
export const SL_ROUND_TIMEOUT_MS = 2400;

export type SlPhase = "intro" | "playing" | "result";
export type SlCellRole = "neutral" | "target" | "decoy" | "distractor" | "interference";

export type SlRound = {
  target: number;
  decoys: number[];
  distractors: number[];
  interference: number[];
  density: number;
};

export type SlStats = {
  hits: number;
  misses: number;
  mistakes: number;
  decoyErrors: number;
  responseTimes: number[];
  finalScore: number;
};

export function slInitialStats(): SlStats {
  return {
    hits: 0,
    misses: 0,
    mistakes: 0,
    decoyErrors: 0,
    responseTimes: [],
    finalScore: 0,
  };
}

function shuffledCellPool(): number[] {
  const pool = Array.from({ length: SL_GRID_SIZE }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function slGenerateRound(roundNumber = 1): SlRound {
  const pool = shuffledCellPool();
  const density = Math.min(8, 4 + Math.floor(roundNumber / 5));
  const decoyCount = roundNumber >= 4 ? 1 + Math.floor(Math.random() * 2) : 0;
  const interferenceCount = roundNumber >= 8 ? 1 : 0;
  const distractorCount = Math.max(3, density - decoyCount - interferenceCount);

  return {
    target: pool[0],
    decoys: pool.slice(1, 1 + decoyCount),
    distractors: pool.slice(1 + decoyCount, 1 + decoyCount + distractorCount),
    interference: pool.slice(
      1 + decoyCount + distractorCount,
      1 + decoyCount + distractorCount + interferenceCount,
    ),
    density,
  };
}

export function slCellRole(index: number, round: SlRound): SlCellRole {
  if (index === round.target) return "target";
  if (round.decoys.includes(index)) return "decoy";
  if (round.interference.includes(index)) return "interference";
  if (round.distractors.includes(index)) return "distractor";
  return "neutral";
}

export function slCalculateScore(stats: Omit<SlStats, "finalScore">): number {
  const { hits, misses, mistakes, decoyErrors, responseTimes } = stats;
  const totalErrors = mistakes + decoyErrors;
  const totalClicks = hits + totalErrors;
  const clickAccuracy = totalClicks > 0 ? hits / totalClicks : 0;
  const totalRounds = hits + misses;
  const completionRate = totalRounds > 0 ? hits / totalRounds : 0;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (1150 - avgMs) / 1150) * 180 : 0;
  const inhibitionBonus = totalClicks > 0 ? clickAccuracy * 180 : 0;

  return clampScore(
    hits * 38 +
      inhibitionBonus +
      completionRate * 130 +
      speedBonus -
      mistakes * 22 -
      decoyErrors * 45 -
      misses * 28,
  );
}

export function slPhaseLabel(phase: SlPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Inhibition lock";
    case "result":
      return "Session complete";
  }
}

export function slTargetRuleLabel(roundNumber: number): string {
  if (roundNumber < 4) return "Tap the solid gold signal";
  if (roundNumber < 8) return "Tap solid gold. Avoid hollow gold.";
  return "Tap solid gold. Ignore decoys and interference.";
}
