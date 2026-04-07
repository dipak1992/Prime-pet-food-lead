// Shared types for all lead source modules

export interface LeadResult {
  osmId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  leadType: string;
}

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface LeadSourceModule {
  leadType: string;
  label: string;
  search(city: string, state?: string): Promise<LeadResult[]>;
}

// Chain stores to exclude across all modules
export const EXCLUDED_CHAINS = [
  "petsmart", "petco", "pet supplies plus",
  "walmart", "target", "costco", "sam's club",
  "banfield", "vca animal hospital",
];

export function isChainStore(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return EXCLUDED_CHAINS.some((chain) => lower.includes(chain));
}

// Shared Overpass query runner
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export async function runOverpassQuery(query: string): Promise<OverpassElement[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const data = await res.json();
  return data.elements || [];
}

// Transform Overpass elements to LeadResult
export function transformElements(
  elements: OverpassElement[],
  city: string,
  state: string | undefined,
  leadType: string
): LeadResult[] {
  return elements
    .filter((el) => el.tags?.name && !isChainStore(el.tags.name))
    .map((el) => {
      const tags = el.tags || {};
      return {
        osmId: `${el.type}/${el.id}`,
        name: tags.name!,
        address: [tags["addr:housenumber"], tags["addr:street"]]
          .filter(Boolean)
          .join(" ") || "",
        city: tags["addr:city"] || city,
        state: tags["addr:state"] || state || "",
        zip: tags["addr:postcode"] || "",
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || null,
        email: tags.email || tags["contact:email"] || null,
        latitude: el.lat || el.center?.lat || null,
        longitude: el.lon || el.center?.lon || null,
        leadType,
      };
    });
}

// Helper: build area query for city+state or city-only
export function buildAreaFilter(city: string, state?: string): string {
  if (state) {
    return `area["name"="${state}"]["admin_level"="4"]->.state;
area["name"="${city}"](area.state)->.searchArea;`;
  }
  return `area["name"="${city}"]->.searchArea;`;
}
