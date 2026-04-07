// Instagram DM generator — separate from existing email generator
// Does NOT touch the email system

interface DMInput {
  storeName: string;
  storeCity?: string | null;
  storeState?: string | null;
  leadType?: string | null;
  sellsDogTreats?: boolean | null;
  sequenceStep?: number;
}

interface DMOutput {
  message: string;
  characterCount: number;
}

export function generateInstagramDM(input: DMInput): DMOutput {
  const { storeName, storeCity, storeState, leadType, sellsDogTreats, sequenceStep = 1 } = input;
  const location = [storeCity, storeState].filter(Boolean).join(", ");

  let message: string;

  if (sequenceStep === 1) {
    // Initial outreach — short, friendly, non-salesy
    if (leadType === "groomer") {
      message = `Hey ${storeName}! 👋 Love your grooming work! We make Prime Yak Chews — 100% natural Himalayan yak cheese chews that dogs go crazy for. Great add-on for your grooming clients! Would you be open to trying a free sample? 🐕`;
    } else if (leadType === "vet") {
      message = `Hi ${storeName} team! 👋 We make Prime Yak Chews — single-ingredient, all-natural Himalayan yak cheese dog chews. Vets love them because they're fully digestible with no artificial additives. Would you be interested in carrying them? Happy to send samples! 🐾`;
    } else if (sellsDogTreats) {
      message = `Hey ${storeName}! 👋 Noticed you carry dog treats — awesome! We make Prime Yak Chews, a premium Himalayan yak cheese chew that customers love. 60%+ retail margins and high repeat purchases. Can I send you a free sample pack? 🧀🐕`;
    } else {
      message = `Hey ${storeName}! 👋 ${location ? `Love seeing great pet businesses in ${location}! ` : ""}We make Prime Yak Chews — 100% natural, long-lasting Himalayan yak cheese dog chews. Would you be open to carrying them? Happy to send free samples! 🐾`;
    }
  } else if (sequenceStep === 2) {
    message = `Hey ${storeName}! Just following up — we'd love to send you a free sample pack of our Prime Yak Chews. They're a huge hit with dogs and the margins are great for retailers. Let me know if you're interested! 😊`;
  } else {
    message = `Hi ${storeName}! Last time reaching out — if you ever want to try our Prime Yak Chews (100% yak cheese, dogs love them), just DM us and we'll ship free samples. No pressure at all! 🐕✨`;
  }

  return {
    message,
    characterCount: message.length,
  };
}
