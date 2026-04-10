import type { IntentLevel } from "../intentLeads/types";

// Base scores by intent level
const BASE_SCORES: Record<IntentLevel, number> = {
  very_high: 80,
  high: 65,
  medium: 45,
};

export function calculateIntentScore(
  intentLevel: IntentLevel,
  hasEmail: boolean,
  hasWebsite: boolean
): number {
  let score = BASE_SCORES[intentLevel];
  if (hasEmail) score += 10;
  if (hasWebsite) score += 10;
  return Math.min(score, 100);
}

export function intentTemperature(
  intentLevel: IntentLevel
): "HOT" | "WARM" | "COLD" {
  switch (intentLevel) {
    case "very_high":
      return "HOT";
    case "high":
      return "WARM";
    case "medium":
      return "COLD";
  }
}

export const INTENT_LEVEL_LABELS: Record<IntentLevel, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
};

export const INTENT_LEVEL_COLORS: Record<IntentLevel, string> = {
  very_high: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
};
