import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Accepts an array of { name, city } pairs and returns which ones
// already exist in the database — regardless of lead type.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pairs: { name: string; city?: string }[] = body.pairs;

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    // Fetch all existing stores (name + city only — lightweight)
    const existing = await prisma.store.findMany({
      select: { name: true, city: true, leadType: true, pipelineStage: true },
    });

    const existingKeys = new Map<string, { leadType: string | null; pipelineStage: string }>();
    for (const store of existing) {
      const key = `${store.name.toLowerCase().trim()}|${(store.city || "").toLowerCase().trim()}`;
      existingKeys.set(key, {
        leadType: store.leadType,
        pipelineStage: store.pipelineStage,
      });
    }

    const duplicates = pairs
      .map((pair, index) => {
        const key = `${(pair.name || "").toLowerCase().trim()}|${(pair.city || "").toLowerCase().trim()}`;
        const match = existingKeys.get(key);
        if (match) {
          return { index, name: pair.name, city: pair.city, ...match };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Duplicate check failed:", error);
    return NextResponse.json(
      { error: "Duplicate check failed" },
      { status: 500 }
    );
  }
}
