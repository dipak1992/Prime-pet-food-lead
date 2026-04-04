import { NextRequest, NextResponse } from "next/server";

const YELP_API_KEY = process.env.YELP_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  if (!YELP_API_KEY) {
    return NextResponse.json(
      { error: "Yelp API key not configured. Add YELP_API_KEY to .env (optional)." },
      { status: 501 }
    );
  }

  if (!name || !city) {
    return NextResponse.json(
      { error: "Store name and city are required" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      term: name,
      location: [city, state].filter(Boolean).join(", "),
      categories: "petstore",
      limit: "3",
    });

    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${YELP_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Yelp API error: ${res.status}`, details: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    const businesses = (data.businesses || []).map(
      (biz: {
        id: string;
        name: string;
        phone: string;
        url: string;
        rating: number;
        review_count: number;
        location?: {
          display_address?: string[];
        };
        coordinates?: { latitude: number; longitude: number };
      }) => ({
        yelpId: biz.id,
        name: biz.name,
        phone: biz.phone || null,
        yelpUrl: biz.url,
        rating: biz.rating,
        reviewCount: biz.review_count,
        address: biz.location?.display_address?.join(", ") || "",
        latitude: biz.coordinates?.latitude || null,
        longitude: biz.coordinates?.longitude || null,
      })
    );

    return NextResponse.json({ businesses, count: businesses.length });
  } catch (error) {
    console.error("Yelp enrichment error:", error);
    return NextResponse.json(
      { error: "Failed to enrich from Yelp" },
      { status: 500 }
    );
  }
}
