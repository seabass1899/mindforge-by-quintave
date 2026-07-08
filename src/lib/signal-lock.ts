import { clampScore } from "./game-utils";

export const SL_GRID_DIM = 4;
export const SL_GRID_SIZE = SL_GRID_DIM * SL_GRID_DIM;
export const SL_DURATION_SEC = 30;
export const SL_ROUND_TIMEOUT_MS = 2800;

export type SlPhase = "intro" | "playing" | "result";
export type SlCellRole = "neutral" | "target" | "distractor";

export type SlRound = {
  target: number;
  distractors: number[];
};

export type SlStats = {
  hits: number;
  misses: number;
  mistakes: number;
  responseTimes: number[];
  finalScore: number;
};

export function slInitialStats(): SlStats {
  return {
    hits: 0,
    misses: 0,
    mistakes: 0,
    responseTimes: [],
    finalScore: 0,
  };
}

export function slGenerateRound(): SlRound {
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

export function slCellRole(index: number, round: SlRound): SlCellRole {
  if (index === round.target) return "target";
  if (round.distractors.includes(index)) return "distractor";
  return "neutral";
}

export function slCalculateScore(stats: Omit<SlStats, "finalScore">): number {
  const { hits, misses, mistakes, responseTimes } = stats;
  const totalClicks = hits + mistakes;
  const clickAccuracy = totalClicks > 0 ? hits / totalClicks : 0;
  const totalRounds = hits + misses;
  const completionRate = totalRounds > 0 ? hits / totalRounds : 0;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (1200 - avgMs) / 1200) * 150 : 0;

  return clampScore(
    hits * 35 +
      clickAccuracy * 180 +
      completionRate * 120 +
      speedBonus -
      mistakes * 20 -
      misses * 25,
  );
}

export function slPhaseLabel(phase: SlPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Lock the signal";
    case "result":
      return "Session complete";
  }
}
