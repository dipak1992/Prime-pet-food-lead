import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRelevanceScore } from "@/lib/utils";
import { calculateLeadScore } from "@/services/scoring/leadScore";
import { FEATURES } from "@/config/features";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const hasTreats = searchParams.get("hasTreats");

    const where: Record<string, unknown> = {};

    if (stage && stage !== "all") {
      where.pipelineStage = stage;
    }
    if (hasTreats === "true") {
      where.sellsDogTreats = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { zip: { contains: search } },
      ];
    }

    const stores = await prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { outreachEmails: true, samples: true },
        },
      },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      address,
      city,
      state,
      zip,
      website,
      email,
      phone,
      instagram,
      facebook,
      notes,
      pipelineStage,
      sellsDogTreats,
      source,
      leadType,
      googleRating,
      googleReviewCount,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate by name + city using findFirst (handles nullable city)
    const existing = await prisma.store.findFirst({
      where: {
        name,
        city: city || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This store already exists in your pipeline" },
        { status: 409 }
      );
    }

    const treatsValue =
      sellsDogTreats === "yes"
        ? true
        : sellsDogTreats === "no"
          ? false
          : null;

    const relevanceScore = calculateRelevanceScore({
      sellsDogTreats: treatsValue,
      sellsCompetitorProducts: false,
      email,
      website,
      googleRating: googleRating || null,
    });

    // Calculate AI lead score if enabled (new layer — does not replace relevanceScore)
    let leadScore: number | null = null;
    let leadTemperature: string | null = null;
    if (FEATURES.ENABLE_LEAD_SCORING) {
      const scoring = calculateLeadScore({
        sellsDogTreats: treatsValue,
        sellsCompetitorProducts: false,
        email,
        phone,
        website,
        leadType: leadType || null,
      });
      leadScore = scoring.score;
      leadTemperature = scoring.temperature;
    }

    const store = await prisma.store.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        website: website || null,
        email: email || null,
        phone: phone || null,
        instagram: instagram?.replace("@", "") || null,
        facebook: facebook || null,
        notes: notes || null,
        pipelineStage: pipelineStage || "new",
        sellsDogTreats: treatsValue,
        relevanceScore,
        leadType: leadType || null,
        leadScore,
        leadTemperature,
        source: source || "manual",
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create store:", message);
    return NextResponse.json(
      { error: `Failed to create store: ${message}` },
      { status: 500 }
    );
  }
}
