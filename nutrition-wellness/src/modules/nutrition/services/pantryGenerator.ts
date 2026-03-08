import { GROUNDING_LINES } from "../constants";
import { MOCK_PANTRY_TEMPLATES } from "../data/mockPantryTemplates";
import { ensureGroundingLine } from "../safeText";
import type { NutritionProfile, PantryMealDraft } from "../types";
import { createGeminiNutritionClient } from "./geminiClient";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function getForbiddenTerms(profile: Partial<NutritionProfile>): string[] {
  return [
    ...(profile.allergies || []),
    ...(profile.restrictions || []),
    ...(profile.disliked_ingredients || []),
  ]
    .map(normalize)
    .filter(Boolean);
}

function filterMealByProfile(meal: PantryMealDraft, profile: Partial<NutritionProfile>): PantryMealDraft {
  const forbidden = getForbiddenTerms(profile);
  if (forbidden.length === 0) {
    return {
      ...meal,
      also_check: ensureGroundingLine(meal.also_check || GROUNDING_LINES.recipe),
    };
  }

  const filteredIngredients = meal.ingredients.filter((ingredient) => {
    const ingredientNorm = normalize(ingredient);
    return !forbidden.some((term) => ingredientNorm.includes(term));
  });

  const filteredMeal = {
    ...meal,
    ingredients: filteredIngredients.length > 0 ? filteredIngredients : meal.ingredients,
    also_check: ensureGroundingLine(meal.also_check || GROUNDING_LINES.recipe),
  };

  return filteredMeal;
}

function buildGenericFallbackMeal(params: {
  pantryIngredients: string[];
  profile: Partial<NutritionProfile>;
  workoutContext?: string;
}): PantryMealDraft {
  const proteinFocus = params.profile.primary_goal === "high_protein" || params.profile.primary_goal === "muscle_gain" ? "high" : "medium";

  return {
    title: "Pantry Protein Stir Bowl",
    description: "A flexible skillet meal built from your available ingredients.",
    cuisine: params.profile.preferred_cuisines?.[0] || "Home-style",
    goal_context: params.workoutContext || "Pantry goal-fit meal",
    ingredients: [
      `${params.pantryIngredients.slice(0, 5).join(", ")}`,
      "1 tsp cooking oil",
      "Salt, pepper, and preferred spices",
      "Optional protein booster: eggs, tofu, lentils, or yogurt",
    ],
    instructions: [
      "Chop and prep pantry ingredients for quick cooking.",
      "Cook aromatics and vegetables/proteins in a skillet.",
      "Season to taste and serve as a bowl or wrap filling.",
    ],
    tags: ["pantry", "goal-fit", "quick"],
    protein_focus_level: proteinFocus,
    generated_with_gemini: false,
    result: "A practical meal option adapted to your current pantry items.",
    why_it_fits: "It keeps prep simple and leaves room for a protein-forward add-on based on your goal.",
    confidence: "medium",
    also_check: GROUNDING_LINES.recipe,
  };
}

function scoreTemplate(templateIngredients: string[], pantry: string[]): number {
  const pantrySet = new Set(pantry.map(normalize));
  return templateIngredients.reduce((score, item) => {
    return pantrySet.has(normalize(item)) ? score + 1 : score;
  }, 0);
}

function goalTag(profile: Partial<NutritionProfile>): string {
  if (profile.primary_goal === "muscle_gain" || profile.primary_goal === "high_protein") {
    return "high-protein";
  }

  if (profile.primary_goal === "fat_loss") {
    return "lighter";
  }

  return "balanced";
}

export async function generatePantryMeals(params: {
  profile: Partial<NutritionProfile>;
  pantryIngredients: string[];
  workoutContext?: string;
  maxResults: number;
}): Promise<{ meals: PantryMealDraft[]; generated_with_gemini: boolean; model?: string }> {
  const geminiClient = createGeminiNutritionClient();

  if (geminiClient) {
    try {
      const meals = await geminiClient.generatePantryMeals({
        profile: params.profile,
        pantryIngredients: params.pantryIngredients,
        workoutContext: params.workoutContext,
        maxResults: params.maxResults,
      });

      if (meals.length > 0) {
        return {
          meals: meals.slice(0, params.maxResults).map((meal) => filterMealByProfile(meal, params.profile)),
          generated_with_gemini: true,
          model: geminiClient.providerName,
        };
      }
    } catch (error) {
      console.error("Gemini pantry generation failed, using fallback templates:", error);
    }
  }

  const fallbackMeals = MOCK_PANTRY_TEMPLATES.map((template) => {
    const score = scoreTemplate(template.required_any, params.pantryIngredients);
    return {
      score,
      meal: {
        ...template.meal,
        tags: [...template.meal.tags, goalTag(params.profile)],
        goal_context: params.workoutContext || template.meal.goal_context,
      },
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, params.maxResults - 1))
    .map((item) => filterMealByProfile(item.meal, params.profile));

  const result = [...fallbackMeals, buildGenericFallbackMeal(params)].slice(0, params.maxResults);

  return {
    meals: result,
    generated_with_gemini: false,
  };
}
