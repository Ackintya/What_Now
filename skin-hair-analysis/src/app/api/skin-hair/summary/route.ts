export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSkinHairSummary } from "@/modules/skin-hair/summary";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const summary = await getSkinHairSummary(userId);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Failed to fetch summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
