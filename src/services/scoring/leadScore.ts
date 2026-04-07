// AI Lead Scoring — runs as a separate layer, does NOT modify existing relevanceScore logic
// Produces a HOT / WARM / COLD classification stored alongside existing data

export type LeadTemperature = "HOT" | "WARM" | "COLD";

interface ScoreInput {
  // Existing store fields
  relevanceScore?: number | null;
  sellsDogTreats?: boolean | null;
  sellsCompetitorProducts?: boolean;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  // New fields
  leadType?: string | null;
  pipelineStage?: string;
}

interface ScoreResult {
  temperature: LeadTemperature;
  score: number; // 0–100
  reasons: string[];
}

export function calculateLeadScore(input: ScoreInput): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // === Contact info signals (max 30) ===
  if (input.email) {
    score += 15;
    reasons.push("Has email address");
  }
  if (input.phone) {
    score += 5;
    reasons.push("Has phone number");
  }
  if (input.website) {
    score += 5;
    reasons.push("Has website");
  }
  if (input.instagram) {
    score += 5;
    reasons.push("Has Instagram");
  }

  // === Product fit signals (max 40) ===
  if (input.sellsDogTreats) {
    score += 25;
    reasons.push("Already sells dog treats");
  }
  if (input.sellsCompetitorProducts) {
    score += 15;
    reasons.push("Carries competitor products");
  }

  // === Reputation signals (max 15) ===
  if (input.googleRating && Number(input.googleRating) >= 4.5) {
    score += 10;
    reasons.push("Excellent Google rating (4.5+)");
  } else if (input.googleRating && Number(input.googleRating) >= 4.0) {
    score += 5;
    reasons.push("Good Google rating (4.0+)");
  }
  if (input.googleReviewCount && input.googleReviewCount >= 50) {
    score += 5;
    reasons.push("50+ Google reviews (established business)");
  }

  // === Lead type bonus (max 15) ===
  const highValueTypes = ["pet_store", "boutique", "groomer"];
  const mediumValueTypes = ["daycare", "vet"];

  if (input.leadType && highValueTypes.includes(input.leadType)) {
    score += 15;
    reasons.push("High-value lead type");
  } else if (input.leadType && mediumValueTypes.includes(input.leadType)) {
    score += 10;
    reasons.push("Medium-value lead type");
  } else if (input.leadType) {
    score += 5;
    reasons.push("Potential lead type");
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine temperature
  let temperature: LeadTemperature;
  if (score >= 60) {
    temperature = "HOT";
  } else if (score >= 35) {
    temperature = "WARM";
  } else {
    temperature = "COLD";
  }

  return { temperature, score, reasons };
}

export function getTemperatureColor(temp: LeadTemperature): string {
  switch (temp) {
    case "HOT":
      return "bg-red-100 text-red-800";
    case "WARM":
      return "bg-orange-100 text-orange-800";
    case "COLD":
      return "bg-blue-100 text-blue-800";
  }
}

export function getTemperatureEmoji(temp: LeadTemperature): string {
  switch (temp) {
    case "HOT":
      return "🔥";
    case "WARM":
      return "🟡";
    case "COLD":
      return "🧊";
  }
}
