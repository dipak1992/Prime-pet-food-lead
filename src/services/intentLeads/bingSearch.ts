// Bing Web Search API v7 wrapper
// Free tier: 1,000 queries/month
// Key: BING_SEARCH_API_KEY env var

const BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/search";

export interface BingResult {
  name: string;
  url: string;
  snippet: string;
  displayUrl: string;
}

export async function bingSearch(
  query: string,
  count = 10
): Promise<BingResult[]> {
  const key = process.env.BING_SEARCH_API_KEY;
  if (!key) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(count, 50)),
      mkt: "en-US",
      responseFilter: "Webpages",
      safeSearch: "Off",
    });

    const res = await fetch(`${BING_ENDPOINT}?${params}`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      next: { revalidate: 3600 }, // cache 1hr to preserve quota
    });

    if (!res.ok) {
      console.error(`Bing search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return (data.webPages?.value as BingResult[]) || [];
  } catch (err) {
    console.error("Bing search error:", err);
    return [];
  }
}

// Extract email addresses visible in a snippet
export function extractEmailFromSnippet(snippet: string): string | null {
  const match = snippet.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  return match ? match[0] : null;
}

// Clean up result title — strip taglines after | or —
export function cleanResultName(title: string): string {
  const stripped = title.split(/\s*[|\u2013\u2014]\s*/)[0].trim();
  return stripped.slice(0, 80);
}

// Extract root domain for deduplication
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Domains to always exclude (retailers, social platforms, aggregators)
export const EXCLUDE_DOMAINS = [
  "amazon",
  "etsy",
  "ebay",
  "walmart",
  "chewy",
  "petco",
  "petsmart",
  "target",
  "reddit",
  "youtube",
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "yelp",
  "google",
  "bing",
  "wikipedia",
  "pinterest",
];

export function isExcludedDomain(url: string): boolean {
  const lower = url.toLowerCase();
  return EXCLUDE_DOMAINS.some((d) => lower.includes(d));
}
