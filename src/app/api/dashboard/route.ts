import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
  const [
    totalStores,
    storesByStage,
    hotLeads,
    withEmail,
    withTreats,
    recentStores,
    actionItems,
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.groupBy({
      by: ["pipelineStage"],
      _count: true,
    }),
    prisma.store.count({
      where: { relevanceScore: { gte: 70 } },
    }),
    prisma.store.count({
      where: { email: { not: null } },
    }),
    prisma.store.count({
      where: { sellsDogTreats: true },
    }),
    prisma.store.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        pipelineStage: true,
        relevanceScore: true,
        createdAt: true,
      },
    }),
    // Stores needing follow-up (contacted > 3 days ago, not won/lost)
    prisma.store.findMany({
      where: {
        contactedAt: {
          lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        pipelineStage: {
          notIn: ["won", "lost", "new"],
        },
      },
      take: 10,
      orderBy: { contactedAt: "asc" },
      select: {
        id: true,
        name: true,
        pipelineStage: true,
        contactedAt: true,
        email: true,
        phone: true,
      },
    }),
  ]);

  const pipeline = storesByStage.reduce(
    (acc: Record<string, number>, item: { pipelineStage: string; _count: number }) => {
      acc[item.pipelineStage] = item._count;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    totalStores,
    pipeline,
    hotLeads,
    withEmail,
    withTreats,
    recentStores,
    actionItems,
  });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
