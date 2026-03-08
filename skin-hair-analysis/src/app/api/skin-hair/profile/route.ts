export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSkinHairProfile, upsertSkinHairProfile } from "@/modules/skin-hair/repositories";
import { validateProfilePayload } from "@/modules/skin-hair/validators";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const profile = await getSkinHairProfile(userId);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to fetch skin/hair profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const validated = validateProfilePayload(payload);
    const profile = await upsertSkinHairProfile(userId, validated);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to upsert profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to save profile" }, { status: 400 });
  }
}
