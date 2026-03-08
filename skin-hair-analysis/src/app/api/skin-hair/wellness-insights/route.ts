export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listWellnessInsights } from "@/modules/skin-hair/repositories";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const insights = await listWellnessInsights(userId);

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    console.error("Failed to fetch wellness insights:", error);
    return NextResponse.json({ error: "Failed to fetch wellness insights" }, { status: 500 });
  }
}
