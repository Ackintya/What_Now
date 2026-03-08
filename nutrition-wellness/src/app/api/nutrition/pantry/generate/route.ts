export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNutritionProfile, replacePantryItems } from "@/modules/nutrition/repositories";
import { generatePantryMeals } from "@/modules/nutrition/services/pantryGenerator";
import { validatePantryGeneratePayload } from "@/modules/nutrition/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validatePantryGeneratePayload(payload);

    const profile = await getNutritionProfile(validated.user_id);

    await replacePantryItems(
      validated.user_id,
      validated.pantry_ingredients.map((item_name) => ({ item_name })),
    );

    const generated = await generatePantryMeals({
      profile: profile || { user_id: validated.user_id, primary_goal: "general_wellness" },
      pantryIngredients: validated.pantry_ingredients,
      workoutContext: validated.workout_context,
      maxResults: validated.max_results,
    });

    return NextResponse.json({
      success: true,
      meals: generated.meals,
      generated_with_gemini: generated.generated_with_gemini,
      model: generated.model,
    });
  } catch (error) {
    console.error("Failed to generate pantry meals:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to generate meals" }, { status: 400 });
  }
}
