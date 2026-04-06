import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/microsoft-graph";

export async function POST(request: NextRequest) {
  try {
    const { emailIds } = await request.json();

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: "emailIds array is required" },
        { status: 400 }
      );
    }

    // Fetch all outreach emails with store info
    const emails = await prisma.outreachEmail.findMany({
      where: { id: { in: emailIds } },
      include: { store: true },
    });

    const results: { emailId: string; storeName: string; status: "sent" | "skipped" | "failed"; reason?: string }[] = [];

    for (const outreach of emails) {
      // Skip already sent
      if (outreach.status === "sent" || outreach.status === "replied") {
        results.push({
          emailId: outreach.id,
          storeName: outreach.store.name,
          status: "skipped",
          reason: "Already sent",
        });
        continue;
      }

      // Skip if store has no email
      if (!outreach.store.email) {
        results.push({
          emailId: outreach.id,
          storeName: outreach.store.name,
          status: "skipped",
          reason: "No email address",
        });
        continue;
      }

      try {
        await sendEmail({
          to: outreach.store.email,
          subject: outreach.subject || `Partnership Inquiry — Prime Pet Food × ${outreach.store.name}`,
          body: outreach.body,
        });

        // Update email status
        await prisma.outreachEmail.update({
          where: { id: outreach.id },
          data: { status: "sent", sentAt: new Date() },
        });

        // Update store
        const updateData: Record<string, unknown> = {};
        if (!outreach.store.contactedAt) {
          updateData.contactedAt = new Date();
        }
        if (outreach.store.pipelineStage === "new" || outreach.store.pipelineStage === "researched") {
          updateData.pipelineStage = "contacted";
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.store.update({
            where: { id: outreach.store.id },
            data: updateData,
          });
        }

        results.push({
          emailId: outreach.id,
          storeName: outreach.store.name,
          status: "sent",
        });

        // Small delay to avoid rate limiting (M365 allows ~30/min)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        results.push({
          emailId: outreach.id,
          storeName: outreach.store.name,
          status: "failed",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      summary: { sent, skipped, failed, total: results.length },
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Bulk send failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
