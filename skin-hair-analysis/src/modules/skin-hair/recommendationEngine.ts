import { RECOMMENDATION_GROUNDING_LINE } from "./constants";
import type { LovedProduct, ProductRecommendation, SkinHairProfile } from "./types";
import type { CatalogProduct } from "./data/mockProducts";

function normalizeIngredient(ingredient: string): string {
  return ingredient.toLowerCase().trim();
}

function concernCategoryAffinity(concerns: string[]): string[] {
  const map: Record<string, string[]> = {
    acne: ["cleanser", "serum", "moisturizer"],
    dryness: ["moisturizer", "serum", "conditioner", "scalp serum"],
    oiliness: ["cleanser", "serum", "shampoo"],
    "dark circles": ["serum", "moisturizer"],
    dandruff: ["shampoo", "scalp serum"],
    thinning: ["scalp serum", "conditioner", "shampoo"],
    irritation: ["cleanser", "moisturizer", "shampoo"],
  };

  return concerns.flatMap((concern) => map[concern] || []);
}

function deriveFingerprint(lovedProducts: LovedProduct[]) {
  const ingredientFrequency = new Map<string, number>();

  for (const product of lovedProducts) {
    for (const ingredient of product.ingredients) {
      const normalized = normalizeIngredient(ingredient);
      if (!normalized) {
        continue;
      }
      ingredientFrequency.set(normalized, (ingredientFrequency.get(normalized) || 0) + 1);
    }
  }

  const sorted = [...ingredientFrequency.entries()].sort((a, b) => b[1] - a[1]);
  const preferred = sorted
    .filter(([, count]) => count >= 2)
    .map(([ingredient]) => ingredient);

  const fallbackTop = sorted.slice(0, 8).map(([ingredient]) => ingredient);

  return {
    ingredientFrequency,
    preferredIngredients: preferred.length > 0 ? preferred : fallbackTop,
  };
}

function confidenceFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 75) {
    return "high";
  }
  if (score >= 50) {
    return "medium";
  }
  return "low";
}

function buildReason(
  matchedIngredients: string[],
  category: string,
  blockedAvoided: string[],
  concerns: string[],
): string {
  const topMatched = matchedIngredients.slice(0, 3);
  const concernText = concerns.length > 0 ? concerns.slice(0, 2).join(" and ") : "your visible pattern goals";

  if (topMatched.length === 0) {
    return `Category fit for ${category} and avoids listed sensitivities, which may align with ${concernText}.`;
  }

  const avoidedText = blockedAvoided.length > 0 ? ` avoids ${blockedAvoided.slice(0, 2).join(" and")}` : " keeps to your listed sensitivities";
  return `Matched ingredients (${topMatched.join(", ")}) overlap with products you already tolerate and${avoidedText}.`;
}

export function generateRecommendations(params: {
  userId: string;
  profile: Partial<SkinHairProfile>;
  lovedProducts: LovedProduct[];
  catalog: CatalogProduct[];
}): Omit<ProductRecommendation, "_id" | "user_id">[] {
  const { profile, lovedProducts, catalog } = params;
  const concerns = profile.concerns || [];
  const preferredCategories = new Set([...(profile.preferred_categories || []), ...concernCategoryAffinity(concerns)]);

  const blockedIngredients = new Set(
    [...(profile.allergies || []), ...(profile.sensitivities || [])]
      .map(normalizeIngredient)
      .filter(Boolean),
  );

  const { preferredIngredients } = deriveFingerprint(lovedProducts);
  const lovedIngredientSet = new Set(
    lovedProducts.flatMap((product) => product.ingredients.map((ingredient) => normalizeIngredient(ingredient))),
  );

  const recommendations: Omit<ProductRecommendation, "_id" | "user_id">[] = [];

  for (const candidate of catalog) {
    const normalizedIngredients = candidate.ingredients.map(normalizeIngredient);

    const blockedPresent = normalizedIngredients.filter((ingredient) => blockedIngredients.has(ingredient));
    if (blockedPresent.length > 0) {
      continue;
    }

    const matchedIngredients = normalizedIngredients.filter(
      (ingredient) => lovedIngredientSet.has(ingredient) || preferredIngredients.includes(ingredient),
    );

    const overlapScore = Math.min(50, matchedIngredients.length * 10);
    const categoryScore = preferredCategories.has(candidate.category) ? 20 : 8;
    const concernScore = candidate.tags.some((tag) => concerns.some((concern) => tag.toLowerCase().includes(concern))) ? 15 : 5;
    const sizePenalty = normalizedIngredients.length > 14 ? -5 : 0;

    const matchScore = Math.max(0, Math.min(100, overlapScore + categoryScore + concernScore + sizePenalty));

    if (matchScore < 25) {
      continue;
    }

    const blockedAvoided = [...blockedIngredients].filter((ingredient) => !normalizedIngredients.includes(ingredient));

    recommendations.push({
      product_name: candidate.product_name,
      brand: candidate.brand,
      category: candidate.category,
      recommendation_source: candidate.source || "Deterministic catalog",
      product_url: candidate.product_url,
      match_score: matchScore,
      matched_ingredients: matchedIngredients,
      blocked_ingredients_avoided: blockedAvoided.slice(0, 6),
      generated_at: new Date(),
      recommendation_reason: buildReason(matchedIngredients, candidate.category, blockedAvoided, concerns),
      confidence: confidenceFromScore(matchScore),
      grounding_line: RECOMMENDATION_GROUNDING_LINE,
    });
  }

  return recommendations.sort((a, b) => b.match_score - a.match_score).slice(0, 8);
}
