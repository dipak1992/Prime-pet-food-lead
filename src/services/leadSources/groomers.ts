import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "groomer";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  return `[out:json][timeout:30];
${area}
(
  node["shop"="pet;grooming"](area.searchArea);
  way["shop"="pet;grooming"](area.searchArea);
  node["shop"="pet_grooming"](area.searchArea);
  way["shop"="pet_grooming"](area.searchArea);
  node["amenity"="animal_boarding"]["animal_boarding:type"~"dog"](area.searchArea);
  way["amenity"="animal_boarding"]["animal_boarding:type"~"dog"](area.searchArea);
  node["craft"="dog_grooming"](area.searchArea);
  way["craft"="dog_grooming"](area.searchArea);
  node["shop"="grooming"](area.searchArea);
  way["shop"="grooming"](area.searchArea);
);
out body center;`;
}

async function search(city: string, state?: string): Promise<LeadResult[]> {
  let elements = await runOverpassQuery(buildQuery(city, state));

  // Fallback: city-only search if state+city returned nothing
  if (elements.length === 0 && state) {
    elements = await runOverpassQuery(buildQuery(city));
  }

  return transformElements(elements, city, state, LEAD_TYPE);
}

export const groomersModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Dog Groomers",
  search,
};
