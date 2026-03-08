export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listRecommendations } from "@/modules/skin-hair/repositories";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const recommendations = await listRecommendations(userId);

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
