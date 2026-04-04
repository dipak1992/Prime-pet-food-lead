import { NextRequest, NextResponse } from "next/server";

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zip = searchParams.get("zip");
  const query = searchParams.get("query") || "pet store";

  if (!zip) {
    return NextResponse.json(
      { error: "ZIP code is required" },
      { status: 400 }
    );
  }

  if (!FOURSQUARE_API_KEY) {
    return NextResponse.json(
      { error: "Foursquare API key not configured. Add FOURSQUARE_API_KEY to .env" },
      { status: 500 }
    );
  }

  try {
    // Search for pet stores near the ZIP code using Foursquare Places API
    const url = new URL("https://places-api.foursquare.com/places/search");
    url.searchParams.set("query", query);
    url.searchParams.set("near", `${zip}, US`);
    url.searchParams.set("limit", "50");
    url.searchParams.set(
      "fields",
      "name,location,tel,website,rating,fsq_place_id,latitude,longitude"
    );

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Foursquare API error: ${res.status}`, details: err },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Transform to our format
    const stores = (data.results || []).map(
      (place: {
        fsq_place_id: string;
        name: string;
        location?: {
          formatted_address?: string;
          locality?: string;
          region?: string;
          postcode?: string;
        };
        tel?: string;
        website?: string;
        rating?: number;
        latitude?: { value: number };
        longitude?: { value: number };
      }) => ({
        foursquareId: place.fsq_place_id,
        name: place.name,
        address: place.location?.formatted_address || "",
        city: place.location?.locality || "",
        state: place.location?.region || "",
        zip: place.location?.postcode || zip,
        phone: place.tel || null,
        website: place.website || null,
        googleRating: place.rating || null,
        latitude: place.latitude?.value || null,
        longitude: place.longitude?.value || null,
      })
    );

    return NextResponse.json({ stores, count: stores.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search stores" },
      { status: 500 }
    );
  }
}
