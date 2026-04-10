import {
  bingSearch,
  extractEmailFromSnippet,
  cleanResultName,
  isExcludedDomain,
} from "./bingSearch";
import type { IntentLead } from "./types";

// Rotate queries to maximize result variety across runs
const DISTRIBUTOR_QUERIES = [
  "pet food wholesale distributor USA contact",
  "dog treat wholesale distributor supplier",
  "natural pet treat bulk wholesale USA",
  "himalayan yak chew wholesale bulk supplier",
  "independent pet product distributor contact email",
];

export async function searchDistributors(): Promise<IntentLead[]> {
  // Run 2 queries in parallel to maximize results without burning quota
  const queryPair = DISTRIBUTOR_QUERIES.slice(
    Math.floor(Math.random() * (DISTRIBUTOR_QUERIES.length - 1)),
    Math.floor(Math.random() * (DISTRIBUTOR_QUERIES.length - 1)) + 2
  );

  const allResults = await Promise.all(
    queryPair.map((q) => bingSearch(q, 8).catch(() => []))
  );

  const seen = new Set<string>();
  const leads: IntentLead[] = [];

  for (let qi = 0; qi < allResults.length; qi++) {
    const results = allResults[qi];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (isExcludedDomain(r.url)) continue;

      // Dedup by URL
      if (seen.has(r.url)) continue;
      seen.add(r.url);

      leads.push({
        id: `dist_${Date.now()}_${qi}_${i}`,
        name: cleanResultName(r.name),
        website: r.url,
        email: extractEmailFromSnippet(r.snippet) || undefined,
        description: r.snippet.slice(0, 220),
        leadType: "distributor",
        intentLevel: "very_high",
        sourceQuery: queryPair[qi],
      });
    }
  }

  return leads;
}
