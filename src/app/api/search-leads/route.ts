import { NextRequest, NextResponse } from "next/server";
import { searchByType } from "@/services/searchAggregator";
import { LEAD_TYPE_OPTIONS, type LeadType } from "@/config/features";

// NEW endpoint — does NOT replace /api/search
// Handles searches for new lead types (groomers, vets, daycare, etc.)
// pet_store type continues to use existing /api/search

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

  // Verify lead type is valid and enabled
  const option = LEAD_TYPE_OPTIONS.find((o) => o.value === leadType);
  if (!option || !option.enabled) {
    return NextResponse.json(
      { error: `Lead type "${leadType}" is not available` },
      { status: 400 }
    );
  }

  try {
    const stores = await searchByType(leadType, city, state);

    return NextResponse.json({
      stores,
      count: stores.length,
      leadType,
      source: "openstreetmap",
    });
  } catch (error) {
    console.error(`Search error (${leadType}):`, error);
    return NextResponse.json(
      { error: "Failed to search. Please try again." },
      { status: 500 }
    );
  }
}
