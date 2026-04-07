import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalDeals,
      wonDeals,
      lostDeals,
      openDeals,
      totalRevenue,
      pipelineCounts,
      recentWins,
      recentLosses,
      conversionByStage,
      activeSequences,
      completedSequences,
      emailStats,
    ] = await Promise.all([
      prisma.deal.count(),
      prisma.deal.count({ where: { status: "won" } }),
      prisma.deal.count({ where: { status: "lost" } }),
      prisma.deal.count({ where: { status: "open" } }),
      prisma.deal.aggregate({
        where: { status: "won" },
        _sum: { value: true },
      }),
      prisma.store.groupBy({
        by: ["pipelineStage"],
        _count: true,
      }),
      prisma.deal.findMany({
        where: { status: "won" },
        take: 5,
        orderBy: { closedAt: "desc" },
        include: { store: { select: { id: true, name: true, city: true, state: true } } },
      }),
      prisma.deal.findMany({
        where: { status: "lost" },
        take: 5,
        orderBy: { closedAt: "desc" },
        include: { store: { select: { id: true, name: true, city: true, state: true } } },
      }),
      prisma.store.groupBy({
        by: ["pipelineStage"],
        _count: true,
      }),
      prisma.followUpSequence.count({ where: { status: "active" } }),
      prisma.followUpSequence.count({ where: { status: "completed" } }),
      prisma.outreachEmail.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    // Calculate conversion rate
    const totalStores = pipelineCounts.reduce(
      (sum: number, s: { _count: number }) => sum + s._count,
      0
    );
    const wonStores = pipelineCounts.find(
      (s: { pipelineStage: string }) => s.pipelineStage === "won"
    )?._count || 0;
    const conversionRate = totalStores > 0 ? ((wonStores / totalStores) * 100).toFixed(1) : "0";

    // Email response rate
    const emailCounts = emailStats.reduce(
      (acc: Record<string, number>, e: { status: string; _count: number }) => {
        acc[e.status] = e._count;
        return acc;
      },
      {}
    );
    const totalSent = (emailCounts["sent"] || 0) + (emailCounts["replied"] || 0) + (emailCounts["no_response"] || 0);
    const replied = emailCounts["replied"] || 0;
    const responseRate = totalSent > 0 ? ((replied / totalSent) * 100).toFixed(1) : "0";

    // Pipeline breakdown
    const pipeline = pipelineCounts.reduce(
      (acc: Record<string, number>, item: { pipelineStage: string; _count: number }) => {
        acc[item.pipelineStage] = item._count;
        return acc;
      },
      {}
    );

    // Lost reasons
    const lostReasons = await prisma.deal.groupBy({
      by: ["lostReason"],
      where: { status: "lost", lostReason: { not: null } },
      _count: true,
      orderBy: { _count: { lostReason: "desc" } },
    });

    return NextResponse.json({
      deals: {
        total: totalDeals,
        won: wonDeals,
        lost: lostDeals,
        open: openDeals,
        totalRevenue: totalRevenue._sum.value ? Number(totalRevenue._sum.value) : 0,
        winRate: (wonDeals + lostDeals) > 0
          ? ((wonDeals / (wonDeals + lostDeals)) * 100).toFixed(1)
          : "0",
      },
      pipeline,
      conversionRate,
      responseRate,
      emailCounts,
      followUps: {
        active: activeSequences,
        completed: completedSequences,
      },
      recentWins,
      recentLosses,
      lostReasons: lostReasons.map((r: { lostReason: string | null; _count: number }) => ({
        reason: r.lostReason,
        count: r._count,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
