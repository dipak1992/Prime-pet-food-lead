import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "vet";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  return `[out:json][timeout:30];
${area}
(
  node["amenity"="veterinary"](area.searchArea);
  way["amenity"="veterinary"](area.searchArea);
  node["healthcare"="veterinary"](area.searchArea);
  way["healthcare"="veterinary"](area.searchArea);
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

export const vetsModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Veterinary Clinics",
  search,
};
