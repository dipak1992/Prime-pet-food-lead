import { NextRequest, NextResponse } from "next/server";
import { searchByType } from "@/services/searchAggregator";
import { searchGooglePlaces } from "@/lib/google-places";
import { LEAD_TYPE_OPTIONS, type LeadType } from "@/config/features";

// Handles searches for all lead types except pet_store
// Uses Google Places as primary + Overpass as fallback

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get("city")?.trim();
  const state = searchParams.get("state")?.trim();
  const leadType = searchParams.get("type")?.trim() as LeadType;

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  if (!leadType || leadType === "pet_store") {
    return NextResponse.json(
      { error: "Use /api/search for pet stores. This endpoint handles other lead types." },
      { status: 400 }
    );
  }

  const option = LEAD_TYPE_OPTIONS.find((o) => o.value === leadType);
  if (!option || !option.enabled) {
    return NextResponse.json(
      { error: `Lead type "${leadType}" is not available` },
      { status: 400 }
    );
  }

  try {
    // Search both sources in parallel
    const [googleResults, overpassResults] = await Promise.allSettled([
      process.env.GOOGLE_PLACES_API_KEY
        ? searchGooglePlaces(city, state || undefined, leadType)
        : Promise.resolve([]),
      searchByType(leadType, city, state || undefined),
    ]);

    const google = googleResults.status === "fulfilled" ? googleResults.value : [];
    const overpass = overpassResults.status === "fulfilled" ? overpassResults.value : [];

    // Merge and deduplicate by name
    const seenNames = new Set<string>();
    const merged = [];

    for (const store of google) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        merged.push(store);
      }
    }

    for (const store of overpass) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        merged.push({ ...store, googleRating: null, googleReviewCount: null });
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
      leadType,
      source,
    });
  } catch (error) {
    console.error(`Search error (${leadType}):`, error);
    return NextResponse.json(
      { error: "Failed to search. Please try again." },
      { status: 500 }
    );
  }
}
