import { GROUNDING_LINES } from "../constants";
import type { GeneratedRecipe, NutritionProfile } from "../types";
import { createGeminiNutritionClient } from "./geminiClient";

function keywordContains(note: string, text: string): boolean {
  return note.toLowerCase().includes(text.toLowerCase());
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function fallbackModification(params: {
  recipe: GeneratedRecipe;
  tweak: string;
  profile: Partial<NutritionProfile>;
}) {
  const tweak = params.tweak.toLowerCase();
  let ingredients = [...params.recipe.ingredients];
  let instructions = [...params.recipe.instructions];

  if (keywordContains(tweak, "add tofu")) {
    ingredients.push("150g tofu, cubed");
    instructions.push("Pan-sear tofu and fold it into the dish near the final step.");
  }

  if (keywordContains(tweak, "add chicken")) {
    ingredients.push("150g lean chicken breast, diced");
    instructions.push("Cook chicken separately until done, then combine in the final simmer.");
  }

  if (keywordContains(tweak, "add paneer")) {
    ingredients.push("120g paneer cubes");
    instructions.push("Pan-sear paneer and fold into the dish before serving.");
  }

  if (keywordContains(tweak, "less oil") || keywordContains(tweak, "reduce oil")) {
    ingredients = ingredients.map((item) => item.replace(/\b(\d+)\s*tbsp\s*oil\b/i, "1 tbsp oil"));
    instructions.push("Use moderate oil and add a splash of water or broth to avoid sticking.");
  }

  if (keywordContains(tweak, "remove peanuts")) {
    ingredients = ingredients.filter((item) => !item.toLowerCase().includes("peanut"));
  }

  if (keywordContains(tweak, "increase serving")) {
    instructions.push("Scale all ingredients proportionally for your preferred serving size.");
  }

  if (keywordContains(tweak, "vegetarian")) {
    ingredients = ingredients.filter((item) => !item.toLowerCase().includes("chicken") && !item.toLowerCase().includes("fish"));
    if (!ingredients.some((item) => item.toLowerCase().includes("tofu") || item.toLowerCase().includes("paneer"))) {
      ingredients.push("Optional protein substitute: tofu or paneer");
    }
  }

  const dietaryPrefs = (params.profile.dietary_preferences || []).map((item) => item.toLowerCase());
  if (dietaryPrefs.includes("vegan")) {
    ingredients = ingredients.filter((item) => !item.toLowerCase().includes("paneer") && !item.toLowerCase().includes("yogurt"));
  }

  return {
    modified_ingredients: unique(ingredients),
    modified_instructions: unique(instructions),
    result: `Recipe updated for tweak request: ${params.tweak}`,
    why_it_fits: "The edited version keeps the original direction while applying your requested nutrition and ingredient adjustments.",
    confidence: "medium" as const,
    also_check: GROUNDING_LINES.recipe,
  };
}

export async function interpretAndApplyRecipeTweak(params: {
  recipe: GeneratedRecipe;
  tweakRequest: string;
  profile: Partial<NutritionProfile>;
}) {
  const gemini = createGeminiNutritionClient();

  if (gemini) {
    try {
      const interpreted = await gemini.interpretRecipeModification({
        recipeTitle: params.recipe.title,
        ingredients: params.recipe.ingredients,
        instructions: params.recipe.instructions,
        tweakRequest: params.tweakRequest,
        profile: params.profile,
      });

      if (interpreted.modified_ingredients.length > 0 && interpreted.modified_instructions.length > 0) {
        return interpreted;
      }
    } catch (error) {
      console.error("Gemini tweak interpretation failed, using fallback:", error);
    }
  }

  return fallbackModification({
    recipe: params.recipe,
    tweak: params.tweakRequest,
    profile: params.profile,
  });
}
