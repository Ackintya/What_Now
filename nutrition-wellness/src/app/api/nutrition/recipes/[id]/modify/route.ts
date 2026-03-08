export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createRecipe,
  createRecipeModification,
  createSavedRecipe,
  getNutritionProfile,
  getRecipeById,
  listRecipeModifications,
} from "@/modules/nutrition/repositories";
import { trackNutritionActivitySafely } from "@/modules/nutrition/services/insightMemory";
import { interpretAndApplyRecipeTweak } from "@/modules/nutrition/services/recipeModification";
import { validateModificationPayload } from "@/modules/nutrition/validators";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const modifications = await listRecipeModifications(userId, context.params.id);
    return NextResponse.json({ success: true, modifications });
  } catch (error) {
    console.error("Failed to fetch recipe modifications:", error);
    return NextResponse.json({ error: "Failed to fetch modifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validateModificationPayload(payload);

    const [recipe, profile] = await Promise.all([
      getRecipeById(context.params.id, validated.user_id),
      getNutritionProfile(validated.user_id),
    ]);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const interpreted =
      validated.modified_ingredients.length > 0 && validated.modified_instructions.length > 0
        ? {
            modified_ingredients: validated.modified_ingredients,
            modified_instructions: validated.modified_instructions,
            result: `Recipe updated: ${validated.modification_notes}`,
            why_it_fits: "The recipe was updated directly based on your submitted modifications.",
            confidence: "medium" as const,
            also_check: "Also check: the recipe ingredient list and serving sizes before cooking.",
          }
        : await interpretAndApplyRecipeTweak({
            recipe,
            tweakRequest: validated.modification_notes,
            profile: profile || { user_id: validated.user_id, primary_goal: "general_wellness" },
          });

    let modifiedRecipe = null;

    if (validated.save_modified_recipe) {
      modifiedRecipe = await createRecipe({
        user_id: validated.user_id,
        title: `${recipe.title} (Modified)`,
        source_type: recipe.source_type,
        cuisine: recipe.cuisine,
        goal_context: recipe.goal_context,
        ingredients: interpreted.modified_ingredients,
        instructions: interpreted.modified_instructions,
        tags: Array.from(new Set([...(recipe.tags || []), "modified"])),
        protein_focus_level: recipe.protein_focus_level,
        generated_with_gemini: false,
        result_summary: interpreted.result,
        why_it_fits: interpreted.why_it_fits,
        confidence: interpreted.confidence,
        grounding_line: interpreted.also_check,
        notes: validated.modification_notes,
        parent_recipe_id: recipe._id,
      });

      if (modifiedRecipe._id) {
        await createSavedRecipe(validated.user_id, modifiedRecipe._id, "Auto-saved modified version");
      }
    }

    const modification = await createRecipeModification({
      recipe_id: context.params.id,
      user_id: validated.user_id,
      modification_notes: validated.modification_notes,
      modified_ingredients: interpreted.modified_ingredients,
      modified_instructions: interpreted.modified_instructions,
      created_recipe_id: modifiedRecipe?._id,
    });

    await trackNutritionActivitySafely({
      userId: validated.user_id,
      actionType: "recipe_modified",
      data: {
        recipe_id: context.params.id,
        recipe_title: recipe.title,
        modification_notes: validated.modification_notes,
        created_modified_recipe_id: modifiedRecipe?._id || "",
      },
    });

    return NextResponse.json({
      success: true,
      modification,
      modified_recipe: modifiedRecipe,
      interpreted,
    });
  } catch (error) {
    console.error("Failed to modify recipe:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to modify recipe" }, { status: 400 });
  }
}
