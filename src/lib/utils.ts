import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  // Filter out common false positives
  const filtered = matches.filter(
    (e) =>
      !e.includes("example.com") &&
      !e.includes("sentry.io") &&
      !e.includes("wixpress.com") &&
      !e.includes("w3.org") &&
      !e.endsWith(".png") &&
      !e.endsWith(".jpg") &&
      !e.endsWith(".css") &&
      !e.endsWith(".js")
  );
  return [...new Set(filtered)];
}

export function extractSocialLinks(html: string) {
  const instagramRegex =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
  const facebookRegex =
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9._]+)\/?/g;

  const instagramMatches = [...html.matchAll(instagramRegex)];
  const facebookMatches = [...html.matchAll(facebookRegex)];

  return {
    instagram: instagramMatches.length > 0 ? instagramMatches[0][1] : null,
    facebook: facebookMatches.length > 0 ? facebookMatches[0][1] : null,
  };
}

export function detectDogTreatKeywords(text: string): {
  found: boolean;
  keywords: string[];
} {
  const keywords = [
    "dog treats",
    "dog chews",
    "natural dog food",
    "organic dog",
    "yak chew",
    "himalayan chew",
    "cheese chew",
    "bully stick",
    "dental chew",
    "rawhide",
    "dog snack",
    "pet treats",
    "churpi",
  ];
  const lower = text.toLowerCase();
  const found = keywords.filter((k) => lower.includes(k));
  return { found: found.length > 0, keywords: found };
}

export function detectCompetitorBrands(text: string): string[] {
  const competitors = [
    "Himalayan Dog Chew",
    "YAK9",
    "Churpi",
    "Yakers",
    "Himalayan Pet Supply",
    "EcoKind",
    "Mighty Paw",
    "Downtown Pet Supply",
  ];
  const lower = text.toLowerCase();
  return competitors.filter((c) => lower.includes(c.toLowerCase()));
}

export function calculateRelevanceScore(store: {
  sellsDogTreats?: boolean | null;
  sellsCompetitorProducts?: boolean;
  email?: string | null;
  website?: string | null;
  googleRating?: number | null;
}): number {
  let score = 0;
  if (store.sellsDogTreats) score += 35;
  if (store.sellsCompetitorProducts) score += 30;
  if (store.email) score += 15;
  if (store.website) score += 10;
  if (store.googleRating && Number(store.googleRating) >= 4.0) score += 10;
  return Math.min(score, 100);
}

export const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "bg-gray-100 text-gray-800" },
  {
    value: "researched",
    label: "Researched",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "contacted",
    label: "Contacted",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "sample_sent",
    label: "Sample Sent",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "negotiating",
    label: "Negotiating",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "won", label: "Won", color: "bg-green-100 text-green-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
] as const;

export function getStageInfo(stage: string) {
  return (
    PIPELINE_STAGES.find((s) => s.value === stage) || PIPELINE_STAGES[0]
  );
}
