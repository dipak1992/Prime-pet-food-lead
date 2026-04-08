import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkReplies } from "@/lib/inbox-monitor";

// GET /api/replies/process
// Checks inbox for replies from stores, auto-updates email status
// Called by Vercel Cron or manually from Deals & Analytics page

export async function GET(request: NextRequest) {
  // Auth check for production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get all stores that have been emailed (status = "sent") and have an email address
    const sentEmails = await prisma.outreachEmail.findMany({
      where: { status: "sent" },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true,
            pipelineStage: true,
          },
        },
      },
    });

    // Get unique store emails that we've sent outreach to
    const storeEmailMap = new Map<string, { storeId: string; storeName: string; outreachIds: string[] }>();

    for (const email of sentEmails) {
      if (!email.store.email) continue;
      const storeEmail = email.store.email.toLowerCase();

      if (storeEmailMap.has(storeEmail)) {
        storeEmailMap.get(storeEmail)!.outreachIds.push(email.id);
      } else {
        storeEmailMap.set(storeEmail, {
          storeId: email.store.id,
          storeName: email.store.name,
          outreachIds: [email.id],
        });
      }
    }

    if (storeEmailMap.size === 0) {
      return NextResponse.json({
        message: "No sent emails to check replies for",
        checked: 0,
        repliesFound: 0,
      });
    }

    const senderEmails = Array.from(storeEmailMap.keys());

    // Check inbox in batches (Graph API filter has URL length limits)
    const BATCH_SIZE = 10;
    const allReplies: { from: string; subject: string; receivedAt: string }[] = [];

    for (let i = 0; i < senderEmails.length; i += BATCH_SIZE) {
      const batch = senderEmails.slice(i, i + BATCH_SIZE);
      try {
        const replies = await checkReplies(batch, 3); // Check last 3 days
        allReplies.push(...replies);
      } catch (err) {
        console.error(`Reply check batch error:`, err);
      }
    }

    // Match replies to outreach emails and update
    const results: { storeName: string; storeEmail: string; subject: string; status: string }[] = [];
    const now = new Date();

    for (const reply of allReplies) {
      const storeInfo = storeEmailMap.get(reply.from);
      if (!storeInfo) continue;

      // Check if we already processed this reply (avoid duplicates)
      const alreadyReplied = await prisma.outreachEmail.findFirst({
        where: {
          id: { in: storeInfo.outreachIds },
          status: "replied",
        },
      });

      if (alreadyReplied) {
        results.push({
          storeName: storeInfo.storeName,
          storeEmail: reply.from,
          subject: reply.subject,
          status: "already_tracked",
        });
        continue;
      }

      // Mark the most recent sent email as "replied"
      const mostRecentSent = await prisma.outreachEmail.findFirst({
        where: {
          id: { in: storeInfo.outreachIds },
          status: "sent",
        },
        orderBy: { sentAt: "desc" },
      });

      if (mostRecentSent) {
        await prisma.outreachEmail.update({
          where: { id: mostRecentSent.id },
          data: {
            status: "replied",
            repliedAt: new Date(reply.receivedAt),
          },
        });

        // Pause any active follow-up sequence for this store
        await prisma.followUpSequence.updateMany({
          where: { storeId: storeInfo.storeId, status: "active" },
          data: { status: "paused", pausedAt: now },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            storeId: storeInfo.storeId,
            type: "email_replied",
            title: `Reply received from ${storeInfo.storeName}!`,
            detail: `Subject: ${reply.subject}\nPreview: ${reply.from}`,
          },
        });

        results.push({
          storeName: storeInfo.storeName,
          storeEmail: reply.from,
          subject: reply.subject,
          status: "reply_detected",
        });
      }
    }

    const repliesFound = results.filter((r) => r.status === "reply_detected").length;

    return NextResponse.json({
      checked: senderEmails.length,
      repliesFound,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Reply detection error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
