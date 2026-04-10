import { NextRequest, NextResponse } from "next/server";
import { getIntentLeads } from "@/services/intentLeads/intentAggregator";
import type { IntentLeadType } from "@/services/intentLeads/types";
import { FEATURES } from "@/config/features";

export async function GET(request: NextRequest) {
  if (!FEATURES.ENABLE_INTENT_LEADS) {
    return NextResponse.json({ leads: [], disabled: true });
  }

  const { searchParams } = new URL(request.url);
  const typesParam = searchParams.get("types") || "distributor,reseller";
  const types = typesParam.split(",").filter(Boolean) as IntentLeadType[];

  const validTypes: IntentLeadType[] = ["distributor", "reseller"];
  const filteredTypes = types.filter((t) => validTypes.includes(t));

  if (filteredTypes.length === 0) {
    return NextResponse.json({ error: "No valid types specified" }, { status: 400 });
  }

  const hasBingKey = !!process.env.SERPER_API_KEY;

  try {
    const leads = await getIntentLeads(filteredTypes);
    return NextResponse.json({
      leads,
      total: leads.length,
      hasBingKey,
    });
  } catch (error) {
    console.error("Intent leads search failed:", error);
    return NextResponse.json(
      { error: "Search failed", leads: [], hasBingKey },
      { status: 500 }
    );
  }
}
