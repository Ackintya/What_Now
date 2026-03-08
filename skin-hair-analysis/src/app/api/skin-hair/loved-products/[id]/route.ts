export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { deleteLovedProduct, updateLovedProduct } from "@/modules/skin-hair/repositories";
import { lookupProductIngredients } from "@/modules/skin-hair/ingredientLookup";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const patch: {
      product_name?: string;
      brand?: string;
      category?: string;
      ingredients?: string[];
      notes?: string;
      ingredient_lookup_source?: string;
      ingredient_lookup_match?: string;
      ingredient_lookup_grounding_line?: string;
    } = {
      product_name: payload.product_name ? String(payload.product_name).trim() : undefined,
      brand: payload.brand ? String(payload.brand).trim() : undefined,
      category: payload.category ? String(payload.category).trim().toLowerCase() : undefined,
      ingredients: Array.isArray(payload.ingredients)
        ? [...new Set(payload.ingredients.map((item) => String(item).trim().toLowerCase()).filter(Boolean))]
        : undefined,
      notes: payload.notes === undefined ? undefined : String(payload.notes).trim(),
    };

    if (patch.product_name && patch.brand && !Array.isArray(payload.ingredients)) {
      const lookup = await lookupProductIngredients({
        productName: patch.product_name,
        brand: patch.brand,
      });

      patch.ingredients = lookup.ingredients;
      patch.ingredient_lookup_source = lookup.source;
      patch.ingredient_lookup_match = lookup.matched_product;
      patch.ingredient_lookup_grounding_line = lookup.grounding_line;
    }

    const product = await updateLovedProduct(userId, context.params.id, patch);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Failed to update loved product:", error);
    return NextResponse.json({ error: "Failed to update loved product" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await deleteLovedProduct(userId, context.params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete loved product:", error);
    return NextResponse.json({ error: "Failed to delete loved product" }, { status: 400 });
  }
}
