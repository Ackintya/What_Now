export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MOCK_INSIGHTS } from "@/modules/nutrition/data/mockRecipeSeeds";
import { listWellnessInsights } from "@/modules/nutrition/repositories";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const insights = await listWellnessInsights(userId);
    if (insights.length === 0) {
      return NextResponse.json({ success: true, insights: MOCK_INSIGHTS.map((insight) => ({ ...insight, user_id: userId })), seeded: true });
    }

    return NextResponse.json({ success: true, insights, seeded: false });
  } catch (error) {
    console.error("Failed to fetch insights, returning seed:", error);
    return NextResponse.json({
      success: true,
      insights: MOCK_INSIGHTS.map((insight) => ({ ...insight, user_id: userId })),
      seeded: true,
      warning: "MongoDB unavailable; returning seed insights",
    });
  }
}
