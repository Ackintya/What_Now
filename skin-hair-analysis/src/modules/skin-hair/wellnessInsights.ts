import { WELLNESS_GROUNDING_LINE } from "./constants";
import type { HairLog, SkinLog, WellnessInsight, WellnessSignalRecord } from "./types";

function toDateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceFromDelta(delta: number): "low" | "medium" {
  return Math.abs(delta) >= 10 ? "medium" : "low";
}

function pushInsight(
  insights: Omit<WellnessInsight, "_id" | "user_id">[],
  type: string,
  message: string,
  relatedSignals: string[],
  delta: number,
) {
  insights.push({
    date: new Date(),
    insight_type: type,
    message,
    related_signals: relatedSignals,
    confidence: confidenceFromDelta(delta),
    grounding_line: WELLNESS_GROUNDING_LINE,
  });
}

export function generateWellnessInsights(params: {
  skinLogs: SkinLog[];
  hairLogs: HairLog[];
  wellnessSignals: WellnessSignalRecord[];
}): Omit<WellnessInsight, "_id" | "user_id">[] {
  const { skinLogs, hairLogs, wellnessSignals } = params;

  const skinByDate = new Map<string, SkinLog>();
  const hairByDate = new Map<string, HairLog>();

  skinLogs.forEach((log) => {
    skinByDate.set(toDateKey(log.date), log);
  });

  hairLogs.forEach((log) => {
    hairByDate.set(toDateKey(log.date), log);
  });

  const lowSleepDryness: number[] = [];
  const restedDryness: number[] = [];

  const inconsistentNutritionScalpDryness: number[] = [];
  const steadyNutritionScalpDryness: number[] = [];

  const highFatigueDarkCircles: number[] = [];
  const lowFatigueDarkCircles: number[] = [];

  const lowSupplementThinning: number[] = [];
  const steadySupplementThinning: number[] = [];

  wellnessSignals.forEach((signal) => {
    const skinLog = skinByDate.get(signal.date);
    const hairLog = hairByDate.get(signal.date);

    if (skinLog) {
      if (signal.sleep_duration_hours < 6.5) {
        lowSleepDryness.push(skinLog.dryness_score);
      } else {
        restedDryness.push(skinLog.dryness_score);
      }

      if (signal.workout_fatigue_score >= 70) {
        highFatigueDarkCircles.push(skinLog.dark_circles_score);
      } else {
        lowFatigueDarkCircles.push(skinLog.dark_circles_score);
      }
    }

    if (hairLog) {
      if (signal.nutrition_quality_score < 60 || signal.protein_consistency_score < 60) {
        inconsistentNutritionScalpDryness.push(hairLog.scalp_dryness_score);
      } else {
        steadyNutritionScalpDryness.push(hairLog.scalp_dryness_score);
      }

      if (signal.supplement_consistency_score < 55) {
        lowSupplementThinning.push(hairLog.thinning_appearance_score);
      } else {
        steadySupplementThinning.push(hairLog.thinning_appearance_score);
      }
    }
  });

  const insights: Omit<WellnessInsight, "_id" | "user_id">[] = [];

  const drynessDelta = average(lowSleepDryness) - average(restedDryness);
  if (lowSleepDryness.length > 1 && restedDryness.length > 1 && drynessDelta > 4) {
    pushInsight(
      insights,
      "dryness_vs_sleep",
      "Dryness scores appear higher on low-sleep days.",
      ["sleep_duration_hours", "dryness_score"],
      drynessDelta,
    );
  }

  const scalpDelta = average(inconsistentNutritionScalpDryness) - average(steadyNutritionScalpDryness);
  if (inconsistentNutritionScalpDryness.length > 1 && steadyNutritionScalpDryness.length > 1 && scalpDelta > 4) {
    pushInsight(
      insights,
      "scalp_dryness_vs_nutrition",
      "Scalp dryness appears elevated during weeks with inconsistent nutrition.",
      ["nutrition_quality_score", "protein_consistency_score", "scalp_dryness_score"],
      scalpDelta,
    );
  }

  const darkCircleDelta = average(highFatigueDarkCircles) - average(lowFatigueDarkCircles);
  if (highFatigueDarkCircles.length > 1 && lowFatigueDarkCircles.length > 1 && darkCircleDelta > 4) {
    pushInsight(
      insights,
      "dark_circles_vs_fatigue",
      "Higher workout fatigue weeks may align with elevated under-eye appearance scores.",
      ["workout_fatigue_score", "dark_circles_score"],
      darkCircleDelta,
    );
  }

  const thinningDelta = average(lowSupplementThinning) - average(steadySupplementThinning);
  if (lowSupplementThinning.length > 1 && steadySupplementThinning.length > 1 && thinningDelta > 4) {
    pushInsight(
      insights,
      "thinning_vs_supplement_consistency",
      "Thinning appearance signals seem higher when supplement consistency is low.",
      ["supplement_consistency_score", "thinning_appearance_score"],
      thinningDelta,
    );
  }

  if (insights.length === 0) {
    insights.push({
      date: new Date(),
      insight_type: "insufficient_pattern",
      message: "No strong lifestyle correlation signal yet. Keep logging to build clearer trend cards.",
      related_signals: ["sleep_duration_hours", "nutrition_quality_score", "supplement_consistency_score"],
      confidence: "low",
      grounding_line: WELLNESS_GROUNDING_LINE,
    });
  }

  return insights;
}
