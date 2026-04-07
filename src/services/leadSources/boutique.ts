import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "boutique";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  // Boutique pet shops often tagged as shop=pet but with
  // additional luxury/boutique keywords. We search all pet shops
  // and filter by name patterns on the client side.
  return `[out:json][timeout:30];
${area}
(
  node["shop"="pet"](area.searchArea);
  way["shop"="pet"](area.searchArea);
  node["shop"="pet_food"](area.searchArea);
  way["shop"="pet_food"](area.searchArea);
);
out body center;`;
}

const BOUTIQUE_KEYWORDS = [
  "boutique", "luxury", "premium", "natural", "organic",
  "holistic", "pawsh", "bark", "wag", "furry", "paws",
  "barkery", "bakery", "gourmet", "artisan",
];

async function search(city: string, state?: string): Promise<LeadResult[]> {
  let elements = await runOverpassQuery(buildQuery(city, state));

  if (elements.length === 0 && state) {
    elements = await runOverpassQuery(buildQuery(city));
  }

  const all = transformElements(elements, city, state, LEAD_TYPE);

  // Filter to likely boutique stores by name keywords
  return all.filter((r) => {
    const lower = r.name.toLowerCase();
    return BOUTIQUE_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

export const boutiqueModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Boutique Pet Shops",
  search,
};
