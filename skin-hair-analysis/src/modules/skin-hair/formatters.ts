import type { HairAnalysisResult, ModuleResultCard, ProductRecommendation, SkinAnalysisResult, WellnessInsight } from "./types";
import { confidenceLabel } from "./analysis/safeText";

export function formatSkinResultCard(result: SkinAnalysisResult): ModuleResultCard {
  return {
    result: `Your recent skin image shows a possible dryness signal (${result.dryness_score}) and under-eye appearance score (${result.dark_circles_score}).`,
    why_it_fits:
      "Visible texture cues appear more aligned with dryness than oiliness in this image, and the signal is reported as an appearance estimate only.",
    confidence: confidenceLabel(result.confidence),
    also_check: result.grounding_line,
  };
}

export function formatHairResultCard(result: HairAnalysisResult): ModuleResultCard {
  return {
    result: `Your scalp image shows a possible dryness signal (${result.scalp_dryness_score}) with flaking appearance score (${result.dandruff_like_flaking_score}).`,
    why_it_fits:
      "The visible scalp pattern appears more consistent with dryness/flaking appearance than oil-dominant appearance in this capture.",
    confidence: confidenceLabel(result.confidence),
    also_check: result.grounding_line,
  };
}

export function formatRecommendationCard(recommendation: ProductRecommendation): ModuleResultCard {
  const matched = recommendation.matched_ingredients.slice(0, 3).join(", ") || "category and sensitivity fit";

  return {
    result: `${recommendation.product_name} is a ${recommendation.category} match score ${recommendation.match_score}.`,
    why_it_fits: `Matched factors: ${matched}. ${recommendation.recommendation_reason}`,
    confidence: recommendation.confidence,
    also_check: recommendation.grounding_line,
  };
}

export function formatWellnessInsightCard(insight: WellnessInsight): ModuleResultCard {
  return {
    result: insight.message,
    why_it_fits: `Observed across signals: ${insight.related_signals.join(", ")}. This is observational, not causal.`,
    confidence: insight.confidence,
    also_check: insight.grounding_line,
  };
}
