export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createRecipe, createSavedRecipe, listRecipes } from "@/modules/nutrition/repositories";
import { validateRecipePayload } from "@/modules/nutrition/validators";

function parseTagsParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const recipes = await listRecipes(userId, {
      search: request.nextUrl.searchParams.get("search") || undefined,
      tags: parseTagsParam(request.nextUrl.searchParams.get("tags")),
      cuisine: request.nextUrl.searchParams.get("cuisine") || undefined,
      source_type: (request.nextUrl.searchParams.get("sourceType") as any) || undefined,
      protein_focus_level: request.nextUrl.searchParams.get("proteinFocus") || undefined,
      dietary_type: request.nextUrl.searchParams.get("dietary") || undefined,
    });

    return NextResponse.json({ success: true, recipes });
  } catch (error) {
    console.error("Failed to list recipes:", error);
    return NextResponse.json({ error: "Failed to list recipes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const validated = validateRecipePayload(payload);

    const recipe = await createRecipe({
      user_id: validated.user_id,
      title: validated.title,
      source_type: validated.source_type,
      cuisine: validated.cuisine,
      goal_context: validated.goal_context,
      ingredients: validated.ingredients,
      instructions: validated.instructions,
      tags: validated.tags,
      protein_focus_level: validated.protein_focus_level,
      generated_with_gemini: validated.generated_with_gemini,
      result_summary: validated.result_summary,
      why_it_fits: validated.why_it_fits,
      confidence: validated.confidence,
      grounding_line: validated.grounding_line,
      notes: validated.notes,
      parent_recipe_id: validated.parent_recipe_id,
    });

    let saved = null;
    if (validated.save && recipe._id) {
      saved = await createSavedRecipe(validated.user_id, recipe._id, validated.save_note);
    }

    return NextResponse.json({ success: true, recipe, saved }, { status: 201 });
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to create recipe" }, { status: 400 });
  }
}
