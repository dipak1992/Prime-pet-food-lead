import {
  type LeadResult,
  type LeadSourceModule,
  runOverpassQuery,
  transformElements,
  buildAreaFilter,
} from "./types";

const LEAD_TYPE = "trainer";

function buildQuery(city: string, state?: string): string {
  const area = buildAreaFilter(city, state);
  return `[out:json][timeout:30];
${area}
(
  node["amenity"="animal_training"](area.searchArea);
  way["amenity"="animal_training"](area.searchArea);
  node["leisure"="dog_park"]["name"](area.searchArea);
  way["leisure"="dog_park"]["name"](area.searchArea);
);
out body center;`;
}

async function search(city: string, state?: string): Promise<LeadResult[]> {
  let elements = await runOverpassQuery(buildQuery(city, state));

  if (elements.length === 0 && state) {
    elements = await runOverpassQuery(buildQuery(city));
  }

  // Filter: only include results with "train" or "obedience" in name
  // since dog parks with operators aren't always trainers
  return transformElements(elements, city, state, LEAD_TYPE).filter((r) => {
    const lower = r.name.toLowerCase();
    return (
      lower.includes("train") ||
      lower.includes("obedien") ||
      lower.includes("k9") ||
      lower.includes("canine") ||
      lower.includes("dog school") ||
      !lower.includes("park") // keep non-park results
    );
  });
}

export const trainersModule: LeadSourceModule = {
  leadType: LEAD_TYPE,
  label: "Dog Trainers",
  search,
};
