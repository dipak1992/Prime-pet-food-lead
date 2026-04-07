import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "daycare";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  return `[out:json][timeout:30];
${area}
(
  node["amenity"="animal_boarding"](area.searchArea);
  way["amenity"="animal_boarding"](area.searchArea);
  node["amenity"="animal_shelter"](area.searchArea);
  way["amenity"="animal_shelter"](area.searchArea);
  node["leisure"="dog_park"]["operator"](area.searchArea);
  way["leisure"="dog_park"]["operator"](area.searchArea);
);
out body center;`;
}

async function search(city: string, state?: string): Promise<LeadResult[]> {
  let elements = await runOverpassQuery(buildQuery(city, state));

  if (elements.length === 0 && state) {
    elements = await runOverpassQuery(buildQuery(city));
  }

  return transformElements(elements, city, state, LEAD_TYPE);
}

export const daycareModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Pet Boarding / Daycare",
  search,
};
