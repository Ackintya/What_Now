export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listNutritionInsightMemory } from "@/modules/nutrition/repositories";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 20), 1), 100);
    const insights = await listNutritionInsightMemory(userId, limit);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Failed to fetch nutrition insight memory:", error);
    return NextResponse.json({ error: "Failed to fetch nutrition insight memory" }, { status: 500 });
  }
}
