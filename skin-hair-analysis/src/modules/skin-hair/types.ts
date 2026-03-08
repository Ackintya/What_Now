export type SkinType = "dry" | "oily" | "combination" | "sensitive";

export type ScalpType = "dry" | "oily" | "balanced" | "sensitive";

export type SkinHairConcern =
  | "acne"
  | "dryness"
  | "oiliness"
  | "dark circles"
  | "dandruff"
  | "thinning"
  | "irritation";

export interface SkinHairProfile {
  _id?: string;
  user_id: string;
  skin_type: SkinType;
  scalp_type: ScalpType;
  concerns: SkinHairConcern[];
  allergies: string[];
  sensitivities: string[];
  preferred_categories?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SkinLog {
  _id?: string;
  user_id: string;
  analysis_session_id: string;
  date: Date;
  dryness_score: number;
  oiliness_score: number;
  acne_like_appearance_score: number;
  dark_circles_score: number;
  confidence?: number;
  derived_from_image: boolean;
  model_version?: string;
  brief_observation: string;
  grounding_line: string;
}

export interface HairLog {
  _id?: string;
  user_id: string;
  analysis_session_id: string;
  date: Date;
  scalp_dryness_score: number;
  dandruff_like_flaking_score: number;
  thinning_appearance_score: number;
  confidence?: number;
  derived_from_image: boolean;
  model_version?: string;
  brief_observation: string;
  grounding_line: string;
}

export interface LovedProduct {
  _id?: string;
  user_id: string;
  product_name: string;
  brand: string;
  category: string;
  ingredients: string[];
  notes?: string;
  ingredient_lookup_source?: string;
  ingredient_lookup_match?: string;
  ingredient_lookup_grounding_line?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRecommendation {
  _id?: string;
  user_id: string;
  product_name: string;
  brand: string;
  category: string;
  recommendation_source?: string;
  product_url?: string;
  match_score: number;
  matched_ingredients: string[];
  blocked_ingredients_avoided: string[];
  generated_at: Date;
  recommendation_reason: string;
  confidence: "low" | "medium" | "high";
  grounding_line: string;
}

export interface WellnessInsight {
  _id?: string;
  user_id: string;
  date: Date;
  insight_type: string;
  message: string;
  related_signals: string[];
  confidence: "low" | "medium";
  grounding_line: string;
}

export interface SkinAnalysisResult {
  dryness_score: number;
  oiliness_score: number;
  acne_like_appearance_score: number;
  dark_circles_score: number;
  confidence: number;
  brief_observation: string;
  grounding_line: string;
}

export interface HairAnalysisResult {
  scalp_dryness_score: number;
  dandruff_like_flaking_score: number;
  thinning_appearance_score: number;
  confidence: number;
  brief_observation: string;
  grounding_line: string;
}

export interface WellnessSignalRecord {
  date: string;
  sleep_duration_hours: number;
  sleep_quality_score: number;
  workout_fatigue_score: number;
  nutrition_quality_score: number;
  protein_consistency_score: number;
  supplement_consistency_score: number;
}

export interface ModuleResultCard {
  result: string;
  why_it_fits: string;
  confidence: string;
  also_check: string;
}
