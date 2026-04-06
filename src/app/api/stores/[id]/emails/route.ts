import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const emails = await prisma.outreachEmail.findMany({
    where: { storeId: id },
    orderBy: [{ sequenceStep: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(emails);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const email = await prisma.outreachEmail.create({
    data: {
      storeId: id,
      sequenceStep: body.sequenceStep || 1,
      channel: body.channel || "email",
      subject: body.subject,
      body: body.body,
      status: body.status || "draft",
    },
  });

  return NextResponse.json(email, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { emailId } = await request.json();

  if (!emailId) {
    return NextResponse.json({ error: "emailId is required" }, { status: 400 });
  }

  // Verify the email belongs to this store
  const email = await prisma.outreachEmail.findFirst({
    where: { id: emailId, storeId: id },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  await prisma.outreachEmail.delete({ where: { id: emailId } });

  return NextResponse.json({ success: true });
}
