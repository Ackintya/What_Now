export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSavedRecipe, getRecipeById, removeSavedRecipe } from "@/modules/nutrition/repositories";
import { trackNutritionActivitySafely } from "@/modules/nutrition/services/insightMemory";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const [saved, recipe] = await Promise.all([
      createSavedRecipe(userId, context.params.id, typeof payload.user_notes === "string" ? payload.user_notes : undefined),
      getRecipeById(context.params.id, userId),
    ]);

    await trackNutritionActivitySafely({
      userId,
      actionType: "recipe_saved",
      data: {
        recipe_id: context.params.id,
        recipe_title: recipe?.title || "",
        source_type: recipe?.source_type || "",
      },
    });

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error("Failed to save recipe:", error);
    return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await removeSavedRecipe(userId, context.params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unsave recipe:", error);
    return NextResponse.json({ error: "Failed to unsave recipe" }, { status: 500 });
  }
}
