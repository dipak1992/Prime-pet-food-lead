import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EmailRequest {
  storeName: string;
  storeCity?: string | null;
  storeState?: string | null;
  storeWebsite?: string | null;
  category: string;
  sequenceStep: number;
  sellsCompetitorProducts?: boolean;
  competitorBrands?: string[];
  sellsDogTreats?: boolean | null;
}

const SEQUENCE_CONTEXT: Record<number, string> = {
  1: "This is the FIRST cold outreach email. Keep it short, friendly, and curiosity-driven. Focus on introducing the product and a simple CTA.",
  2: "This is a FOLLOW-UP email (sent 3 days after first with no reply). Keep it even shorter. Reference the previous email briefly. Add one new value point.",
  3: "This is a THIRD touch (7 days in). Try a different angle — share a quick customer success story or interesting fact about the product.",
  4: "This is a SAMPLE OFFER email (10 days in). Offer to send a free sample pack. Make it feel generous and low-commitment.",
  5: "This is the FINAL follow-up (17 days in). Keep it very short and friendly. No pressure. Leave the door open for future.",
};

export async function POST(request: NextRequest) {
  const body: EmailRequest = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    // Return a template-based fallback
    return NextResponse.json(getFallback(body));
  }

  const categoryContext = getCategoryContext(body.category);
  const competitorContext =
    body.sellsCompetitorProducts && body.competitorBrands?.length
      ? `This store already carries these competitor yak chew brands: ${body.competitorBrands.join(", ")}. Use this as a hook — they know the category, so focus on why Prime Yak Chews are a better/complementary option (better margins, quality, etc).`
      : "";

  const location = [body.storeCity, body.storeState]
    .filter(Boolean)
    .join(", ");

  const prompt = `Generate a B2B wholesale outreach email for a pet food brand.

BRAND: Prime Pet Food
PRODUCT: Prime Yak Chews — 100% Himalayan yak cheese dog chews
KEY SELLING POINTS:
- Single ingredient, all natural, no preservatives
- Long-lasting (2-3 hours of chew time)
- 60%+ retail margins on wholesale pricing
- High repeat purchase rate
- Instagram-worthy packaging

STORE DETAILS:
- Name: ${body.storeName}
- Location: ${location || "Unknown"}
- Website: ${body.storeWebsite || "N/A"}
- Sells Dog Treats: ${body.sellsDogTreats === true ? "Yes" : body.sellsDogTreats === false ? "No" : "Unknown"}

STORE CATEGORY: ${categoryContext}
${competitorContext}

EMAIL SEQUENCE STEP: ${body.sequenceStep}/5
${SEQUENCE_CONTEXT[body.sequenceStep] || SEQUENCE_CONTEXT[1]}

REQUIREMENTS:
- Subject line: catchy, specific to the store. Under 60 chars.
- Body: 100-150 words MAX. Friendly but professional.
- Include a clear, simple CTA.
- Sign off as "Prime Pet Food Team"
- Do NOT use generic openers like "I hope this email finds you well"
- Make it feel human and personal, not templated

Return JSON with "subject" and "body" fields only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert B2B sales copywriter specializing in pet industry wholesale outreach. Always return valid JSON with 'subject' and 'body' keys.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 500,
    });

    const result = JSON.parse(
      completion.choices[0].message.content || "{}"
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(getFallback(body));
  }
}

function getCategoryContext(category: string): string {
  const map: Record<string, string> = {
    local_pet_store:
      "Local neighborhood pet store. Emphasize community, supporting local brands, and how their customers will love it.",
    boutique:
      "Boutique/upscale pet shop. Emphasize premium positioning, curated selection, and Instagram-worthy packaging.",
    premium_organic:
      "Premium/organic focused store. Emphasize single ingredient, natural, no preservatives, Himalayan origin story.",
    competitor_carrier:
      "Already carries competitor yak chews. They know the category — focus on better margins, quality, and product differentiation.",
    online_store:
      "Online pet store. Emphasize product photos provided, good margins, fast shipping from our warehouse.",
  };
  return map[category] || map.local_pet_store;
}

function getFallback(body: EmailRequest) {
  const location = [body.storeCity, body.storeState]
    .filter(Boolean)
    .join(", ");

  return {
    subject: `Wholesale Partnership — Prime Yak Chews × ${body.storeName}`,
    body: `Hi ${body.storeName} Team,

I'm reaching out from Prime Pet Food${location ? ` — we love what you're doing in ${location}` : ""}!

We make Prime Yak Chews, a premium single-ingredient Himalayan yak cheese dog chew. Here's why our retail partners love carrying them:

• 100% natural — just yak cheese, no additives
• Dogs stay busy 2-3 hours (customers love that!)
• 60%+ margins on wholesale pricing
• Beautiful packaging that looks great on shelves

Would you be open to trying a free sample pack? I'd love to hear what you think.

Best,
Prime Pet Food Team
info@primepetfood.com`,
  };
}
