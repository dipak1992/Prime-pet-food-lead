import { searchDistributors } from "./distributorLeads";
import { searchResellers } from "./resellerLeads";
import { extractDomain } from "./bingSearch";
import type { IntentLead, IntentLeadType } from "./types";
import { FEATURES } from "@/config/features";

export async function getIntentLeads(
  types: IntentLeadType[]
): Promise<IntentLead[]> {
  if (!FEATURES.ENABLE_INTENT_LEADS) return [];

  const searches: Promise<IntentLead[]>[] = [];

  if (types.includes("distributor") && FEATURES.ENABLE_DISTRIBUTORS) {
    searches.push(searchDistributors().catch(() => []));
  }
  if (types.includes("reseller") && FEATURES.ENABLE_RESELLERS) {
    searches.push(searchResellers().catch(() => []));
  }

  const settled = await Promise.allSettled(searches);
  const all: IntentLead[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      all.push(...result.value);
    }
  }

  // Deduplicate by root domain
  const seenDomains = new Set<string>();
  return all.filter((lead) => {
    const domain = extractDomain(lead.website);
    if (seenDomains.has(domain)) return false;
    seenDomains.add(domain);
    return true;
  });
}
