import { GROUNDING_LINES } from "../constants";
import type { GeneratedRecipe, NutritionProfile, WellnessMealInsight } from "../types";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function generateWellnessInsights(params: {
  userId: string;
  profile: Partial<NutritionProfile>;
  recipes: GeneratedRecipe[];
}): WellnessMealInsight[] {
  const now = new Date();
  const insights: WellnessMealInsight[] = [];

  const recipeCount = params.recipes.length;
  const highProteinCount = params.recipes.filter((recipe) =>
    recipe.tags.some((tag) => tag.toLowerCase().includes("high-protein")) ||
    (recipe.protein_focus_level || "").toLowerCase().includes("high"),
  ).length;

  if (recipeCount > 0) {
    insights.push({
      user_id: params.userId,
      date: now,
      insight_type: "recipe_consistency",
      message:
        highProteinCount >= Math.ceil(recipeCount / 2)
          ? "Most of your recent saved recipes are protein-forward, which may help you stay aligned with a high-protein routine."
          : "Your saved recipes are mixed in protein emphasis; adding one more protein-forward option could tighten goal alignment.",
      related_signals: ["saved_recipes", "protein_focus"],
      confidence: "medium",
      grounding_line: GROUNDING_LINES.insights,
    });
  }

  const cuisineSet = unique(params.recipes.map((recipe) => (recipe.cuisine || "unknown").toLowerCase()));
  if (cuisineSet.length > 0) {
    insights.push({
      user_id: params.userId,
      date: now,
      insight_type: "cuisine_variety",
      message:
        cuisineSet.length >= 4
          ? "Your recipe library shows good cuisine variety, which can support long-term meal adherence."
          : "Your recipe library currently leans on a narrow cuisine set; adding one new cuisine can improve variety.",
      related_signals: ["cuisine_diversity", "library_variety"],
      confidence: "medium",
      grounding_line: GROUNDING_LINES.insights,
    });
  }

  if (params.profile.protein_goal_g) {
    insights.push({
      user_id: params.userId,
      date: now,
      insight_type: "protein_goal_alignment",
      message: `You set a protein target of ${params.profile.protein_goal_g}g/day; keep building meals around explicit protein anchors to stay on track.`,
      related_signals: ["profile_goal", "protein_target"],
      confidence: "medium",
      grounding_line: GROUNDING_LINES.nutrition_label,
    });
  }

  if (insights.length === 0) {
    insights.push({
      user_id: params.userId,
      date: now,
      insight_type: "starter_insight",
      message: "Save a few meals and set a nutrition profile so the module can generate stronger goal-fit meal insights.",
      related_signals: ["onboarding", "profile_completeness"],
      confidence: "low",
      grounding_line: GROUNDING_LINES.insights,
    });
  }

  return insights.slice(0, 4);
}
