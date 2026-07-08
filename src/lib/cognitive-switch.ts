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

export type CsItem = {
  color: CsColor;
  shape: CsShape;
  number: CsNumber;
};

export type CsRound = {
  rule: CsRule;
  reference: CsItem;
  choices: CsItem[];
  correctIndex: number;
  isSwitchRound: boolean;
};

export type CsStats = {
  correct: number;
  mistakes: number;
  rounds: number;
  ruleSwitches: number;
  switchAttempts: number;
  switchCorrect: number;
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
    responseTimes: [],
    finalScore: 0,
  };
}

export function csRuleForRound(roundNumber: number): CsRule {
  return CS_RULES[Math.floor((roundNumber - 1) / 3) % CS_RULES.length]!;
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
    item.color = shouldMatch ? reference.color : pickDifferent(CS_COLORS, reference.color);
  }

  if (rule === "shape") {
    item.shape = shouldMatch ? reference.shape : pickDifferent(CS_SHAPES, reference.shape);
  }

  if (rule === "number") {
    item.number = shouldMatch ? reference.number : pickDifferent(CS_NUMBERS, reference.number);
  }

  return item;
}

export function csGenerateRound(rule: CsRule, isSwitchRound: boolean): CsRound {
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

export function csCalculateScore(stats: Omit<CsStats, "finalScore">): number {
  const { correct, mistakes, ruleSwitches, switchAttempts, switchCorrect, responseTimes } = stats;
  const totalAnswers = correct + mistakes;
  const accuracy = totalAnswers > 0 ? correct / totalAnswers : 0;
  const switchAccuracy = switchAttempts > 0 ? switchCorrect / switchAttempts : 1;
  const avgMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const speedBonus = avgMs > 0 ? Math.max(0, (1800 - avgMs) / 1800) * 180 : 0;

  return clampScore(
    correct * 40 +
      accuracy * 220 +
      switchAccuracy * 200 +
      speedBonus +
      ruleSwitches * 20 -
      mistakes * 25,
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
