import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRelevanceScore } from "@/lib/utils";
import { calculateLeadScore } from "@/services/scoring/leadScore";
import { FEATURES } from "@/config/features";

interface CsvRow {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  notes?: string;
  leadType?: string;
  sellsDogTreats?: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: "imported" | "duplicate" | "error";
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: CsvRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 rows per import" },
        { status: 400 }
      );
    }

    // Pre-fetch all existing stores for fast dedup (name+city)
    const existingStores = await prisma.store.findMany({
      select: { name: true, city: true },
    });
    const existingKeys = new Set(
      existingStores.map(
        (s) => `${s.name.toLowerCase().trim()}|${(s.city || "").toLowerCase().trim()}`
      )
    );

    const results: ImportResult[] = [];
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required field
      if (!row.name || !row.name.trim()) {
        results.push({
          row: rowNum,
          name: row.name || "(empty)",
          status: "error",
          error: "Name is required",
        });
        errors++;
        continue;
      }

      const name = row.name.trim();
      const city = row.city?.trim() || null;

      // Dedup check
      const key = `${name.toLowerCase()}|${(city || "").toLowerCase()}`;
      if (existingKeys.has(key)) {
        results.push({
          row: rowNum,
          name,
          status: "duplicate",
        });
        duplicates++;
        continue;
      }

      try {
        const treatsValue =
          row.sellsDogTreats === "yes"
            ? true
            : row.sellsDogTreats === "no"
              ? false
              : null;

        const email = row.email?.trim() || null;
        const phone = row.phone?.trim() || null;
        const website = row.website?.trim() || null;
        const leadType = row.leadType?.trim() || null;

        const relevanceScore = calculateRelevanceScore({
          sellsDogTreats: treatsValue,
          sellsCompetitorProducts: false,
          email,
          website,
        });

        let leadScore: number | null = null;
        let leadTemperature: string | null = null;
        if (FEATURES.ENABLE_LEAD_SCORING) {
          const scoring = calculateLeadScore({
            sellsDogTreats: treatsValue,
            sellsCompetitorProducts: false,
            email,
            phone,
            website,
            leadType,
          });
          leadScore = scoring.score;
          leadTemperature = scoring.temperature;
        }

        await prisma.store.create({
          data: {
            name,
            address: row.address?.trim() || null,
            city,
            state: row.state?.trim() || null,
            zip: row.zip?.trim() || null,
            website,
            email,
            phone,
            instagram: row.instagram?.replace("@", "").trim() || null,
            facebook: row.facebook?.trim() || null,
            notes: row.notes?.trim() || null,
            pipelineStage: "new",
            sellsDogTreats: treatsValue,
            relevanceScore,
            leadType,
            leadScore,
            leadTemperature,
            source: "csv_import",
          },
        });

        // Track in dedup set so rows within the same CSV don't duplicate
        existingKeys.add(key);

        results.push({ row: rowNum, name, status: "imported" });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          row: rowNum,
          name,
          status: "error",
          error: msg.slice(0, 200),
        });
        errors++;
      }
    }

    return NextResponse.json({
      total: rows.length,
      imported,
      duplicates,
      errors,
      results,
    });
  } catch (error) {
    console.error("Bulk import failed:", error);
    return NextResponse.json(
      { error: "Bulk import failed" },
      { status: 500 }
    );
  }
}
