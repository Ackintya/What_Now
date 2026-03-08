export interface ProfilePayload {
  _id?: string;
  user_id: string;
  skin_type: "dry" | "oily" | "combination" | "sensitive";
  scalp_type: "dry" | "oily" | "balanced" | "sensitive";
  concerns: string[];
  allergies: string[];
  sensitivities: string[];
  preferred_categories?: string[];
}

export interface AnalysisPayload {
  dryness_score?: number;
  oiliness_score?: number;
  acne_like_appearance_score?: number;
  dark_circles_score?: number;
  scalp_dryness_score?: number;
  dandruff_like_flaking_score?: number;
  thinning_appearance_score?: number;
  confidence: number;
  brief_observation: string;
  grounding_line: string;
}

export interface LovedProductPayload {
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
}

export interface CreateLovedProductPayload {
  user_id: string;
  product_name: string;
  brand: string;
  category: string;
  notes?: string;
}

export interface RecommendationPayload {
  _id?: string;
  product_name: string;
  brand: string;
  category: string;
  recommendation_source?: string;
  product_url?: string;
  match_score: number;
  matched_ingredients: string[];
  blocked_ingredients_avoided: string[];
  recommendation_reason: string;
  confidence: string;
  grounding_line: string;
}

export interface WellnessInsightPayload {
  _id?: string;
  insight_type: string;
  message: string;
  related_signals: string[];
  confidence: string;
  grounding_line: string;
}

export interface SummaryPayload {
  profile_ready: boolean;
  loved_products_count: number;
  recommendations_count: number;
  latest_skin_signal: string;
  latest_hair_signal: string;
  latest_insight: string;
}
