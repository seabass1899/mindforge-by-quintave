export type DrillId = "select" | "daily-summary" | "recall-matrix" | "signal-lock" | "cognitive-switch";
export type PlayableDrillId = Exclude<DrillId, "select" | "daily-summary">;

export type DrillCatalogItem = {
  id: PlayableDrillId;
  name: string;
  category: string;
  description: string;
  duration: string;
  available: boolean;
};

export const drillCatalog: DrillCatalogItem[] = [
  {
    id: "recall-matrix",
    name: "Recall Matrix",
    category: "Memory",
    description: "Reconstruct spatial patterns with forward, reverse, and noise-filter recall.",
    duration: "4–5 min",
    available: true,
  },
  {
    id: "signal-lock",
    name: "Signal Lock",
    category: "Focus",
    description: "Filter noise and lock onto the target signal under distraction.",
    duration: "30 sec",
    available: true,
  },
  {
    id: "cognitive-switch",
    name: "Cognitive Switch",
    category: "Flexibility",
    description: "Shift rules mid-task and adapt without losing accuracy.",
    duration: "45 sec",
    available: true,
  },
];
