import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRelevanceScore } from "@/lib/utils";

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
  } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  // Require at least one contact method
  if (!phone && !email && !website) {
    return NextResponse.json(
      { error: "At least one contact method (phone, email, or website) is required" },
      { status: 400 }
    );
  }

  // Check for duplicate by name + city
  const existing = await prisma.store.findUnique({
    where: { name_city: { name, city: city || null } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A store with this name and ZIP already exists" },
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
  });

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
      source: source || "manual",
    },
  });

  return NextResponse.json(store, { status: 201 });
}
