export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  listRecipes,
  getNutritionProfile,
  replaceWellnessInsights,
} from "@/modules/nutrition/repositories";
import { generateWellnessInsights } from "@/modules/nutrition/services/insights";
import { validateInsightGeneratePayload } from "@/modules/nutrition/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validateInsightGeneratePayload(payload);

    const [profile, recipes] = await Promise.all([
      getNutritionProfile(validated.user_id),
      listRecipes(validated.user_id),
    ]);

    const generated = generateWellnessInsights({
      userId: validated.user_id,
      profile: profile || { user_id: validated.user_id, primary_goal: "general_wellness" },
      recipes,
    });

    const saved = await replaceWellnessInsights(validated.user_id, generated);

    return NextResponse.json({ success: true, insights: saved });
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to generate insights" }, { status: 400 });
  }
}
