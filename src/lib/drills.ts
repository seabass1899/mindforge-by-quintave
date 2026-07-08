export type DrillId = "select" | "recall-matrix" | "signal-lock" | "cognitive-switch";

export type DrillCatalogItem = {
  id: Exclude<DrillId, "select">;
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
    description: "Reconstruct spatial patterns from memory under time pressure.",
    duration: "4 min",
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
