import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/microsoft-graph";

export async function POST(request: NextRequest) {
  try {
    const { emailId } = await request.json();

    if (!emailId) {
      return NextResponse.json({ error: "emailId is required" }, { status: 400 });
    }

    // Fetch the outreach email with store info
    const outreachEmail = await prisma.outreachEmail.findUnique({
      where: { id: emailId },
      include: { store: true },
    });

    if (!outreachEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (outreachEmail.status === "sent" || outreachEmail.status === "replied") {
      return NextResponse.json(
        { error: "Email has already been sent" },
        { status: 400 }
      );
    }

    const recipientEmail = outreachEmail.store.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: `No email address found for store "${outreachEmail.store.name}". Add an email first.` },
        { status: 400 }
      );
    }

    // Send via Microsoft Graph
    await sendEmail({
      to: recipientEmail,
      subject: outreachEmail.subject || `Partnership Inquiry — Prime Pet Food × ${outreachEmail.store.name}`,
      body: outreachEmail.body,
    });

    // Update status and sentAt
    const updated = await prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    // Update store: set contactedAt if first contact, move pipeline stage
    const updateData: Record<string, unknown> = {};
    if (!outreachEmail.store.contactedAt) {
      updateData.contactedAt = new Date();
    }
    if (outreachEmail.store.pipelineStage === "new" || outreachEmail.store.pipelineStage === "researched") {
      updateData.pipelineStage = "contacted";
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.store.update({
        where: { id: outreachEmail.store.id },
        data: updateData,
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        storeId: outreachEmail.store.id,
        type: "email_sent",
        title: `Email sent: Step ${outreachEmail.sequenceStep}`,
        detail: `To: ${recipientEmail} — ${outreachEmail.subject || "No subject"}`,
      },
    });

    return NextResponse.json({
      success: true,
      email: updated,
      sentTo: recipientEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send email:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
