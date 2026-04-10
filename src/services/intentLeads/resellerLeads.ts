import {
  bingSearch,
  extractEmailFromSnippet,
  cleanResultName,
  isExcludedDomain,
} from "./bingSearch";
import type { IntentLead } from "./types";

// Queries that surface B2B resellers & wholesale buyers
const RESELLER_QUERIES = [
  "yak chew wholesale reseller USA buy bulk",
  "himalayan dog chew retailer wholesale order",
  "natural dog treat wholesale buyer USA",
  "pet boutique wholesale supplier contact",
  "independent pet store wholesale distributor buy",
];

export async function searchResellers(): Promise<IntentLead[]> {
  const queryPair = RESELLER_QUERIES.slice(
    Math.floor(Math.random() * (RESELLER_QUERIES.length - 1)),
    Math.floor(Math.random() * (RESELLER_QUERIES.length - 1)) + 2
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
      if (seen.has(r.url)) continue;
      seen.add(r.url);

      leads.push({
        id: `res_${Date.now()}_${qi}_${i}`,
        name: cleanResultName(r.name),
        website: r.url,
        email: extractEmailFromSnippet(r.snippet) || undefined,
        description: r.snippet.slice(0, 220),
        leadType: "reseller",
        intentLevel: "high",
        sourceQuery: queryPair[qi],
      });
    }
  }

  return leads;
}
