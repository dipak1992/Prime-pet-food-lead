import { NextRequest, NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Chain stores to exclude from results
const EXCLUDED_CHAINS = [
  "petsmart",
  "petco",
  "pet supplies plus",
];

function isChainStore(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return EXCLUDED_CHAINS.some((chain) => lower.includes(chain));
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(stateName: string): string {
  // Search entire state for pet stores
  return `[out:json][timeout:90];
area["name"="${stateName}"]["admin_level"="4"]["boundary"="administrative"]->.searchArea;
(
  node["shop"="pet"](area.searchArea);
  way["shop"="pet"](area.searchArea);
  node["shop"="pet;grooming"](area.searchArea);
  way["shop"="pet;grooming"](area.searchArea);
  node["shop"="pet_food"](area.searchArea);
  way["shop"="pet_food"](area.searchArea);
);
out body center;`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state")?.trim();

  if (!state) {
    return NextResponse.json(
      { error: "State is required" },
      { status: 400 }
    );
  }

  try {
    const query = buildOverpassQuery(state);

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Search API error: ${res.status}` },
        { status: res.status }
      );
    }

    // Transform OSM data — only named places, exclude chain stores
    const stores = (data.elements || [])
      .filter((el: OverpassElement) => el.tags?.name && !isChainStore(el.tags.name))
      .map((el: OverpassElement) => {
        const tags = el.tags || {};
        const lat = el.lat || el.center?.lat || null;
        const lon = el.lon || el.center?.lon || null;

        return {
          osmId: `${el.type}/${el.id}`,
          name: tags.name,
          address: [tags["addr:housenumber"], tags["addr:street"]]
            .filter(Boolean)
            .join(" ") || "",
          city: tags["addr:city"] || "",
          state: tags["addr:state"] || state,
          zip: tags["addr:postcode"] || "",
          phone: tags.phone || tags["contact:phone"] || null,
          website: tags.website || tags["contact:website"] || null,
          email: tags.email || tags["contact:email"] || null,
          latitude: lat,
          longitude: lon,
        };
      });

    return NextResponse.json({
      stores,
      count: stores.length,
      source: "openstreetmap",
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search stores. Please try again." },
      { status: 500 }
    );
  }
}
