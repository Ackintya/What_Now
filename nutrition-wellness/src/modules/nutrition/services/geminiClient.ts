import { GoogleGenerativeAI } from "@google/generative-ai";
import { GROUNDING_LINES } from "../constants";
import { ensureGroundingLine, enforceWellnessTone } from "../safeText";
import type {
  AuthenticBaseline,
  ConfidenceLevel,
  NutritionProfile,
  NutritionSessionActivityEvent,
  PantryMealDraft,
} from "../types";

const STRICT_NO_HALLUCINATION_RULES = `
STRICT ANTI-HALLUCINATION RULES:
- Do not hallucinate.
- Use only the user inputs and context provided in this prompt.
- If information is missing or uncertain, state uncertainty briefly instead of inventing details.
- Do not fabricate nutrition certainty, ingredient facts, or cultural claims.
- Keep output valid JSON matching the requested schema.
`;

function parseJsonBlock(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    return JSON.parse(fenced[1]) as Record<string, unknown>;
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  }

  throw new Error("Gemini response did not contain JSON");
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

function cleanConfidence(value: unknown): ConfidenceLevel {
  const raw = String(value || "").toLowerCase();
  if (raw === "low" || raw === "high") {
    return raw;
  }

  return "medium";
}

function profileContext(profile: Partial<NutritionProfile>) {
  return [
    `primary_goal: ${profile.primary_goal || "general_wellness"}`,
    `protein_goal_g: ${profile.protein_goal_g || "unspecified"}`,
    `calorie_goal: ${profile.calorie_goal || "unspecified"}`,
    `dietary_preferences: ${profile.dietary_preferences?.join(", ") || "none"}`,
    `allergies: ${profile.allergies?.join(", ") || "none"}`,
    `restrictions: ${profile.restrictions?.join(", ") || "none"}`,
    `preferred_cuisines: ${profile.preferred_cuisines?.join(", ") || "none"}`,
    `disliked_ingredients: ${profile.disliked_ingredients?.join(", ") || "none"}`,
  ].join("\n");
}

function normalizeMeal(payload: Record<string, unknown>): PantryMealDraft {
  return {
    title: String(payload.title || "Pantry-friendly high-protein meal"),
    description: enforceWellnessTone(String(payload.description || "Practical meal generated from pantry context.")),
    cuisine: typeof payload.cuisine === "string" ? payload.cuisine : undefined,
    goal_context: typeof payload.goal_context === "string" ? payload.goal_context : undefined,
    ingredients: cleanArray(payload.ingredients),
    instructions: cleanArray(payload.instructions),
    tags: cleanArray(payload.tags),
    protein_focus_level: typeof payload.protein_focus_level === "string" ? payload.protein_focus_level : "medium",
    generated_with_gemini: true,
    result: enforceWellnessTone(String(payload.result || "A protein-forward meal suggestion based on your pantry and goal context.")),
    why_it_fits: enforceWellnessTone(
      String(payload.why_it_fits || "The recipe aligns with your preferences, available ingredients, and current nutrition direction."),
    ),
    confidence: cleanConfidence(payload.confidence),
    also_check: ensureGroundingLine(String(payload.also_check || GROUNDING_LINES.recipe)),
  };
}

function normalizeInsightText(raw: unknown): string {
  const text = enforceWellnessTone(String(raw || "").trim())
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ");

  if (!text) {
    return "";
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return "";
  }

  return sentences.slice(0, 4).join(" ");
}

export class GeminiNutritionClient {
  providerName = "gemini-fallback";

  private readonly genAI;
  private readonly modelCandidates = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async generateJson(prompt: string): Promise<Record<string, unknown>> {
    let lastError: unknown = null;
    const strictPrompt = `${STRICT_NO_HALLUCINATION_RULES}\n${prompt}`;

    for (const modelName of this.modelCandidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(strictPrompt);
        this.providerName = modelName;
        return parseJsonBlock(result.response.text());
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No Gemini model candidate succeeded");
  }

  async generatePantryMeals(params: {
    profile: Partial<NutritionProfile>;
    pantryIngredients: string[];
    workoutContext?: string;
    maxResults: number;
  }): Promise<PantryMealDraft[]> {
    const prompt = `
You are a nutrition wellness meal planner. Do not provide medical diagnosis or treatment claims.
Generate ${params.maxResults} practical meal suggestions from pantry ingredients.
Use realistic meal ideas only.
Use this output JSON schema:
{
  "meals": [
    {
      "title": "string",
      "description": "string",
      "cuisine": "string",
      "goal_context": "string",
      "ingredients": ["string"],
      "instructions": ["string"],
      "tags": ["string"],
      "protein_focus_level": "low|medium|medium-high|high",
      "result": "Main result sentence",
      "why_it_fits": "Why this fits sentence",
      "confidence": "low|medium|high",
      "also_check": "Also check: ..."
    }
  ]
}
Rules:
- No medical diagnosis language.
- Keep recipes practical and cookable.
- Must respect preferences/restrictions.
- Keep grounding line concise and natural.
- STRICT: do not hallucinate. If uncertain, say uncertainty briefly and avoid invented specifics.

User profile:
${profileContext(params.profile)}

Pantry ingredients: ${params.pantryIngredients.join(", ")}
Workout context: ${params.workoutContext || "not provided"}
`;

    const parsed = await this.generateJson(prompt);
    const mealsRaw = Array.isArray(parsed.meals) ? parsed.meals : [];

    return mealsRaw
      .slice(0, params.maxResults)
      .map((item) => normalizeMeal((item || {}) as Record<string, unknown>))
      .filter((item) => item.ingredients.length > 0 && item.instructions.length > 0);
  }

  async optimizeAuthenticDish(params: {
    query: string;
    profile: Partial<NutritionProfile>;
    baseline: AuthenticBaseline;
    optimizationPreferences: string[];
  }): Promise<{ optimized_recipe: PantryMealDraft; change_summary: string[] }> {
    const prompt = `
You are a culturally aware recipe optimizer.
Optimize an authentic dish while preserving dish identity. Do not turn it into an unrelated meal.
No medical advice.
- STRICT: do not hallucinate. If uncertain, avoid invented authenticity claims.

Return strict JSON:
{
  "optimized_recipe": {
    "title": "string",
    "description": "string",
    "cuisine": "string",
    "goal_context": "string",
    "ingredients": ["string"],
    "instructions": ["string"],
    "tags": ["string"],
    "protein_focus_level": "low|medium|medium-high|high",
    "result": "Main result sentence",
    "why_it_fits": "Why it fits or what changed",
    "confidence": "low|medium|high",
    "also_check": "Also check: ..."
  },
  "change_summary": ["string"]
}

User query: ${params.query}
Optimization preferences: ${params.optimizationPreferences.join(", ") || "none"}
User profile:
${profileContext(params.profile)}

Traditional baseline:
Dish: ${params.baseline.dish_name}
Cuisine: ${params.baseline.cuisine}
Traditional summary: ${params.baseline.traditional_summary}
Core ingredients: ${params.baseline.core_ingredients.join(", ")}
Baseline steps: ${params.baseline.baseline_steps.join(" | ")}
Reference note: ${params.baseline.source_reference}
`;

    const parsed = await this.generateJson(prompt);
    const optimizedRaw = (parsed.optimized_recipe || {}) as Record<string, unknown>;
    const changeSummary = cleanArray(parsed.change_summary);

    return {
      optimized_recipe: normalizeMeal(optimizedRaw),
      change_summary: changeSummary,
    };
  }

  async interpretRecipeModification(params: {
    recipeTitle: string;
    ingredients: string[];
    instructions: string[];
    tweakRequest: string;
    profile: Partial<NutritionProfile>;
  }): Promise<{
    modified_ingredients: string[];
    modified_instructions: string[];
    result: string;
    why_it_fits: string;
    confidence: ConfidenceLevel;
    also_check: string;
  }> {
    const prompt = `
You interpret user tweak requests for recipes.
Do not provide medical claims.
STRICT: do not hallucinate. If uncertain, keep edits conservative and explicit.
Return strict JSON:
{
  "modified_ingredients": ["string"],
  "modified_instructions": ["string"],
  "result": "Main result sentence",
  "why_it_fits": "why it fits sentence",
  "confidence": "low|medium|high",
  "also_check": "Also check: ..."
}

Current recipe: ${params.recipeTitle}
Ingredients: ${params.ingredients.join(", ")}
Instructions: ${params.instructions.join(" | ")}
User tweak request: ${params.tweakRequest}
Profile:
${profileContext(params.profile)}
`;

    const parsed = await this.generateJson(prompt);

    return {
      modified_ingredients: cleanArray(parsed.modified_ingredients),
      modified_instructions: cleanArray(parsed.modified_instructions),
      result: enforceWellnessTone(String(parsed.result || "Recipe updated based on your tweak request.")),
      why_it_fits: enforceWellnessTone(
        String(parsed.why_it_fits || "The update keeps the recipe practical while adjusting for your preference and goal."),
      ),
      confidence: cleanConfidence(parsed.confidence),
      also_check: ensureGroundingLine(String(parsed.also_check || GROUNDING_LINES.recipe)),
    };
  }

  async summarizeNutritionSessionInsight(params: {
    userId: string;
    startedAt: Date;
    endedAt: Date;
    events: NutritionSessionActivityEvent[];
  }): Promise<string> {
    const eventSummary = params.events.map((event) => ({
      at: event.at instanceof Date ? event.at.toISOString() : String(event.at),
      action_type: event.action_type,
      data: event.data,
    }));

    const prompt = `
You summarize a nutrition session memory for personalization.
Do not provide medical advice, diagnosis, or treatment language.
STRICT: do not hallucinate. Use only the provided event data.
If uncertain or data is missing, say uncertainty briefly instead of inventing facts.

Return strict JSON:
{
  "insight_text": "2 to 4 concise sentences"
}

Required style:
- non-medical, non-clinical wording
- concise session summary of what we learned from actual activity
- acceptable phrasing includes: high-protein preference, goal-aligned meal pattern, lighter variation, protein-forward recipe style
- avoid medical certainty wording

Session metadata:
- user_id: ${params.userId}
- session_start: ${params.startedAt.toISOString()}
- session_end: ${params.endedAt.toISOString()}

Session events (source of truth):
${JSON.stringify(eventSummary, null, 2)}
`;

    const parsed = await this.generateJson(prompt);
    return normalizeInsightText(parsed.insight_text);
  }
}

export function createGeminiNutritionClient(): GeminiNutritionClient | null {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return null;
  }

  return new GeminiNutritionClient(key);
}
