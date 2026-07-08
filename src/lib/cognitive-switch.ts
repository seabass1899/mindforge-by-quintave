import { clampScore, pickDifferent, pickOne, shuffle } from "./game-utils";

export const CS_DURATION_SEC = 45;
export const CS_RULES = ["color", "shape", "number"] as const;
export const CS_COLORS = ["gold", "blue", "violet", "green"] as const;
export const CS_SHAPES = ["circle", "square", "triangle", "diamond"] as const;
export const CS_NUMBERS = [1, 2, 3, 4] as const;

export type CsPhase = "intro" | "playing" | "result";
export type CsRule = (typeof CS_RULES)[number];
export type CsColor = (typeof CS_COLORS)[number];
export type CsShape = (typeof CS_SHAPES)[number];
export type CsNumber = (typeof CS_NUMBERS)[number];
export type CsTrialType = "standard" | "conflict" | "switch" | "previous-trap";

export type CsItem = {
  color: CsColor;
  shape: CsShape;
  number: CsNumber;
};

export type CsRound = {
  rule: CsRule;
  previousRule?: CsRule;
  reference: CsItem;
  choices: CsItem[];
  correctIndex: number;
  previousTrapIndex: number | null;
  conflictIndex: number | null;
  isSwitchRound: boolean;
  trialType: CsTrialType;
  choiceCount: number;
};

export type CsStats = {
  correct: number;
  mistakes: number;
  rounds: number;
  ruleSwitches: number;
  switchAttempts: number;
  switchCorrect: number;
  conflictTrials: number;
  conflictCorrect: number;
  previousTrapErrors: number;
  responseTimes: number[];
  finalScore: number;
};

export function csInitialStats(): CsStats {
  return {
    correct: 0,
    mistakes: 0,
    rounds: 0,
    ruleSwitches: 0,
    switchAttempts: 0,
    switchCorrect: 0,
    conflictTrials: 0,
    conflictCorrect: 0,
    previousTrapErrors: 0,
    responseTimes: [],
    finalScore: 0,
  };
}

export function csRuleForRound(roundNumber: number): CsRule {
  // Calibration: first nine rounds switch every three rounds.
  // Pressure phase: after round nine, switch every two rounds.
  const switchInterval = roundNumber <= 9 ? 3 : 2;
  return CS_RULES[Math.floor((roundNumber - 1) / switchInterval) % CS_RULES.length]!;
}

function csRandomItem(): CsItem {
  return {
    color: pickOne(CS_COLORS),
    shape: pickOne(CS_SHAPES),
    number: pickOne(CS_NUMBERS),
  };
}

function csApplyRule(item: CsItem, reference: CsItem, rule: CsRule, shouldMatch: boolean): void {
  if (rule === "color") {
    item.color = shouldMatch ? reference.color : pickDifferent(CS_COLORS, reference.color);
  }

  if (rule === "shape") {
    item.shape = shouldMatch ? reference.shape : pickDifferent(CS_SHAPES, reference.shape);
  }

  if (rule === "number") {
    item.number = shouldMatch ? reference.number : pickDifferent(CS_NUMBERS, reference.number);
  }
}

function csItemForRules(reference: CsItem, matches: CsRule[], nonMatches: CsRule[]): CsItem {
  const item = csRandomItem();

  for (const rule of nonMatches) {
    csApplyRule(item, reference, rule, false);
  }

  for (const rule of matches) {
    csApplyRule(item, reference, rule, true);
  }

  return item;
}

function csItemsEqual(a: CsItem, b: CsItem): boolean {
  return a.color === b.color && a.shape === b.shape && a.number === b.number;
}

function csUniqueItem(items: CsItem[], factory: () => CsItem): CsItem {
  let candidate = factory();
  let guard = 0;

  while (items.some((existing) => csItemsEqual(existing, candidate)) && guard < 30) {
    candidate = factory();
    guard += 1;
  }

  return candidate;
}

function csNonActiveRule(activeRule: CsRule, avoidRule?: CsRule): CsRule {
  const candidates = CS_RULES.filter((rule) => rule !== activeRule && rule !== avoidRule);
  return pickOne(candidates.length > 0 ? candidates : CS_RULES.filter((rule) => rule !== activeRule));
}

export function csGenerateRound(
  rule: CsRule,
  isSwitchRound: boolean,
  previousRule?: CsRule,
  roundNumber = 1,
): CsRound {
  const reference = csRandomItem();
  const choiceCount = roundNumber >= 10 ? 4 : 3;
  const canUsePreviousTrap = Boolean(previousRule && previousRule !== rule && roundNumber >= 5);
  const trialType: CsTrialType = isSwitchRound
    ? "switch"
    : canUsePreviousTrap && roundNumber >= 7 && Math.random() < 0.45
      ? "previous-trap"
      : roundNumber >= 4 && Math.random() < 0.65
        ? "conflict"
        : "standard";

  const choices: CsItem[] = [];
  const correct = csUniqueItem(choices, () => csItemForRules(reference, [rule], []));
  choices.push(correct);

  let previousTrapItem: CsItem | null = null;
  if ((trialType === "previous-trap" || trialType === "switch") && previousRule && previousRule !== rule) {
    previousTrapItem = csUniqueItem(choices, () => csItemForRules(reference, [previousRule], [rule]));
    choices.push(previousTrapItem);
  }

  let conflictItem: CsItem | null = null;
  if (trialType === "conflict" || trialType === "switch") {
    const lureRule = csNonActiveRule(rule, previousRule);
    conflictItem = csUniqueItem(choices, () => csItemForRules(reference, [lureRule], [rule]));
    choices.push(conflictItem);
  }

  while (choices.length < choiceCount) {
    choices.push(csUniqueItem(choices, () => csItemForRules(reference, [], [rule])));
  }

  const shuffled = shuffle(choices);
  const correctIndex = shuffled.findIndex((item) => csItemsEqual(item, correct));
  const previousTrapIndex = previousTrapItem
    ? shuffled.findIndex((item) => csItemsEqual(item, previousTrapItem))
    : null;
  const conflictIndex = conflictItem ? shuffled.findIndex((item) => csItemsEqual(item, conflictItem)) : null;

  return {
    rule,
    previousRule,
    reference,
    choices: shuffled,
    correctIndex,
    previousTrapIndex: previousTrapIndex !== -1 ? previousTrapIndex : null,
    conflictIndex: conflictIndex !== -1 ? conflictIndex : null,
    isSwitchRound,
    trialType,
    choiceCount,
  };
}

export function csCalculateScore(stats: Omit<CsStats, "finalScore">): number {
  const {
    correct,
    mistakes,
    ruleSwitches,
    switchAttempts,
    switchCorrect,
    conflictTrials,
    conflictCorrect,
    previousTrapErrors,
    responseTimes,
  } = stats;
  const totalAnswers = correct + mistakes;
  const accuracy = totalAnswers > 0 ? correct / totalAnswers : 0;
  const switchAccuracy = switchAttempts > 0 ? switchCorrect / switchAttempts : 1;
  const conflictAccuracy = conflictTrials > 0 ? conflictCorrect / conflictTrials : 1;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (1900 - avgMs) / 1900) * 180 : 0;

  return clampScore(
    correct * 42 +
      accuracy * 220 +
      switchAccuracy * 220 +
      conflictAccuracy * 180 +
      speedBonus +
      ruleSwitches * 18 -
      mistakes * 24 -
      previousTrapErrors * 45,
  );
}

export function csPhaseLabel(phase: CsPhase): string {
  switch (phase) {
    case "intro":
      return "Ready";
    case "playing":
      return "Switch under pressure";
    case "result":
      return "Session complete";
  }
}

export function csRuleLabel(rule: CsRule): string {
  return rule.toUpperCase();
}

export function csTrialLabel(trialType: CsTrialType): string {
  switch (trialType) {
    case "standard":
      return "Standard trial";
    case "conflict":
      return "Conflict trial";
    case "switch":
      return "Rule-switch trial";
    case "previous-trap":
      return "Previous-rule trap";
  }
}

export function csChoiceErrorType(round: CsRound, choiceIndex: number): "previous-rule" | "conflict" | "miss" {
  if (round.previousTrapIndex === choiceIndex) return "previous-rule";
  if (round.conflictIndex === choiceIndex) return "conflict";
  return "miss";
}
