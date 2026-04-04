import { NextRequest, NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(city: string, state: string): string {
  // Search for pet stores using multiple OSM tags
  // area query uses city name + state context for accuracy
  const areaFilter = state
    ? `area["name"="${city}"]["is_in:state"~"${state}",i]->.searchArea;`
    : `area["name"="${city}"]->.searchArea;`;

  return `[out:json][timeout:30];
${areaFilter}
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
  // Fallback without state filter — just match city name
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get("city")?.trim();
  const state = searchParams.get("state")?.trim();
  // Keep backward compatibility with zip
  const zip = searchParams.get("zip")?.trim();

  if (!city && !zip) {
    return NextResponse.json(
      { error: "City is required" },
      { status: 400 }
    );
  }

  try {
    const searchCity = city || zip || "";
    const query = state
      ? buildOverpassQuery(searchCity, state)
      : buildOverpassQueryFallback(searchCity);

    let res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    // If state-filtered query returns no results, try fallback without state
    let data = await res.json();
    if (state && (!data.elements || data.elements.length === 0)) {
      const fallbackQuery = buildOverpassQueryFallback(searchCity);
      res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(fallbackQuery)}`,
      });
      data = await res.json();
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Search API error: ${res.status}` },
        { status: res.status }
      );
    }

    // Transform OSM data to our format — only include named places
    const stores = (data.elements || [])
      .filter((el: OverpassElement) => el.tags?.name)
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
          city: tags["addr:city"] || searchCity,
          state: tags["addr:state"] || state || "",
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
