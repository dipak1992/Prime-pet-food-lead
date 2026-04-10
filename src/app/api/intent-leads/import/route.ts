import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateIntentScore, intentTemperature } from "@/services/scoring/intentScore";
import type { IntentLevel } from "@/services/intentLeads/types";

// Imports a high-intent lead into the main Store pipeline.
// Separate endpoint to keep existing /api/stores completely untouched.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      website,
      email,
      description,
      leadType,
      intentLevel,
    }: {
      name: string;
      website: string;
      email?: string;
      description?: string;
      leadType: string;
      intentLevel: IntentLevel;
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Dedup check by name + website domain
    let domainCheck: string | null = null;
    try {
      domainCheck = new URL(website).hostname.replace(/^www\./, "");
    } catch {
      // ignore invalid URL
    }

    const existing = await prisma.store.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          ...(domainCheck ? [{ website: { contains: domainCheck } }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already in pipeline", storeId: existing.id },
        { status: 409 }
      );
    }

    const score = calculateIntentScore(
      intentLevel,
      !!email,
      !!website
    );
    const temperature = intentTemperature(intentLevel);

    const store = await prisma.store.create({
      data: {
        name,
        website: website || null,
        email: email || null,
        notes: description || null,
        leadType,
        intentLevel,
        leadScore: score,
        leadTemperature: temperature,
        relevanceScore: score,
        source: "bing_search",
        pipelineStage: "new",
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Intent lead import failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
