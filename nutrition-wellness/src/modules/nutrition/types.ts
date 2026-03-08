export type PrimaryGoal = "muscle_gain" | "fat_loss" | "maintenance" | "general_wellness" | "high_protein";

export type SourceType = "generated" | "optimized_authentic" | "custom";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ModuleResultCard {
  result: string;
  why_it_fits: string;
  confidence: ConfidenceLevel;
  also_check: string;
}

export interface NutritionProfile {
  _id?: string;
  user_id: string;
  primary_goal: PrimaryGoal;
  protein_goal_g?: number;
  calorie_goal?: number;
  dietary_preferences: string[];
  allergies: string[];
  restrictions: string[];
  preferred_cuisines: string[];
  disliked_ingredients: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PantryItem {
  _id?: string;
  user_id: string;
  item_name: string;
  quantity?: number;
  unit?: string;
  created_at: Date;
}

export interface GeneratedRecipe {
  _id?: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  cuisine?: string;
  goal_context?: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  protein_focus_level?: string;
  generated_with_gemini: boolean;
  result_summary: string;
  why_it_fits: string;
  confidence: ConfidenceLevel;
  grounding_line: string;
  notes?: string;
  parent_recipe_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeModification {
  _id?: string;
  recipe_id: string;
  user_id: string;
  modification_notes: string;
  modified_ingredients: string[];
  modified_instructions: string[];
  created_recipe_id?: string;
  created_at: Date;
}

export interface SavedRecipe {
  _id?: string;
  user_id: string;
  recipe_id: string;
  saved_at: Date;
  user_notes?: string;
}

export interface AuthenticDishRequest {
  _id?: string;
  user_id: string;
  original_query: string;
  cuisine?: string;
  protein_goal_context?: string;
  optimization_preferences: string[];
  created_at: Date;
}

export interface WellnessMealInsight {
  _id?: string;
  user_id: string;
  date: Date;
  insight_type: string;
  message: string;
  related_signals: string[];
  confidence: ConfidenceLevel;
  grounding_line: string;
}

export interface PantryGenerationInput {
  user_id: string;
  pantry_ingredients: string[];
  workout_context?: string;
  max_results?: number;
}

export interface PantryMealDraft extends ModuleResultCard {
  title: string;
  description: string;
  cuisine?: string;
  goal_context?: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  protein_focus_level?: string;
  generated_with_gemini: boolean;
}

export interface AuthenticBaseline {
  dish_name: string;
  cuisine: string;
  traditional_summary: string;
  core_ingredients: string[];
  baseline_steps: string[];
  source_reference: string;
}

export interface AuthenticOptimizationResult {
  baseline: AuthenticBaseline;
  optimized_recipe: PantryMealDraft;
  change_summary: string[];
}

export interface RecipeLibraryEntry {
  recipe: GeneratedRecipe;
  saved: SavedRecipe | null;
  modification_count: number;
}

export interface RecipeFilters {
  search?: string;
  tags?: string[];
  cuisine?: string;
  source_type?: SourceType;
  protein_focus_level?: string;
  dietary_type?: string;
  only_saved?: boolean;
}

export interface SummaryPayload {
  active_goal: string;
  saved_recipe_count: number;
  latest_recipe_title: string;
  latest_insight_message: string;
}
