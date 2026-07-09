export const RC_DURATION_SEC = 45;
export const RC_COLUMNS = 6;
export const RC_LANES = 3;
export const RC_TICK_MS = 850;
export const RC_SPAWN_MS = 1350;
export const RC_MAX_ACTIVE = 5;

export type RcPhase = "intro" | "playing" | "result";
export type RcKind = "gold" | "blue" | "violet";

export type RcSignal = {
  id: number;
  kind: RcKind;
  lane: number;
  x: number;
  bornAt: number;
  reroutes: number;
};

export type RcStats = {
  routed: number;
  misroutes: number;
  collisions: number;
  reroutes: number;
  responseTimes: number[];
  finalScore: number;
};

const signalKinds: RcKind[] = ["gold", "blue", "violet"];

export function rcInitialStats(): RcStats {
  return {
    routed: 0,
    misroutes: 0,
    collisions: 0,
    reroutes: 0,
    responseTimes: [],
    finalScore: 0,
  };
}

export function rcGateForKind(kind: RcKind): number {
  if (kind === "gold") return 0;
  if (kind === "blue") return 1;
  return 2;
}

export function rcKindLabel(kind: RcKind): string {
  if (kind === "gold") return "Gold";
  if (kind === "blue") return "Blue";
  return "Violet";
}

export function rcKindSymbol(kind: RcKind): string {
  if (kind === "gold") return "◆";
  if (kind === "blue") return "●";
  return "▲";
}

export function rcGateLabel(lane: number): string {
  if (lane === 0) return "Gold Gate";
  if (lane === 1) return "Blue Gate";
  return "Violet Gate";
}

export function rcGenerateSignal(id: number): RcSignal {
  const kind = signalKinds[Math.floor(Math.random() * signalKinds.length)];
  return {
    id,
    kind,
    lane: Math.floor(Math.random() * RC_LANES),
    x: 0,
    bornAt: Date.now(),
    reroutes: 0,
  };
}

export function rcResolveCollisions(signals: RcSignal[]): {
  survivors: RcSignal[];
  collisions: number;
} {
  const buckets = new Map<string, RcSignal[]>();

  for (const signal of signals) {
    const key = `${signal.lane}:${signal.x}`;
    buckets.set(key, [...(buckets.get(key) ?? []), signal]);
  }

  const survivors: RcSignal[] = [];
  let collisions = 0;

  for (const group of buckets.values()) {
    if (group.length > 1) {
      collisions += group.length;
    } else {
      survivors.push(group[0]);
    }
  }

  return { survivors, collisions };
}

export function rcCalculateScore(stats: Omit<RcStats, "finalScore">): number {
  const { routed, misroutes, collisions, reroutes, responseTimes } = stats;
  const totalResolved = routed + misroutes + collisions;
  const accuracy = totalResolved > 0 ? routed / totalResolved : 0;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
      : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (5200 - avgMs) / 5200) * 220 : 0;
  const efficiencyBonus = routed > 0 ? Math.max(0, 1 - reroutes / Math.max(1, routed * 2.5)) * 160 : 0;

  return Math.max(
    0,
    Math.round(
      routed * 75 +
        accuracy * 320 +
        speedBonus +
        efficiencyBonus -
        misroutes * 45 -
        collisions * 65,
    ),
  );
}

export function rcPhaseLabel(phase: RcPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Route under pressure";
    case "result":
      return "Session complete";
  }
}
