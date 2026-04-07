import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all active follow-up sequences
export async function GET() {
  try {
    const sequences = await prisma.followUpSequence.findMany({
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            state: true,
            pipelineStage: true,
          },
        },
      },
      orderBy: { nextSendAt: "asc" },
    });

    return NextResponse.json(sequences);
  } catch (error) {
    console.error("Failed to fetch follow-ups:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

// POST — start a follow-up sequence for a store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, category, delayDays } = body;

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    // Check if an active sequence already exists
    const existing = await prisma.followUpSequence.findFirst({
      where: { storeId, status: "active" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This store already has an active follow-up sequence" },
        { status: 409 }
      );
    }

    // Schedule first follow-up
    const firstDelay = delayDays || 3; // Default: 3 days from now
    const nextSendAt = new Date(Date.now() + firstDelay * 24 * 60 * 60 * 1000);

    const sequence = await prisma.followUpSequence.create({
      data: {
        storeId,
        category: category || "local_pet_store",
        currentStep: 1,
        totalSteps: 5,
        nextSendAt,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        storeId,
        type: "follow_up_scheduled",
        title: "Auto follow-up sequence started",
        detail: `5-step sequence, first email in ${firstDelay} days`,
      },
    });

    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create follow-up:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
