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
  leadType?: string | null;
  sequenceStep: number;
  sellsCompetitorProducts?: boolean;
  competitorBrands?: string[];
  sellsDogTreats?: boolean | null;
}

const FOLLOW_UP_CONTEXT: Record<number, string> = {
  2: "FOLLOW-UP (sent 3 days after first email with no reply). Keep it very short. Reference the previous email briefly. Add one new value point.",
  3: "THIRD TOUCH (7 days in). Try a different angle — share a quick customer success story or interesting fact about the product.",
  4: "SAMPLE OFFER (10 days in). Offer to send a free sample pack. Make it feel generous and low-commitment.",
  5: "FINAL FOLLOW-UP (17 days in). Very short and friendly. No pressure. Leave the door open for future.",
};

const LEAD_TYPE_CONTEXT: Record<string, string> = {
  pet_store: "This is a pet store. Mention shelf product, high margin, and customer demand.",
  groomer: "This is a dog grooming salon. Focus on increasing checkout revenue by adding a retail product customers can buy while picking up their dog.",
  daycare: "This is a pet daycare / boarding facility. Focus on keeping dogs occupied during long stays, reducing stress, and making operations easier for staff.",
  vet: "This is a veterinary clinic. Focus on yak chews being a natural, safer alternative to rawhide — something vets can confidently recommend to pet owners.",
  trainer: "This is a dog trainer. Focus on using yak chews as high-value rewards during training sessions, or recommending them to clients.",
  boutique: "This is a boutique pet shop. Focus on premium positioning — unique, natural product that fits a curated, upscale product selection.",
  grocery: "This is a grocery store with a pet section. Focus on adding a higher-value, differentiated pet product that drives repeat purchases.",
  online_seller: "This is an online pet product seller. Focus on resale opportunity, competitive wholesale pricing, and strong product photography available.",
};

export async function POST(request: NextRequest) {
  const body: EmailRequest = await request.json();

  // Steps 2-5: single follow-up email (existing behavior)
  if (body.sequenceStep > 1) {
    return generateFollowUp(body);
  }

  // Step 1: Generate 3 variants using the new system prompt
  return generateThreeVariants(body);
}

// ─── Step 1: Three cold email variants ─────────────────────────────────────

async function generateThreeVariants(body: EmailRequest) {
  const leadType = body.leadType || "pet_store";
  const leadTypeContext = LEAD_TYPE_CONTEXT[leadType] || LEAD_TYPE_CONTEXT.pet_store;
  const hasDogTreats = body.sellsDogTreats === true;
  const treatsContext = hasDogTreats
    ? "This business already sells dog treats. Acknowledge this and position Prime Yak Chews as an upgrade or complementary addition."
    : "This business does not currently sell dog treats. Position Prime Yak Chews as a new revenue opportunity.";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ variants: getFallbackVariants(body.storeName, leadType, hasDogTreats) });
  }

  const systemPrompt = `You are a B2B cold outreach expert specialized in high reply-rate emails for the pet industry.

Brand: Prime Pet Food
Product: Himalayan Yak Cheese Dog Chews

Core benefits:
- Long-lasting chew (keeps dogs busy 2-3 hours)
- All-natural, single ingredient
- High margin for retailers (60%+)
- Safe alternative to rawhide
- Repeat purchase product

Writing rules (CRITICAL):
- Natural and human (no AI tone)
- Conversational and friendly
- Simple English (6th-8th grade level)
- No corporate language, no long paragraphs (max 2-3 lines each)
- No buzzwords, not salesy
- Under 120 words for A and B; under 60 words for C
- Subject line: 3-6 words, natural, not clickbait

CTA rule: End with a simple low-friction question like:
- "Would you be open to checking it out?"
- "Worth a quick look?"
- "Does this make sense for your shop?"
Do NOT push for a call, ask for a purchase, or sound aggressive.

Signature: Always end body with:
– [Your Name]
Prime Pet Food

Return ONLY valid JSON. No other text.`;

  const userPrompt = `Store Name: ${body.storeName}
Lead Type Context: ${leadTypeContext}
${treatsContext}

Generate exactly 3 cold email variants:

EMAIL A — CURIOSITY: Start the conversation. Make them curious. Very low pressure.
EMAIL B — VALUE-DRIVEN: Show clear business benefit. Focus on revenue/margins/product fit.
EMAIL C — ULTRA-SHORT: Get a quick reply. Under 60 words. Extremely simple and direct.

Return this exact JSON structure:
{
  "variants": [
    { "type": "A", "label": "Curiosity", "subject": "...", "body": "..." },
    { "type": "B", "label": "Value-Driven", "subject": "...", "body": "..." },
    { "type": "C", "label": "Ultra-Short", "subject": "...", "body": "..." }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 1200,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ variants: getFallbackVariants(body.storeName, leadType, hasDogTreats) });
  }
}

// ─── Steps 2-5: Single follow-up email ─────────────────────────────────────

async function generateFollowUp(body: EmailRequest) {
  const context = FOLLOW_UP_CONTEXT[body.sequenceStep] || FOLLOW_UP_CONTEXT[2];
  const location = [body.storeCity, body.storeState].filter(Boolean).join(", ");

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(getSingleFallback(body));
  }

  const prompt = `Generate a B2B wholesale follow-up email for a pet food brand.

BRAND: Prime Pet Food — Himalayan Yak Cheese Dog Chews (all-natural, long-lasting, 60%+ retail margins)

STORE: ${body.storeName}${location ? `, ${location}` : ""}
LEAD TYPE: ${body.leadType || "pet store"}
SELLS DOG TREATS: ${body.sellsDogTreats === true ? "Yes" : body.sellsDogTreats === false ? "No" : "Unknown"}

EMAIL CONTEXT: ${context}

Requirements:
- Subject: short, 3-6 words, natural
- Body: friendly, human, not salesy, under 100 words
- End with a simple low-friction question
- Sign off: – [Your Name] / Prime Pet Food

Return JSON with "subject" and "body" keys only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a B2B sales copywriter. Return valid JSON with 'subject' and 'body' keys.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 500,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(getSingleFallback(body));
  }
}

// ─── Fallbacks ──────────────────────────────────────────────────────────────

function getFallbackVariants(storeName: string, leadType: string, hasDogTreats: boolean) {
  const treatsLine = hasDogTreats
    ? "You already carry treats — this would fit right alongside what you have."
    : "It could be a simple way to add a product customers ask about.";

  const typeHook: Record<string, string> = {
    groomer: "a lot of groomers have been adding it to checkout — customers love picking it up while grabbing their dog.",
    daycare: "it keeps dogs busy during boarding stays, which I know can be a real help.",
    vet: "it's a safer alternative to rawhide that vets often recommend.",
    trainer: "a lot of trainers use it as a high-value reward — dogs go crazy for it.",
    boutique: "it fits perfectly in a curated, natural product lineup.",
    grocery: "it's a higher-margin pet product that drives repeat purchases.",
  };
  const hook = typeHook[leadType] || "customers love it and come back for more.";

  return [
    {
      type: "A",
      label: "Curiosity",
      subject: "quick question",
      body: `Hi ${storeName},

I have a quick question — have you ever carried Himalayan yak cheese chews?

Asking because ${hook}

${treatsLine}

Would you be open to checking it out?

– [Your Name]
Prime Pet Food`,
    },
    {
      type: "B",
      label: "Value-Driven",
      subject: "high-margin dog chew for your shop",
      body: `Hi ${storeName},

I'm reaching out from Prime Pet Food. We make Himalayan yak cheese dog chews — all-natural, long-lasting, and one of the highest-margin treats you can carry (60%+).

${treatsLine}

Dogs love them and customers reorder. Does this make sense for your shop?

– [Your Name]
Prime Pet Food`,
    },
    {
      type: "C",
      label: "Ultra-Short",
      subject: "do you carry this?",
      body: `Hi ${storeName},

Do you carry Himalayan yak cheese dog chews?

We wholesale them — all-natural, high margin, high repeat purchase.

Worth a quick look?

– [Your Name]
Prime Pet Food`,
    },
  ];
}

function getSingleFallback(body: EmailRequest) {
  return {
    subject: `Following up — Prime Yak Chews`,
    body: `Hi ${body.storeName},

Just wanted to follow up on my last note about Prime Yak Chews.

Still think it could be a great fit. Happy to answer any questions or send a sample.

Worth a look?

– [Your Name]
Prime Pet Food`,
  };
}
