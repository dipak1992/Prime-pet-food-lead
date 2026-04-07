import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all activities for a store
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const activities = await prisma.activity.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(activities);
}

// POST a new activity (also used internally by other endpoints)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const activity = await prisma.activity.create({
    data: {
      storeId: id,
      type: body.type,
      title: body.title,
      detail: body.detail || null,
      metadata: body.metadata || null,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
