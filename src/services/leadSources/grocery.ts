import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "grocery";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  // Independent/specialty grocery stores — excludes chains via isChainStore
  return `[out:json][timeout:30];
${area}
(
  node["shop"="supermarket"](area.searchArea);
  way["shop"="supermarket"](area.searchArea);
  node["shop"="health_food"](area.searchArea);
  way["shop"="health_food"](area.searchArea);
  node["shop"="organic"](area.searchArea);
  way["shop"="organic"](area.searchArea);
  node["shop"="farm"](area.searchArea);
  way["shop"="farm"](area.searchArea);
);
out body center;`;
}

// Additional grocery chains to exclude
const GROCERY_CHAINS = [
  "kroger", "safeway", "whole foods", "trader joe",
  "aldi", "lidl", "publix", "wegmans", "heb", "h-e-b",
  "food lion", "stop & shop", "giant", "meijer",
];

async function search(city: string, state?: string): Promise<LeadResult[]> {
  let elements = await runOverpassQuery(buildQuery(city, state));

  if (elements.length === 0 && state) {
    elements = await runOverpassQuery(buildQuery(city));
  }

  return transformElements(elements, city, state, LEAD_TYPE).filter((r) => {
    const lower = r.name.toLowerCase();
    return !GROCERY_CHAINS.some((chain) => lower.includes(chain));
  });
}

export const groceryModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Grocery (Pet Section)",
  search,
};
