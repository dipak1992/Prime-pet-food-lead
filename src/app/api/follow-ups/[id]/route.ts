import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH — pause, resume, or cancel a sequence
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  const sequence = await prisma.followUpSequence.findUnique({ where: { id } });
  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  }

  const now = new Date();

  if (action === "pause" && sequence.status === "active") {
    const updated = await prisma.followUpSequence.update({
      where: { id },
      data: { status: "paused", pausedAt: now },
    });
    return NextResponse.json(updated);
  }

  if (action === "resume" && sequence.status === "paused") {
    // Resume with next send 1 day from now
    const nextSendAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const updated = await prisma.followUpSequence.update({
      where: { id },
      data: { status: "active", pausedAt: null, nextSendAt },
    });
    return NextResponse.json(updated);
  }

  if (action === "cancel") {
    const updated = await prisma.followUpSequence.update({
      where: { id },
      data: { status: "cancelled", completedAt: now },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.followUpSequence.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
