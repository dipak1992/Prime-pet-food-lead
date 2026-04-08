import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-places";

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

function buildOverpassQuery(city: string, state: string): string {
  return `[out:json][timeout:30];
area["name"="${state}"]["admin_level"="4"]->.state;
area["name"="${city}"](area.state)->.searchArea;
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

function buildOverpassQueryFallback(city: string): string {
  return `[out:json][timeout:30];
area["name"="${city}"]->.searchArea;
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

async function searchOverpass(city: string, state?: string) {
  const query = state
    ? buildOverpassQuery(city, state)
    : buildOverpassQueryFallback(city);

  let res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  let data = await res.json();
  if (state && (!data.elements || data.elements.length === 0)) {
    const fallbackQuery = buildOverpassQueryFallback(city);
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(fallbackQuery)}`,
    });
    data = await res.json();
  }

  if (!res.ok) return [];

  return (data.elements || [])
    .filter((el: OverpassElement) => el.tags?.name && !isChainStore(el.tags.name))
    .map((el: OverpassElement) => {
      const tags = el.tags || {};
      return {
        osmId: `${el.type}/${el.id}`,
        name: tags.name,
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
        googleRating: null,
        googleReviewCount: null,
      };
    });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get("city")?.trim();
  const state = searchParams.get("state")?.trim();

  if (!city) {
    return NextResponse.json(
      { error: "City is required" },
      { status: 400 }
    );
  }

  try {
    // Search both sources in parallel
    const [googleResults, overpassResults] = await Promise.allSettled([
      process.env.GOOGLE_PLACES_API_KEY
        ? searchGooglePlaces(city, state || undefined, "pet_store")
        : Promise.resolve([]),
      searchOverpass(city, state || undefined),
    ]);

    const google = googleResults.status === "fulfilled" ? googleResults.value : [];
    const overpass = overpassResults.status === "fulfilled" ? overpassResults.value : [];

    // Merge and deduplicate by name (case-insensitive)
    const seenNames = new Set<string>();
    const merged = [];

    // Google results first (higher quality data)
    for (const store of google) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        merged.push(store);
      }
    }

    // Then Overpass results (fills gaps)
    for (const store of overpass) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        merged.push(store);
      }
    }

    const source = google.length > 0 && overpass.length > 0
      ? "google+openstreetmap"
      : google.length > 0
        ? "google"
        : "openstreetmap";

    return NextResponse.json({
      stores: merged,
      count: merged.length,
      source,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search stores. Please try again." },
      { status: 500 }
    );
  }
}
