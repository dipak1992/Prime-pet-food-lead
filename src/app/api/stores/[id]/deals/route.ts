import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all deals for a store
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deals = await prisma.deal.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deals);
}

// POST create a new deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const deal = await prisma.deal.create({
    data: {
      storeId: id,
      title: body.title || "Wholesale Order",
      value: body.value || 0,
      status: body.status || "open",
      expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : null,
      products: body.products || [],
      notes: body.notes || null,
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      storeId: id,
      type: "deal_created",
      title: `Deal created: ${deal.title}`,
      detail: `Value: $${deal.value}`,
    },
  });

  return NextResponse.json(deal, { status: 201 });
}

// PATCH update a deal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.value !== undefined) data.value = body.value;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.products !== undefined) data.products = body.products;
  if (body.expectedCloseAt !== undefined) {
    data.expectedCloseAt = body.expectedCloseAt ? new Date(body.expectedCloseAt) : null;
  }

  if (body.status) {
    data.status = body.status;
    if (body.status === "won") {
      data.closedAt = new Date();
      // Move store to won stage
      await prisma.store.update({
        where: { id },
        data: { pipelineStage: "won" },
      });
      await prisma.activity.create({
        data: {
          storeId: id,
          type: "deal_won",
          title: `Deal won!`,
          detail: `Value: $${body.value || "N/A"}`,
        },
      });
    } else if (body.status === "lost") {
      data.closedAt = new Date();
      data.lostReason = body.lostReason || null;
      await prisma.activity.create({
        data: {
          storeId: id,
          type: "deal_lost",
          title: `Deal lost`,
          detail: body.lostReason || undefined,
        },
      });
    }
  }

  const deal = await prisma.deal.update({
    where: { id: body.dealId },
    data,
  });

  return NextResponse.json(deal);
}

// DELETE a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { dealId } = await request.json();

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  await prisma.deal.delete({ where: { id: dealId } });

  return NextResponse.json({ success: true });
}
