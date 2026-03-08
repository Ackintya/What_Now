export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { finalizeStaleNutritionInsightSessions } from "@/modules/nutrition/services/insightMemory";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.NUTRITION_MEMORY_CRON_SECRET;

  if (!secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret") || "";
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const staleMinutes = Number(payload.stale_minutes);
    const limit = Number(payload.limit);
    const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : undefined;

    const result = await finalizeStaleNutritionInsightSessions({
      staleMinutes: Number.isFinite(staleMinutes) ? staleMinutes : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      userId: userId || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
      note: "Finalized stale nutrition sessions only when meaningful activity existed.",
    });
  } catch (error) {
    console.error("Failed to finalize stale nutrition insight sessions:", error);
    return NextResponse.json({ error: "Failed to finalize sessions" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Nutrition insight memory finalizer ready. Call POST to finalize stale sessions.",
  });
}
