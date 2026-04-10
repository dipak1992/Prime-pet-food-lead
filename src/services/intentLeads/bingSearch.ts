// Serper.dev — Google Search API
// Free: 2,500 queries (one-time trial)
// Paid: ~$50/5,000 queries (months of usage for small teams)
// Sign up: https://serper.dev
// Env var: SERPER_API_KEY

const SERPER_ENDPOINT = "https://google.serper.dev/search";

export interface SearchResult {
  name: string;
  url: string;
  snippet: string;
  displayUrl: string;
}

export async function webSearch(
  query: string,
  count = 10
): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: Math.min(count, 10) }),
      next: { revalidate: 3600 }, // cache 1hr to preserve quota
    });

    if (!res.ok) {
      console.error(`Serper search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const organic = data.organic || [];

    return organic.map((r: { title: string; link: string; snippet: string }) => ({
      name: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
      displayUrl: r.link || "",
    }));
  } catch (err) {
    console.error("Web search error:", err);
    return [];
  }
}

// Keep bingSearch as an alias so existing imports don't break
export const bingSearch = webSearch;

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
  "amazon", "etsy", "ebay", "walmart", "chewy",
  "petco", "petsmart", "target", "reddit", "youtube",
  "facebook", "instagram", "twitter", "linkedin",
  "yelp", "google", "bing", "wikipedia", "pinterest",
];

export function isExcludedDomain(url: string): boolean {
  const lower = url.toLowerCase();
  return EXCLUDE_DOMAINS.some((d) => lower.includes(d));
}
