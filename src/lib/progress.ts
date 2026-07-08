export type CognitiveDomain = "Memory" | "Focus" | "Flexibility";

export type DailyScoresComplete = {
  memory: number;
  focus: number;
  flexibility: number;
};

export type DailySession = DailyScoresComplete & {
  id: string;
  completedAt: string;
  cpi: number;
  primaryStrength: CognitiveDomain;
  recommendedFocus: CognitiveDomain;
};

const STORAGE_KEY = "mindforge.dailySessions.v1";
const MAX_STORED_SESSIONS = 30;

const domainMap: Array<{ key: keyof DailyScoresComplete; label: CognitiveDomain }> = [
  { key: "memory", label: "Memory" },
  { key: "focus", label: "Focus" },
  { key: "flexibility", label: "Flexibility" },
];

export function calculateCpi(scores: DailyScoresComplete): number {
  return Math.round((scores.memory + scores.focus + scores.flexibility) / 3);
}

export function getPrimaryStrength(scores: DailyScoresComplete): CognitiveDomain {
  return domainMap.reduce((best, item) => (scores[item.key] > scores[best.key] ? item : best), domainMap[0]).label;
}

export function getRecommendedFocus(scores: DailyScoresComplete): CognitiveDomain {
  return domainMap.reduce((lowest, item) => (scores[item.key] < scores[lowest.key] ? item : lowest), domainMap[0]).label;
}

export function createDailySession(scores: DailyScoresComplete): DailySession {
  return {
    id: `mf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    completedAt: new Date().toISOString(),
    cpi: calculateCpi(scores),
    primaryStrength: getPrimaryStrength(scores),
    recommendedFocus: getRecommendedFocus(scores),
    ...scores,
  };
}

function isDailySession(value: unknown): value is DailySession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<DailySession>;
  return (
    typeof session.id === "string" &&
    typeof session.completedAt === "string" &&
    typeof session.cpi === "number" &&
    typeof session.memory === "number" &&
    typeof session.focus === "number" &&
    typeof session.flexibility === "number"
  );
}

export function readDailySessions(): DailySession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDailySession).slice(0, MAX_STORED_SESSIONS);
  } catch {
    return [];
  }
}

export function writeDailySessions(sessions: DailySession[]): DailySession[] {
  const nextSessions = sessions.slice(0, MAX_STORED_SESSIONS);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
  }
  return nextSessions;
}

export function saveDailySession(session: DailySession): DailySession[] {
  const existing = readDailySessions();
  return writeDailySessions([session, ...existing]);
}

export function clearDailySessions(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateStreak(sessions: DailySession[]): number {
  if (sessions.length === 0) return 0;

  const completedDates = new Set(
    sessions.map((session) => toLocalDateKey(new Date(session.completedAt))),
  );

  let streak = 0;
  const cursor = new Date();

  while (completedDates.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function formatSessionDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}
