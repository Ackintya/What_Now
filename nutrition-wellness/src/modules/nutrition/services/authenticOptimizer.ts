import { GROUNDING_LINES } from "../constants";
import { ScraperReadyAuthenticSource } from "../authentic/source";
import type { AuthenticOptimizationResult, NutritionProfile, PantryMealDraft } from "../types";
import { createGeminiNutritionClient } from "./geminiClient";

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function inferProteinAdditions(profile: Partial<NutritionProfile>): string[] {
  const prefs = (profile.dietary_preferences || []).map((item) => item.toLowerCase());

  if (prefs.includes("vegan")) {
    return ["tofu", "edamame", "lentils"];
  }

  if (prefs.includes("vegetarian")) {
    return ["paneer", "tofu", "greek yogurt", "lentils"];
  }

  if (prefs.includes("pescatarian")) {
    return ["eggs", "shrimp", "fish", "greek yogurt"];
  }

  return ["lean chicken", "eggs", "greek yogurt", "tofu"];
}

function includeLowerOilHint(query: string, preferences: string[]) {
  const haystack = `${query} ${preferences.join(" ")}`.toLowerCase();
  return haystack.includes("less oil") || haystack.includes("lighter") || haystack.includes("reduce oil");
}

function fallbackOptimize(params: {
  query: string;
  baseline: {
    dish_name: string;
    cuisine: string;
    traditional_summary: string;
    core_ingredients: string[];
    baseline_steps: string[];
    source_reference: string;
  };
  profile: Partial<NutritionProfile>;
  optimizationPreferences: string[];
}): AuthenticOptimizationResult {
  const proteinAdds = inferProteinAdditions(params.profile);
  const lessOil = includeLowerOilHint(params.query, params.optimizationPreferences);

  const ingredients = unique([
    ...params.baseline.core_ingredients,
    `Optional protein addition: ${proteinAdds.slice(0, 2).join(" or ")}`,
    lessOil ? "Use moderate oil and rely more on broth/water where appropriate" : "Adjust oil based on texture preference",
  ]);

  const instructions = [
    ...params.baseline.baseline_steps,
    `Fold in ${proteinAdds[0]} during the last stage to increase protein while preserving core flavors.`,
    lessOil
      ? "Use moderate oil and emphasize roasting/simmering to keep authentic character with a lighter finish."
      : "Keep the original sauce and spice profile so dish identity stays recognizable.",
  ];

  const optimizedMeal: PantryMealDraft = {
    title: `${params.baseline.dish_name} - Protein-Forward Traditional Style`,
    description: `A more balanced ${params.baseline.dish_name} that keeps the original flavor direction recognizable.`,
    cuisine: params.baseline.cuisine,
    goal_context: params.profile.primary_goal || "general_wellness",
    ingredients,
    instructions,
    tags: ["authentic-optimized", "protein-forward", params.baseline.cuisine.toLowerCase()],
    protein_focus_level: "medium-high",
    generated_with_gemini: false,
    result: `This is a protein-forward version of ${params.baseline.dish_name} that keeps the core identity of the dish intact.`,
    why_it_fits:
      "The update keeps core ingredients and flavor profile while adding practical protein options and optional lighter cooking adjustments.",
    confidence: "medium",
    also_check: GROUNDING_LINES.authentic,
  };

  const changeSummary = [
    `Added optional protein-rich component (${proteinAdds[0]}).`,
    lessOil ? "Moderated oil use without changing core dish structure." : "Kept traditional fat/cooking approach within a balanced range.",
    "Preserved base aromatics, seasoning, and serving style to keep authenticity cues.",
  ];

  return {
    baseline: params.baseline,
    optimized_recipe: optimizedMeal,
    change_summary: changeSummary,
  };
}

export async function optimizeAuthenticDish(params: {
  query: string;
  cuisine?: string;
  profile: Partial<NutritionProfile>;
  optimizationPreferences: string[];
}): Promise<{ result: AuthenticOptimizationResult; generated_with_gemini: boolean; model?: string }> {
  const source = new ScraperReadyAuthenticSource();
  const baseline = await source.search(params.query, params.cuisine);

  if (!baseline) {
    throw new Error("Unable to find a baseline authentic dish for this request");
  }

  const gemini = createGeminiNutritionClient();

  if (gemini) {
    try {
      const optimized = await gemini.optimizeAuthenticDish({
        query: params.query,
        profile: params.profile,
        baseline,
        optimizationPreferences: params.optimizationPreferences,
      });

      return {
        result: {
          baseline,
          optimized_recipe: {
            ...optimized.optimized_recipe,
            tags: unique(["authentic-optimized", ...(optimized.optimized_recipe.tags || [])]),
          },
          change_summary: optimized.change_summary,
        },
        generated_with_gemini: true,
        model: gemini.providerName,
      };
    } catch (error) {
      console.error("Gemini authentic optimization failed, using fallback:", error);
    }
  }

  return {
    result: fallbackOptimize({
      query: params.query,
      baseline,
      profile: params.profile,
      optimizationPreferences: params.optimizationPreferences,
    }),
    generated_with_gemini: false,
  };
}
