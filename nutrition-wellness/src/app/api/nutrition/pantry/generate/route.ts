export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNutritionProfile, replacePantryItems } from "@/modules/nutrition/repositories";
import { trackNutritionActivitySafely } from "@/modules/nutrition/services/insightMemory";
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

    await trackNutritionActivitySafely({
      userId: validated.user_id,
      actionType: "recipe_generated",
      data: {
        source: "pantry_generate",
        workout_context: validated.workout_context || "",
        pantry_ingredient_count: validated.pantry_ingredients.length,
        pantry_preview: validated.pantry_ingredients.slice(0, 10),
        generated_count: generated.meals.length,
        meal_titles: generated.meals.map((meal) => meal.title).slice(0, 8),
        tags: generated.meals.flatMap((meal) => meal.tags || []).slice(0, 20),
      },
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
