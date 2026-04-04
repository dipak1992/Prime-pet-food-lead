import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRelevanceScore } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      outreachEmails: { orderBy: { createdAt: "desc" } },
      samples: { orderBy: { createdAt: "desc" } },
      wholesaleQuotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json(store);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = [
    "name",
    "address",
    "city",
    "state",
    "zip",
    "website",
    "email",
    "phone",
    "instagram",
    "facebook",
    "preferredChannel",
    "sellsDogTreats",
    "sellsCompetitorProducts",
    "competitorBrands",
    "pipelineStage",
    "lostReason",
    "notes",
    "contactedAt",
    "nextFollowUpAt",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  // If pipeline stage changed to "contacted", set contactedAt
  if (data.pipelineStage === "contacted" && !data.contactedAt) {
    data.contactedAt = new Date();
  }

  // Recalculate relevance score
  const current = await prisma.store.findUnique({ where: { id } });
  if (current) {
    data.relevanceScore = calculateRelevanceScore({
      sellsDogTreats:
        "sellsDogTreats" in data
          ? (data.sellsDogTreats as boolean | null)
          : current.sellsDogTreats,
      sellsCompetitorProducts:
        "sellsCompetitorProducts" in data
          ? (data.sellsCompetitorProducts as boolean)
          : current.sellsCompetitorProducts,
      email: "email" in data ? (data.email as string | null) : current.email,
      website:
        "website" in data
          ? (data.website as string | null)
          : current.website,
      googleRating: current.googleRating
        ? Number(current.googleRating)
        : null,
    });
  }

  const store = await prisma.store.update({
    where: { id },
    data,
  });

  return NextResponse.json(store);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.store.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
