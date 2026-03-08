import type { PrimaryGoal } from "./types";

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  return value.trim();
}

function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  return [];
}

function ensureOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

const GOAL_SET: Record<PrimaryGoal, true> = {
  muscle_gain: true,
  fat_loss: true,
  maintenance: true,
  general_wellness: true,
  high_protein: true,
};

export function validateProfilePayload(payload: Record<string, unknown>) {
  const userId = ensureString(payload.user_id, "user_id");
  const goalRaw = ensureString(payload.primary_goal || "general_wellness", "primary_goal") as PrimaryGoal;

  if (!GOAL_SET[goalRaw]) {
    throw new Error("primary_goal is invalid");
  }

  return {
    user_id: userId,
    primary_goal: goalRaw,
    protein_goal_g: ensureOptionalNumber(payload.protein_goal_g),
    calorie_goal: ensureOptionalNumber(payload.calorie_goal),
    dietary_preferences: ensureArray(payload.dietary_preferences),
    allergies: ensureArray(payload.allergies),
    restrictions: ensureArray(payload.restrictions),
    preferred_cuisines: ensureArray(payload.preferred_cuisines),
    disliked_ingredients: ensureArray(payload.disliked_ingredients),
  };
}

export function validatePantryGeneratePayload(payload: Record<string, unknown>) {
  const userId = ensureString(payload.user_id, "user_id");
  const pantryIngredients = ensureArray(payload.pantry_ingredients);

  if (pantryIngredients.length === 0) {
    throw new Error("pantry_ingredients must include at least one ingredient");
  }

  return {
    user_id: userId,
    pantry_ingredients: pantryIngredients,
    workout_context: typeof payload.workout_context === "string" ? payload.workout_context.trim() : "",
    max_results: Math.min(Math.max(Number(payload.max_results) || 3, 1), 6),
  };
}

export function validateAuthenticOptimizePayload(payload: Record<string, unknown>) {
  const userId = ensureString(payload.user_id, "user_id");
  const query = ensureString(payload.query, "query");

  return {
    user_id: userId,
    query,
    cuisine: typeof payload.cuisine === "string" ? payload.cuisine.trim() : "",
    optimization_preferences: ensureArray(payload.optimization_preferences),
  };
}

export function validateRecipePayload(payload: Record<string, unknown>) {
  const userId = ensureString(payload.user_id, "user_id");
  const title = ensureString(payload.title, "title");

  const sourceTypeRaw = ensureString(payload.source_type || "custom", "source_type");
  if (!["generated", "optimized_authentic", "custom"].includes(sourceTypeRaw)) {
    throw new Error("source_type is invalid");
  }

  const ingredients = ensureArray(payload.ingredients);
  const instructions = ensureArray(payload.instructions);

  if (ingredients.length === 0) {
    throw new Error("ingredients must include at least one item");
  }

  if (instructions.length === 0) {
    throw new Error("instructions must include at least one step");
  }

  return {
    user_id: userId,
    title,
    source_type: sourceTypeRaw as "generated" | "optimized_authentic" | "custom",
    cuisine: typeof payload.cuisine === "string" ? payload.cuisine.trim() : undefined,
    goal_context: typeof payload.goal_context === "string" ? payload.goal_context.trim() : undefined,
    ingredients,
    instructions,
    tags: ensureArray(payload.tags),
    protein_focus_level: typeof payload.protein_focus_level === "string" ? payload.protein_focus_level.trim() : undefined,
    generated_with_gemini: Boolean(payload.generated_with_gemini),
    result_summary:
      typeof payload.result_summary === "string" && payload.result_summary.trim().length > 0
        ? payload.result_summary.trim()
        : `${title} is structured as a practical meal-planning option for your current context.`,
    why_it_fits:
      typeof payload.why_it_fits === "string" && payload.why_it_fits.trim().length > 0
        ? payload.why_it_fits.trim()
        : "The ingredients and prep flow were selected to fit your stated nutrition direction.",
    confidence:
      payload.confidence === "low" || payload.confidence === "high"
        ? payload.confidence
        : ("medium" as "low" | "medium" | "high"),
    grounding_line:
      typeof payload.grounding_line === "string" && payload.grounding_line.trim().length > 0
        ? payload.grounding_line.trim()
        : "Also check: the recipe ingredient list and serving sizes before cooking.",
    notes: typeof payload.notes === "string" ? payload.notes.trim() : undefined,
    parent_recipe_id: typeof payload.parent_recipe_id === "string" ? payload.parent_recipe_id.trim() : undefined,
    save: Boolean(payload.save),
    save_note: typeof payload.save_note === "string" ? payload.save_note.trim() : undefined,
  };
}

export function validateModificationPayload(payload: Record<string, unknown>) {
  const userId = ensureString(payload.user_id, "user_id");
  const notes = ensureString(payload.modification_notes, "modification_notes");

  return {
    user_id: userId,
    modification_notes: notes,
    modified_ingredients: ensureArray(payload.modified_ingredients),
    modified_instructions: ensureArray(payload.modified_instructions),
    save_modified_recipe: payload.save_modified_recipe !== false,
  };
}

export function validateInsightGeneratePayload(payload: Record<string, unknown>) {
  return {
    user_id: ensureString(payload.user_id, "user_id"),
  };
}

export function parseCsvInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseMultilineInput(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
