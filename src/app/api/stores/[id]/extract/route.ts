import { NextRequest, NextResponse } from "next/server";
import {
  extractEmails,
  extractSocialLinks,
  detectDogTreatKeywords,
  detectCompetitorBrands,
} from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  if (!store.website) {
    return NextResponse.json(
      { error: "Store has no website to scan" },
      { status: 400 }
    );
  }

  const results: {
    emails: string[];
    instagram: string | null;
    facebook: string | null;
    sellsDogTreats: boolean;
    treatKeywords: string[];
    competitorBrands: string[];
    pagesScanned: string[];
  } = {
    emails: [],
    instagram: null,
    facebook: null,
    sellsDogTreats: false,
    treatKeywords: [],
    competitorBrands: [],
    pagesScanned: [],
  };

  // Pages to scan
  const baseUrl = store.website.replace(/\/$/, "");
  const pagesToScan = [
    baseUrl,
    `${baseUrl}/contact`,
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
    `${baseUrl}/contact-us`,
  ];

  for (const url of pagesToScan) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; PrimePetLeads/1.0; +https://primepetfood.com)",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const html = await res.text();
      results.pagesScanned.push(url);

      // Extract emails
      const emails = extractEmails(html);
      results.emails.push(...emails);

      // Extract social links
      const social = extractSocialLinks(html);
      if (social.instagram) results.instagram = social.instagram;
      if (social.facebook) results.facebook = social.facebook;

      // Detect dog treat keywords
      const treats = detectDogTreatKeywords(html);
      if (treats.found) {
        results.sellsDogTreats = true;
        results.treatKeywords.push(...treats.keywords);
      }

      // Detect competitor brands
      const competitors = detectCompetitorBrands(html);
      results.competitorBrands.push(...competitors);
    } catch {
      // Skip failed pages
      continue;
    }
  }

  // Deduplicate
  results.emails = [...new Set(results.emails)];
  results.treatKeywords = [...new Set(results.treatKeywords)];
  results.competitorBrands = [...new Set(results.competitorBrands)];

  // Update store
  const updateData: Record<string, unknown> = {};
  if (results.emails.length > 0 && !store.email) {
    updateData.email = results.emails[0];
  }
  if (results.instagram && !store.instagram) {
    updateData.instagram = results.instagram;
  }
  if (results.facebook && !store.facebook) {
    updateData.facebook = results.facebook;
  }
  if (results.sellsDogTreats) {
    updateData.sellsDogTreats = true;
  }
  if (results.competitorBrands.length > 0) {
    updateData.sellsCompetitorProducts = true;
    updateData.competitorBrands = results.competitorBrands;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.store.update({
      where: { id },
      data: updateData,
    });
  }

  return NextResponse.json(results);
}
