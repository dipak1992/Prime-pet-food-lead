// Google Places API (New) — search for pet businesses by city/state
// Supplements Overpass API with 5-10x more results

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

// Chain stores to exclude
const EXCLUDED_CHAINS = [
  "petsmart", "petco", "pet supplies plus",
  "walmart", "target", "costco", "sam's club",
  "banfield", "vca animal hospital",
];

function isChainStore(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return EXCLUDED_CHAINS.some((chain) => lower.includes(chain));
}

export interface GooglePlaceResult {
  osmId: string; // using place id as osmId for compatibility
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
  googleRating: number | null;
  googleReviewCount: number | null;
}

// Search queries per lead type
const SEARCH_QUERIES: Record<string, string[]> = {
  pet_store: ["independent pet store", "pet supply store", "pet shop"],
  groomer: ["dog grooming", "pet grooming", "dog groomer"],
  vet: ["veterinary clinic", "veterinarian", "animal hospital"],
  daycare: ["dog daycare", "pet boarding", "dog boarding", "pet hotel"],
  trainer: ["dog training", "dog trainer", "puppy training"],
  boutique: ["boutique pet store", "premium pet shop", "holistic pet store"],
  grocery: ["natural grocery store", "organic grocery", "health food store"],
};

interface PlaceResponse {
  places?: {
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    addressComponents?: {
      longText: string;
      types: string[];
    }[];
  }[];
}

function extractAddressComponent(
  components: { longText: string; types: string[] }[] | undefined,
  type: string
): string {
  if (!components) return "";
  const found = components.find((c) => c.types.includes(type));
  return found?.longText || "";
}

export async function searchGooglePlaces(
  city: string,
  state: string | undefined,
  leadType: string
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY not configured");
  }

  const queries = SEARCH_QUERIES[leadType] || SEARCH_QUERIES["pet_store"];
  const location = `${city}${state ? `, ${state}` : ""}`;
  const allResults: GooglePlaceResult[] = [];
  const seenIds = new Set<string>();

  // Search each query variation
  for (const query of queries) {
    try {
      const res = await fetch(PLACES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location,places.rating,places.userRatingCount,places.addressComponents",
        },
        body: JSON.stringify({
          textQuery: `${query} in ${location}`,
          maxResultCount: 20,
        }),
      });

      if (!res.ok) {
        console.error(`Google Places error for "${query}": ${res.status}`);
        continue;
      }

      const data: PlaceResponse = await res.json();

      for (const place of data.places || []) {
        // Skip duplicates and chain stores
        if (seenIds.has(place.id)) continue;
        if (isChainStore(place.displayName.text)) continue;
        seenIds.add(place.id);

        const placeCity = extractAddressComponent(place.addressComponents, "locality");
        const placeState = extractAddressComponent(place.addressComponents, "administrative_area_level_1");
        const placeZip = extractAddressComponent(place.addressComponents, "postal_code");
        const streetNumber = extractAddressComponent(place.addressComponents, "street_number");
        const route = extractAddressComponent(place.addressComponents, "route");
        const address = [streetNumber, route].filter(Boolean).join(" ");

        allResults.push({
          osmId: `google/${place.id}`,
          name: place.displayName.text,
          address: address || place.formattedAddress.split(",")[0] || "",
          city: placeCity || city,
          state: placeState || state || "",
          zip: placeZip || "",
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          email: null, // Google doesn't return emails
          latitude: place.location?.latitude || null,
          longitude: place.location?.longitude || null,
          leadType,
          googleRating: place.rating || null,
          googleReviewCount: place.userRatingCount || null,
        });
      }
    } catch (err) {
      console.error(`Google Places search error for "${query}":`, err);
    }
  }

  return allResults;
}
