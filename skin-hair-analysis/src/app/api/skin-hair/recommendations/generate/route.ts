export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCT_CATALOG, type CatalogProduct } from "@/modules/skin-hair/data/mockProducts";
import { formatRecommendationCard } from "@/modules/skin-hair/formatters";
import { discoverProductsWithGemini } from "@/modules/skin-hair/geminiProductDiscovery";
import { buildProductSearchUrl } from "@/modules/skin-hair/ingredientLookup";
import {
  getSkinHairProfile,
  listLovedProducts,
  replaceRecommendations,
} from "@/modules/skin-hair/repositories";
import { generateRecommendations } from "@/modules/skin-hair/recommendationEngine";

function mergeCatalog(primary: CatalogProduct[], fallback: CatalogProduct[]): CatalogProduct[] {
  const seen = new Set<string>();
  const merged: CatalogProduct[] = [];

  for (const item of [...primary, ...fallback]) {
    const key = `${item.brand.toLowerCase()}::${item.product_name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const [profile, lovedProducts] = await Promise.all([
      getSkinHairProfile(userId),
      listLovedProducts(userId),
    ]);

    let geminiCatalog: CatalogProduct[] = [];
    try {
      geminiCatalog = await discoverProductsWithGemini({
        profile: profile || {},
        lovedProducts,
        maxProducts: 8,
      });
    } catch (error) {
      console.error("Gemini product discovery failed, using fallback catalog only:", error);
    }

    const combinedCatalog = mergeCatalog(
      geminiCatalog,
      MOCK_PRODUCT_CATALOG.map((item) => ({
        ...item,
        source: "NowWhat fallback catalog",
        product_url: item.product_url || buildProductSearchUrl(item.product_name, item.brand),
      })),
    );

    const generated = generateRecommendations({
      userId,
      profile: profile || {},
      lovedProducts,
      catalog: combinedCatalog,
    });

    const saved = await replaceRecommendations(userId, generated);
    const formatted = saved.map((item) => formatRecommendationCard(item));

    return NextResponse.json({
      success: true,
      recommendations: saved,
      formatted_output: formatted,
      note: "Recommendations use Gemini candidate discovery plus deterministic ingredient and sensitivity scoring.",
      catalog_debug: {
        gemini_candidates: geminiCatalog.length,
        total_candidates_scored: combinedCatalog.length,
      },
    });
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
