import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/microsoft-graph";

// Step delays in days: Step 1 already sent, these are delays AFTER each step
const STEP_DELAYS = [0, 3, 4, 3, 7]; // Step2: +3d, Step3: +4d, Step4: +3d, Step5: +7d

// This endpoint processes all due follow-ups
// Call it via a cron job (e.g., Vercel Cron, or manually)
// GET /api/follow-ups/process
export async function GET() {
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
        // Generate email for current step
        let emailRes;
        try {
          emailRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/api/generate-email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storeName: store.name,
                storeCity: store.city,
                storeState: store.state,
                storeWebsite: store.website,
                category: seq.category,
                sequenceStep: seq.currentStep,
                sellsCompetitorProducts: store.sellsCompetitorProducts,
                competitorBrands: store.competitorBrands,
                sellsDogTreats: store.sellsDogTreats,
              }),
            }
          );
        } catch {
          // If internal fetch fails, use a simple template
          emailRes = null;
        }

        let subject = `Follow-up: Prime Yak Chews × ${store.name}`;
        let body = `Hi ${store.name} Team,\n\nJust following up on my previous message about Prime Yak Chews. Would love to connect!\n\nBest,\nPrime Pet Food Team\nadmin@theprimepetfood.com`;

        if (emailRes && emailRes.ok) {
          const emailData = await emailRes.json();
          if (emailData.subject) subject = emailData.subject;
          if (emailData.body) body = emailData.body;
        }

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
