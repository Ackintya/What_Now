export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNutritionProfile, upsertNutritionProfile } from "@/modules/nutrition/repositories";
import { validateProfilePayload } from "@/modules/nutrition/validators";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const profile = await getNutritionProfile(userId);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to fetch nutrition profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validateProfilePayload(payload);

    const profile = await upsertNutritionProfile(validated.user_id, {
      primary_goal: validated.primary_goal,
      protein_goal_g: validated.protein_goal_g,
      calorie_goal: validated.calorie_goal,
      dietary_preferences: validated.dietary_preferences,
      allergies: validated.allergies,
      restrictions: validated.restrictions,
      preferred_cuisines: validated.preferred_cuisines,
      disliked_ingredients: validated.disliked_ingredients,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to upsert nutrition profile:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to save profile" }, { status: 400 });
  }
}
