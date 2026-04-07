// Search Aggregator — merges results from existing pet store search + new lead type modules
// The existing /api/search endpoint remains UNTOUCHED
// This is a new layer that aggregates across all enabled sources

import { getModuleByType, type LeadResult } from "@/services/leadSources";
import type { LeadType } from "@/config/features";

interface AggregatedSearchResult {
  stores: LeadResult[];
  count: number;
  sources: string[];
  errors: { source: string; error: string }[];
}

/**
 * Search a single lead type
 */
export async function searchByType(
  leadType: LeadType,
  city: string,
  state?: string
): Promise<LeadResult[]> {
  // For pet_store, we don't use a module — the existing /api/search handles it
  if (leadType === "pet_store") {
    return [];
  }

  const module = getModuleByType(leadType);
  if (!module) {
    return [];
  }

  return module.search(city, state);
}

/**
 * Search multiple lead types in parallel and merge results
 */
export async function searchMultipleTypes(
  leadTypes: LeadType[],
  city: string,
  state?: string
): Promise<AggregatedSearchResult> {
  const sources: string[] = [];
  const errors: { source: string; error: string }[] = [];
  const allResults: LeadResult[] = [];

  const promises = leadTypes
    .filter((t) => t !== "pet_store") // pet_store handled by existing endpoint
    .map(async (leadType) => {
      try {
        const results = await searchByType(leadType, city, state);
        return { leadType, results };
      } catch (err) {
        return {
          leadType,
          results: [] as LeadResult[],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

  const settled = await Promise.all(promises);

  for (const result of settled) {
    if ("error" in result && result.error) {
      errors.push({ source: result.leadType, error: result.error });
    }
    if (result.results.length > 0) {
      sources.push(result.leadType);
      allResults.push(...result.results);
    }
  }

  // Deduplicate by osmId
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.osmId)) return false;
    seen.add(r.osmId);
    return true;
  });

  return {
    stores: unique,
    count: unique.length,
    sources,
    errors,
  };
}
