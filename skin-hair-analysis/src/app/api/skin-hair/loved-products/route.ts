export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { addLovedProduct, listLovedProducts } from "@/modules/skin-hair/repositories";
import { lookupProductIngredients } from "@/modules/skin-hair/ingredientLookup";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const products = await listLovedProducts(userId);

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Failed to fetch loved products:", error);
    return NextResponse.json({ error: "Failed to fetch loved products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const userId = String(payload.user_id || "").trim();
    const productName = String(payload.product_name || "").trim();
    const brand = String(payload.brand || "").trim();
    const category = String(payload.category || "").trim().toLowerCase();
    const notes = String(payload.notes || "").trim();

    if (!userId || !productName || !brand || !category) {
      return NextResponse.json(
        { error: "user_id, product_name, brand, and category are required" },
        { status: 400 },
      );
    }

    const lookup = await lookupProductIngredients({
      productName,
      brand,
    });

    const product = await addLovedProduct(userId, {
      product_name: productName,
      brand,
      category,
      ingredients: lookup.ingredients,
      notes: notes || undefined,
      ingredient_lookup_source: lookup.source,
      ingredient_lookup_match: lookup.matched_product,
      ingredient_lookup_grounding_line: lookup.grounding_line,
    });

    return NextResponse.json(
      {
        success: true,
        product,
        ingredient_lookup: {
          source: lookup.source,
          matched_product: lookup.matched_product,
          grounding_line: lookup.grounding_line,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add loved product:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to add loved product" }, { status: 500 });
  }
}
