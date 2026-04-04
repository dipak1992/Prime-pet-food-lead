import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      website: true,
      email: true,
      phone: true,
      instagram: true,
      facebook: true,
      sellsDogTreats: true,
      sellsCompetitorProducts: true,
      competitorBrands: true,
      relevanceScore: true,
      pipelineStage: true,
      source: true,
      notes: true,
      contactedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build CSV
  const headers = [
    "Name",
    "Address",
    "City",
    "State",
    "ZIP",
    "Website",
    "Email",
    "Phone",
    "Instagram",
    "Facebook",
    "Sells Dog Treats",
    "Sells Competitor Products",
    "Competitor Brands",
    "Relevance Score",
    "Pipeline Stage",
    "Source",
    "Notes",
    "Contacted At",
    "Created At",
  ];

  const rows = stores.map((s: typeof stores[number]) => [
    escapeCsv(s.name),
    escapeCsv(s.address || ""),
    escapeCsv(s.city || ""),
    escapeCsv(s.state || ""),
    s.zip,
    escapeCsv(s.website || ""),
    escapeCsv(s.email || ""),
    escapeCsv(s.phone || ""),
    escapeCsv(s.instagram || ""),
    escapeCsv(s.facebook || ""),
    s.sellsDogTreats === null ? "Unknown" : s.sellsDogTreats ? "Yes" : "No",
    s.sellsCompetitorProducts ? "Yes" : "No",
    escapeCsv(s.competitorBrands.join("; ")),
    s.relevanceScore?.toString() || "",
    s.pipelineStage,
    s.source,
    escapeCsv(s.notes || ""),
    s.contactedAt?.toISOString() || "",
    s.createdAt.toISOString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="prime-pet-leads-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
