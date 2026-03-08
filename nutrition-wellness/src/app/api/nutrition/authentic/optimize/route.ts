export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createAuthenticDishRequest,
  getNutritionProfile,
} from "@/modules/nutrition/repositories";
import { optimizeAuthenticDish } from "@/modules/nutrition/services/authenticOptimizer";
import { validateAuthenticOptimizePayload } from "@/modules/nutrition/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validateAuthenticOptimizePayload(payload);

    const profile = await getNutritionProfile(validated.user_id);

    await createAuthenticDishRequest({
      user_id: validated.user_id,
      original_query: validated.query,
      cuisine: validated.cuisine || undefined,
      protein_goal_context: profile?.primary_goal || "general_wellness",
      optimization_preferences: validated.optimization_preferences,
    });

    const optimized = await optimizeAuthenticDish({
      query: validated.query,
      cuisine: validated.cuisine || undefined,
      profile: profile || { user_id: validated.user_id, primary_goal: "general_wellness" },
      optimizationPreferences: validated.optimization_preferences,
    });

    return NextResponse.json({
      success: true,
      optimization: optimized.result,
      generated_with_gemini: optimized.generated_with_gemini,
      model: optimized.model,
    });
  } catch (error) {
    console.error("Failed to optimize authentic dish:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to optimize dish" }, { status: 400 });
  }
}
