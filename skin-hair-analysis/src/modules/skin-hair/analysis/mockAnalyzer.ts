import { ANALYSIS_GROUNDING_LINES } from "../constants";
import type { HairAnalysisResult, SkinAnalysisResult, SkinHairProfile } from "../types";
import { clampScore, sanitizeObservation } from "./safeText";
import type { AppearanceAnalyzer } from "./types";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function ranged(seed: number, min: number, max: number): number {
  const fraction = (Math.sin(seed) + 1) / 2;
  return Math.round(min + fraction * (max - min));
}

export class MockAppearanceAnalyzer implements AppearanceAnalyzer {
  providerName = "mock-analyzer-v1";

  async analyzeSkin(base64Image: string, profile: Partial<SkinHairProfile>): Promise<SkinAnalysisResult> {
    const base = hashString(base64Image.slice(0, 250) + (profile.skin_type || ""));

    const drynessBias = profile.skin_type === "dry" ? 14 : 0;
    const oilBias = profile.skin_type === "oily" ? 14 : 0;

    const drynessScore = clampScore(ranged(base + 1, 25, 68) + drynessBias);
    const oilinessScore = clampScore(ranged(base + 2, 18, 64) + oilBias);
    const acneScore = clampScore(ranged(base + 3, 14, 58));
    const darkCirclesScore = clampScore(ranged(base + 4, 20, 66));
    const confidence = clampScore(ranged(base + 5, 40, 70));

    const observation = sanitizeObservation(
      "Visible pattern suggests possible dryness signal with mild under-eye fatigue appearance.",
      "Possible appearance signal: visible dryness pattern and mild under-eye fatigue appearance.",
    );

    return {
      dryness_score: drynessScore,
      oiliness_score: oilinessScore,
      acne_like_appearance_score: acneScore,
      dark_circles_score: darkCirclesScore,
      confidence,
      brief_observation: observation,
      grounding_line: ANALYSIS_GROUNDING_LINES.skin,
    };
  }

  async analyzeHair(base64Image: string, profile: Partial<SkinHairProfile>): Promise<HairAnalysisResult> {
    const base = hashString(base64Image.slice(0, 250) + (profile.scalp_type || ""));

    const drynessBias = profile.scalp_type === "dry" ? 12 : 0;
    const dandruffBias = profile.concerns?.includes("dandruff") ? 10 : 0;

    const scalpDryness = clampScore(ranged(base + 11, 24, 72) + drynessBias);
    const dandruffScore = clampScore(ranged(base + 12, 15, 60) + dandruffBias);
    const thinningScore = clampScore(ranged(base + 13, 18, 62));
    const confidence = clampScore(ranged(base + 14, 40, 72));

    const observation = sanitizeObservation(
      "Appearance suggests a visible flaking pattern with possible mild thinning signal near the hairline.",
      "Possible appearance signal: visible flaking pattern and mild thinning appearance near the hairline.",
    );

    return {
      scalp_dryness_score: scalpDryness,
      dandruff_like_flaking_score: dandruffScore,
      thinning_appearance_score: thinningScore,
      confidence,
      brief_observation: observation,
      grounding_line: ANALYSIS_GROUNDING_LINES.hair,
    };
  }
}
