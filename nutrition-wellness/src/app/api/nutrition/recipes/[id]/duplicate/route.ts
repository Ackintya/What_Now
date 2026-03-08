export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSavedRecipe, duplicateRecipe } from "@/modules/nutrition/repositories";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const recipe = await duplicateRecipe(userId, context.params.id);
    let saved = null;
    if (recipe._id) {
      saved = await createSavedRecipe(userId, recipe._id, "Duplicated from existing recipe");
    }

    return NextResponse.json({ success: true, recipe, saved });
  } catch (error) {
    console.error("Failed to duplicate recipe:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to duplicate recipe" }, { status: 400 });
  }
}
