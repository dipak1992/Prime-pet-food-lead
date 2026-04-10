// Intent-specific email templates for high-intent B2B leads.
// These are standalone — they do NOT modify the existing email generator.

export interface IntentEmail {
  subject: string;
  body: string;
  type: "A" | "B" | "C";
  label: string;
}

// ─── Distributor Templates ───────────────────────────────────────────────────

export const DISTRIBUTOR_EMAILS: IntentEmail[] = [
  {
    type: "A",
    label: "Curiosity",
    subject: "adding yak chews to your portfolio?",
    body: `Hi [Name],

Quick question — are you currently distributing any Himalayan yak cheese dog chews?

We're Prime Pet Food and we manufacture them in-house. Seeing strong sell-through at the retail level and a few distributors have been asking about territory availability.

Would it make sense to have a quick conversation?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "B",
    label: "Value-Driven",
    subject: "wholesale opportunity — yak chews",
    body: `Hi [Name],

I noticed you distribute pet products and wanted to reach out directly.

We make Himalayan yak cheese dog chews — all-natural, single ingredient, and one of the fastest-growing segments in the natural treat category. Retail margins run 60%+, and the repeat purchase rate is very high.

We're looking to add 2-3 distribution partners in the US this quarter.

Does this fit what you're currently carrying?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "C",
    label: "Ultra-Short",
    subject: "distribution inquiry",
    body: `Hi [Name],

Do you carry or distribute natural dog chews?

We manufacture Himalayan yak cheese chews — wholesale pricing available. Open to a quick conversation about fit?

– [Your Name]
Prime Pet Food`,
  },
];

// ─── Reseller Templates ──────────────────────────────────────────────────────

export const RESELLER_EMAILS: IntentEmail[] = [
  {
    type: "A",
    label: "Curiosity",
    subject: "do you carry yak chews?",
    body: `Hi [Name],

Quick question — do you currently carry or resell Himalayan yak cheese dog chews?

Asking because I saw you're in the pet product space and thought there might be a fit. We wholesale them directly and the margins are strong.

Worth a look?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "B",
    label: "Value-Driven",
    subject: "high-margin dog chew — wholesale",
    body: `Hi [Name],

I'm reaching out from Prime Pet Food. We make Himalayan yak cheese dog chews — all-natural, long-lasting, and a strong performer for resellers.

Since you're already sourcing pet products, I thought this could be a natural add-on. Wholesale pricing available, and we ship fast.

Would you be open to seeing our line sheet?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "C",
    label: "Ultra-Short",
    subject: "wholesale dog chews",
    body: `Hi [Name],

We wholesale Himalayan yak cheese dog chews — natural, high margin, high repeat purchase.

You're already in the pet space. Worth a quick look?

– [Your Name]
Prime Pet Food`,
  },
];

// ─── Faire Retailer Templates ────────────────────────────────────────────────

export const FAIRE_EMAILS: IntentEmail[] = [
  {
    type: "A",
    label: "Curiosity",
    subject: "spotted your store on Faire",
    body: `Hi [Name],

I came across your store while browsing Faire and had a quick question — are you currently carrying any natural dog chews?

We make Himalayan yak cheese dog chews and they do really well in boutique and specialty retail. Just thought there might be a fit given what you carry.

Would you be open to checking out our line?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "B",
    label: "Value-Driven",
    subject: "great fit for your Faire store",
    body: `Hi [Name],

I noticed you carry curated pet products on Faire — nice selection!

We make Prime Yak Chews — Himalayan yak cheese dog chews. They're all-natural, long-lasting, and one of the most requested products in boutique pet retail right now.

They're already on Faire and carry 60%+ margins. Customers reorder regularly.

Does this feel like a fit for your shop?

– [Your Name]
Prime Pet Food`,
  },
  {
    type: "C",
    label: "Ultra-Short",
    subject: "yak chews on Faire",
    body: `Hi [Name],

We sell Himalayan yak cheese dog chews on Faire. All-natural, 60%+ margins, high repeat.

Does this fit what your store carries?

– [Your Name]
Prime Pet Food`,
  },
];

// ─── Adapter function ────────────────────────────────────────────────────────

export function getIntentEmails(
  leadType: "distributor" | "reseller" | "faire_retailer"
): IntentEmail[] {
  switch (leadType) {
    case "distributor":
      return DISTRIBUTOR_EMAILS;
    case "reseller":
      return RESELLER_EMAILS;
    case "faire_retailer":
      return FAIRE_EMAILS;
    default:
      return RESELLER_EMAILS;
  }
}
