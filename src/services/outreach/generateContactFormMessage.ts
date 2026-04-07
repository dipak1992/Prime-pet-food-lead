// Contact form message generator — for stores without email but with a website contact form
// Does NOT touch the existing email system

interface ContactFormInput {
  storeName: string;
  storeCity?: string | null;
  storeState?: string | null;
  leadType?: string | null;
  sellsDogTreats?: boolean | null;
}

interface ContactFormOutput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const SENDER_EMAIL = "admin@theprimepetfood.com";
const SENDER_NAME = "Dipak — Prime Pet Food";

export function generateContactFormMessage(input: ContactFormInput): ContactFormOutput {
  const { storeName, storeCity, storeState, leadType, sellsDogTreats } = input;
  const location = [storeCity, storeState].filter(Boolean).join(", ");

  let message: string;

  if (leadType === "groomer" || leadType === "daycare") {
    message = `Hi ${storeName} Team,

I'm reaching out from Prime Pet Food. We make Prime Yak Chews — a premium, 100% natural Himalayan yak cheese dog chew.

Many grooming and daycare facilities offer them as:
- A calming chew during grooming sessions
- A treat for dogs during boarding stays
- A retail add-on that customers love

We offer wholesale pricing with 60%+ margins and would love to send you a free sample pack to try.

Would you be open to a quick conversation?

Best regards,
${SENDER_NAME}
${SENDER_EMAIL}`;
  } else if (sellsDogTreats) {
    message = `Hi ${storeName} Team,

I noticed you carry dog treats${location ? ` at your ${location} location` : ""} — great selection!

I'd love to introduce Prime Yak Chews as an addition to your product lineup:
- 100% Himalayan yak cheese — single ingredient, no preservatives
- Long-lasting (2-3 hours of chew time)
- Strong retail margins (60%+)
- High customer repeat purchase rate

I'd be happy to send a complimentary sample pack. Would you be interested?

Best regards,
${SENDER_NAME}
${SENDER_EMAIL}`;
  } else {
    message = `Hi ${storeName} Team,

I'm reaching out from Prime Pet Food${location ? ` — we're connecting with great pet businesses in ${location}` : ""}.

We make Prime Yak Chews, a premium Himalayan yak cheese dog chew that's become a customer favorite:
- 100% natural, single ingredient
- Long-lasting (2-3 hours)
- 60%+ retail margins
- Customers come back for more

Would you be open to a quick chat about wholesale pricing? I'd also be happy to send a free sample pack.

Best regards,
${SENDER_NAME}
${SENDER_EMAIL}`;
  }

  return {
    name: SENDER_NAME,
    email: SENDER_EMAIL,
    subject: `Wholesale Partnership Inquiry — Prime Yak Chews × ${storeName}`,
    message,
  };
}
