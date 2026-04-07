import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/microsoft-graph";

// Step delays in days: Step 1 already sent, these are delays AFTER each step
const STEP_DELAYS = [0, 3, 4, 3, 7]; // Step2: +3d, Step3: +4d, Step4: +3d, Step5: +7d

function generateFollowUpEmail(storeName: string, location: string, step: number) {
  const templates: Record<number, { subject: string; body: string }> = {
    1: {
      subject: `Wholesale Partnership — Prime Yak Chews × ${storeName}`,
      body: `Hi ${storeName} Team,

I'm reaching out from Prime Pet Food${location ? ` — we're connecting with great pet businesses in ${location}` : ""}.

We make Prime Yak Chews — a premium, single-ingredient Himalayan yak cheese dog chew:
• 100% natural, no preservatives
• Long-lasting (2-3 hours of chew time)
• Strong retail margins (60%+)
• High customer repeat purchase rate

Would you be open to a quick chat about wholesale pricing? I'd also be happy to send a free sample pack.

Best,
Prime Pet Food Team
admin@theprimepetfood.com`,
    },
    2: {
      subject: `Quick follow-up — Prime Yak Chews for ${storeName}`,
      body: `Hi ${storeName} Team,

Just a quick follow-up on my earlier message about Prime Yak Chews. We're a small brand making 100% natural Himalayan yak cheese dog chews, and we'd love to get our product on your shelves.

If you're interested, I can send a free sample pack this week — no obligation.

Let me know!

Best,
Prime Pet Food Team
admin@theprimepetfood.com`,
    },
    3: {
      subject: `Why stores love Prime Yak Chews — ${storeName}`,
      body: `Hi ${storeName} Team,

I wanted to share why independent pet stores have been loving Prime Yak Chews:

1. High margins — 60%+ retail markup
2. Repeat buyers — dogs love them, owners come back
3. Clean label — single ingredient, easy to sell
4. Unique product — stands out from standard treats

Would love to send you samples so you can see for yourself. Can I ship some this week?

Best,
Prime Pet Food Team
admin@theprimepetfood.com`,
    },
    4: {
      subject: `Free sample pack for ${storeName} — Prime Yak Chews`,
      body: `Hi ${storeName} Team,

I'd love to send you a complimentary sample pack of Prime Yak Chews — no strings attached. It includes our best-selling sizes so you can see the quality firsthand.

Just reply with your shipping address and I'll get them out this week!

Best,
Prime Pet Food Team
admin@theprimepetfood.com`,
    },
    5: {
      subject: `Last note — Prime Yak Chews × ${storeName}`,
      body: `Hi ${storeName} Team,

This is my last follow-up — I don't want to be a bother! If Prime Yak Chews aren't the right fit for your store right now, no worries at all.

But if you ever want to explore a wholesale partnership, we're always here. Just reply to this email anytime.

Wishing you all the best!

Best,
Prime Pet Food Team
admin@theprimepetfood.com`,
    },
  };

  return templates[step] || templates[1];
}

// This endpoint processes all due follow-ups
// Called daily by Vercel Cron, or manually from the Deals page
// GET /api/follow-ups/process
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or same-origin
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify either Vercel cron header or CRON_SECRET
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const now = new Date();

    // Find all sequences due for sending
    const dueSequences = await prisma.followUpSequence.findMany({
      where: {
        status: "active",
        nextSendAt: { lte: now },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            state: true,
            website: true,
            sellsCompetitorProducts: true,
            competitorBrands: true,
            sellsDogTreats: true,
            pipelineStage: true,
          },
        },
      },
    });

    const results: { storeId: string; storeName: string; step: number; status: string; error?: string }[] = [];

    for (const seq of dueSequences) {
      const store = seq.store;

      // Skip if store has no email
      if (!store.email) {
        results.push({
          storeId: store.id,
          storeName: store.name,
          step: seq.currentStep,
          status: "skipped",
          error: "No email address",
        });
        continue;
      }

      // Skip if store already won/lost
      if (store.pipelineStage === "won" || store.pipelineStage === "lost") {
        await prisma.followUpSequence.update({
          where: { id: seq.id },
          data: { status: "completed", completedAt: now },
        });
        results.push({
          storeId: store.id,
          storeName: store.name,
          step: seq.currentStep,
          status: "completed",
          error: `Store is ${store.pipelineStage}`,
        });
        continue;
      }

      try {
        // Generate email based on sequence step
        const location = [store.city, store.state].filter(Boolean).join(", ");
        const { subject, body } = generateFollowUpEmail(
          store.name,
          location,
          seq.currentStep,
        );

        // Send email via Microsoft Graph
        await sendEmail({
          to: store.email,
          subject,
          body,
        });

        // Save outreach email record
        await prisma.outreachEmail.create({
          data: {
            storeId: store.id,
            sequenceStep: seq.currentStep,
            subject,
            body,
            status: "sent",
            sentAt: now,
          },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            storeId: store.id,
            type: "follow_up_sent",
            title: `Auto follow-up Step ${seq.currentStep} sent`,
            detail: `To: ${store.email}`,
          },
        });

        // Update sequence
        const isLastStep = seq.currentStep >= seq.totalSteps;
        if (isLastStep) {
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              status: "completed",
              completedAt: now,
              lastSentAt: now,
              currentStep: seq.currentStep,
            },
          });
        } else {
          const nextStep = seq.currentStep + 1;
          const delayDays = STEP_DELAYS[nextStep - 1] || 3;
          const nextSendAt = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000);

          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              currentStep: nextStep,
              lastSentAt: now,
              nextSendAt,
            },
          });
        }

        // Update store contactedAt if first contact
        if (!store.pipelineStage || store.pipelineStage === "new" || store.pipelineStage === "researched") {
          await prisma.store.update({
            where: { id: store.id },
            data: {
              pipelineStage: "contacted",
              contactedAt: store.pipelineStage === "new" ? now : undefined,
            },
          });
        }

        results.push({
          storeId: store.id,
          storeName: store.name,
          step: seq.currentStep,
          status: "sent",
        });

        // Rate limit: 2s between sends
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        results.push({
          storeId: store.id,
          storeName: store.name,
          step: seq.currentStep,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      processed: results.length,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Follow-up processing error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
