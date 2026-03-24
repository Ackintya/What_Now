import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type {
  AuthenticDishRequest,
  GeneratedRecipe,
  NutritionActivityType,
  NutritionInsightMemory,
  NutritionInsightSession,
  NutritionProfile,
  NutritionSessionActivityEvent,
  PantryItem,
  RecipeFilters,
  RecipeLibraryEntry,
  RecipeModification,
  SavedRecipe,
  WellnessMealInsight,
} from "./types";

const COLLECTIONS = {
  profiles: "nutrition_profiles",
  pantryItems: "pantry_items",
  recipes: "generated_recipes",
  recipeModifications: "recipe_modifications",
  savedRecipes: "saved_recipes",
  authenticRequests: "authentic_dish_requests",
  insights: "meal_pattern",
  insightMemory: "nutrition_insight_memory",
  insightSessions: "nutrition_sessions_summary",
} as const;

function serializeId<T extends { _id?: unknown }>(doc: T | null): (T & { _id?: string }) | null {
  if (!doc) {
    return null;
  }

  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  };
}

function serializeMany<T extends { _id?: unknown }>(docs: T[]): Array<T & { _id?: string }> {
  return docs.map((doc) => ({
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  }));
}

function toObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid id");
  }

  return new ObjectId(value);
}

function sanitizeSessionData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(input)) {
    if (raw === null || raw === undefined) {
      continue;
    }

    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      result[key] = raw;
      continue;
    }

    if (raw instanceof Date) {
      result[key] = raw.toISOString();
      continue;
    }

    if (Array.isArray(raw)) {
      const cleaned = raw
        .map((item) => {
          if (item === null || item === undefined) return null;
          if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return item;
          if (item instanceof Date) return item.toISOString();
          if (typeof item === "object") return JSON.stringify(item);
          return String(item);
        })
        .filter((item) => item !== null)
        .slice(0, 20);

      result[key] = cleaned;
      continue;
    }

    if (typeof raw === "object") {
      result[key] = JSON.stringify(raw);
    }
  }

  return result;
}

export async function getNutritionProfile(userId: string): Promise<(NutritionProfile & { _id?: string }) | null> {
  const db = await getDatabase();
  const profile = await db.collection<NutritionProfile>(COLLECTIONS.profiles).findOne({ user_id: userId });
  return serializeId(profile as NutritionProfile | null) as (NutritionProfile & { _id?: string }) | null;
}

export async function upsertNutritionProfile(
  userId: string,
  profile: Omit<NutritionProfile, "_id" | "user_id" | "created_at" | "updated_at">,
): Promise<(NutritionProfile & { _id?: string }) | null> {
  const db = await getDatabase();
  const now = new Date();

  await db.collection<NutritionProfile>(COLLECTIONS.profiles).updateOne(
    { user_id: userId },
    {
      $set: {
        ...profile,
        user_id: userId,
        updated_at: now,
      },
      $setOnInsert: {
        created_at: now,
      },
    },
    { upsert: true },
  );

  return getNutritionProfile(userId);
}

export async function replacePantryItems(
  userId: string,
  items: Array<Pick<PantryItem, "item_name" | "quantity" | "unit">>,
): Promise<Array<PantryItem & { _id?: string }>> {
  const db = await getDatabase();
  const collection = db.collection<PantryItem>(COLLECTIONS.pantryItems);
  await collection.deleteMany({ user_id: userId });

  if (items.length === 0) {
    return [];
  }

  const now = new Date();
  const payload: Omit<PantryItem, "_id">[] = items.map((item) => ({
    user_id: userId,
    item_name: item.item_name,
    quantity: item.quantity,
    unit: item.unit,
    created_at: now,
  }));

  const result = await collection.insertMany(payload);

  return payload.map((item, index) => ({
    ...item,
    _id: String(result.insertedIds[index]),
  }));
}

export async function listPantryItems(userId: string): Promise<Array<PantryItem & { _id?: string }>> {
  const db = await getDatabase();
  const items = await db
    .collection<PantryItem>(COLLECTIONS.pantryItems)
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();

  return serializeMany(items as unknown as PantryItem[]) as Array<PantryItem & { _id?: string }>;
}

export async function createRecipe(
  recipe: Omit<GeneratedRecipe, "_id" | "created_at" | "updated_at">,
): Promise<GeneratedRecipe & { _id?: string }> {
  const db = await getDatabase();
  const now = new Date();

  const payload: Omit<GeneratedRecipe, "_id"> = {
    ...recipe,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection(COLLECTIONS.recipes).insertOne(payload);
  return {
    ...payload,
    _id: String(result.insertedId),
  };
}

export async function updateRecipe(
  recipeId: string,
  userId: string,
  patch: Partial<Omit<GeneratedRecipe, "_id" | "user_id" | "created_at" | "updated_at">>,
) {
  const db = await getDatabase();
  const objectId = toObjectId(recipeId);

  await db.collection(COLLECTIONS.recipes).updateOne(
    { _id: objectId, user_id: userId },
    {
      $set: {
        ...patch,
        updated_at: new Date(),
      },
    },
  );

  return getRecipeById(recipeId, userId);
}

export async function getRecipeById(recipeId: string, userId?: string): Promise<(GeneratedRecipe & { _id?: string }) | null> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {
    _id: toObjectId(recipeId),
  };

  if (userId) {
    query.user_id = userId;
  }

  const recipe = await db.collection(COLLECTIONS.recipes).findOne(query);
  return serializeId(recipe as GeneratedRecipe | null) as (GeneratedRecipe & { _id?: string }) | null;
}

export async function listRecipes(userId: string, filters: RecipeFilters = {}): Promise<Array<GeneratedRecipe & { _id?: string }>> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {
    user_id: userId,
  };

  if (filters.source_type) {
    query.source_type = filters.source_type;
  }

  if (filters.cuisine) {
    query.cuisine = {
      $regex: new RegExp(filters.cuisine, "i"),
    };
  }

  if (filters.protein_focus_level) {
    query.protein_focus_level = {
      $regex: new RegExp(filters.protein_focus_level, "i"),
    };
  }

  if (filters.search) {
    query.$or = [
      { title: { $regex: new RegExp(filters.search, "i") } },
      { tags: { $elemMatch: { $regex: new RegExp(filters.search, "i") } } },
      { ingredients: { $elemMatch: { $regex: new RegExp(filters.search, "i") } } },
    ];
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = {
      $all: filters.tags,
    };
  }

  if (filters.dietary_type) {
    query.tags = {
      ...(query.tags as Record<string, unknown>),
      $elemMatch: { $regex: new RegExp(filters.dietary_type, "i") },
    };
  }

  const recipes = await db.collection(COLLECTIONS.recipes).find(query).sort({ created_at: -1 }).toArray();
  return serializeMany(recipes as unknown as GeneratedRecipe[]) as Array<GeneratedRecipe & { _id?: string }>;
}

export async function duplicateRecipe(userId: string, recipeId: string) {
  const source = await getRecipeById(recipeId, userId);

  if (!source) {
    throw new Error("Recipe not found");
  }

  const duplicated = await createRecipe({
    user_id: userId,
    title: `${source.title} (Copy)`,
    source_type: source.source_type,
    cuisine: source.cuisine,
    goal_context: source.goal_context,
    ingredients: source.ingredients,
    instructions: source.instructions,
    tags: Array.from(new Set([...(source.tags || []), "duplicate"])),
    protein_focus_level: source.protein_focus_level,
    generated_with_gemini: false,
    result_summary: source.result_summary,
    why_it_fits: source.why_it_fits,
    confidence: source.confidence,
    grounding_line: source.grounding_line,
    notes: source.notes,
    parent_recipe_id: source._id,
  });

  return duplicated;
}

export async function createSavedRecipe(
  userId: string,
  recipeId: string,
  userNotes?: string,
): Promise<(SavedRecipe & { _id?: string }) | null> {
  const db = await getDatabase();
  const collection = db.collection<SavedRecipe>(COLLECTIONS.savedRecipes);

  const existing = await collection.findOne({ user_id: userId, recipe_id: recipeId });
  if (existing) {
    return serializeId(existing);
  }

  const payload: Omit<SavedRecipe, "_id"> = {
    user_id: userId,
    recipe_id: recipeId,
    saved_at: new Date(),
    user_notes: userNotes,
  };

  const result = await collection.insertOne(payload);

  return {
    ...payload,
    _id: String(result.insertedId),
  };
}

export async function removeSavedRecipe(userId: string, recipeId: string) {
  const db = await getDatabase();
  await db.collection<SavedRecipe>(COLLECTIONS.savedRecipes).deleteOne({
    user_id: userId,
    recipe_id: recipeId,
  });
}

export async function listSavedRecipes(userId: string): Promise<Array<SavedRecipe & { _id?: string }>> {
  const db = await getDatabase();
  const docs = await db.collection<SavedRecipe>(COLLECTIONS.savedRecipes).find({ user_id: userId }).toArray();
  return serializeMany(docs as unknown as SavedRecipe[]) as Array<SavedRecipe & { _id?: string }>;
}

export async function createRecipeModification(
  payload: Omit<RecipeModification, "_id" | "created_at">,
): Promise<RecipeModification & { _id?: string }> {
  const db = await getDatabase();
  const body: Omit<RecipeModification, "_id"> = {
    ...payload,
    created_at: new Date(),
  };

  const result = await db.collection<RecipeModification>(COLLECTIONS.recipeModifications).insertOne(body);
  return {
    ...body,
    _id: String(result.insertedId),
  };
}

export async function listRecipeModifications(
  userId: string,
  recipeId?: string,
): Promise<Array<RecipeModification & { _id?: string }>> {
  const db = await getDatabase();
  const query: Record<string, unknown> = { user_id: userId };

  if (recipeId) {
    query.recipe_id = recipeId;
  }

  const docs = await db.collection<RecipeModification>(COLLECTIONS.recipeModifications).find(query).sort({ created_at: -1 }).toArray();
  return serializeMany(docs as unknown as RecipeModification[]) as Array<RecipeModification & { _id?: string }>;
}

export async function createAuthenticDishRequest(
  payload: Omit<AuthenticDishRequest, "_id" | "created_at">,
): Promise<AuthenticDishRequest & { _id?: string }> {
  const db = await getDatabase();
  const body: Omit<AuthenticDishRequest, "_id"> = {
    ...payload,
    created_at: new Date(),
  };

  const result = await db.collection<AuthenticDishRequest>(COLLECTIONS.authenticRequests).insertOne(body);
  return {
    ...body,
    _id: String(result.insertedId),
  };
}

export async function replaceWellnessInsights(
  userId: string,
  insights: Omit<WellnessMealInsight, "_id">[],
): Promise<Array<WellnessMealInsight & { _id?: string }>> {
  const db = await getDatabase();
  const collection = db.collection<WellnessMealInsight>(COLLECTIONS.insights);
  await collection.deleteMany({ user_id: userId });

  if (insights.length === 0) {
    return [];
  }

  const result = await collection.insertMany(insights);

  return insights.map((item, index) => ({
    ...item,
    _id: String(result.insertedIds[index]),
  }));
}

export async function listWellnessInsights(userId: string): Promise<Array<WellnessMealInsight & { _id?: string }>> {
  const db = await getDatabase();
  const docs = await db
    .collection<WellnessMealInsight>(COLLECTIONS.insights)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .toArray();

  return serializeMany(docs as unknown as WellnessMealInsight[]) as Array<WellnessMealInsight & { _id?: string }>;
}

export async function getLatestRecipe(userId: string): Promise<(GeneratedRecipe & { _id?: string }) | null> {
  const db = await getDatabase();
  const recipe = await db
    .collection(COLLECTIONS.recipes)
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(1)
    .next();

  return serializeId(recipe as GeneratedRecipe | null) as (GeneratedRecipe & { _id?: string }) | null;
}

export async function getLatestInsight(userId: string): Promise<(WellnessMealInsight & { _id?: string }) | null> {
  const db = await getDatabase();
  const insight = await db
    .collection<WellnessMealInsight>(COLLECTIONS.insights)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(1)
    .next();

  return serializeId(insight as WellnessMealInsight | null) as (WellnessMealInsight & { _id?: string }) | null;
}

export async function createNutritionInsightMemory(
  userId: string,
  insightText: string,
): Promise<NutritionInsightMemory & { _id?: string }> {
  const db = await getDatabase();
  const payload: Omit<NutritionInsightMemory, "_id"> = {
    user_id: userId,
    created_at: new Date(),
    insight_text: insightText,
  };

  const result = await db.collection(COLLECTIONS.insightMemory).insertOne(payload);
  return {
    ...payload,
    _id: String(result.insertedId),
  };
}

export async function getLatestNutritionInsightMemory(
  userId: string,
): Promise<(NutritionInsightMemory & { _id?: string }) | null> {
  const db = await getDatabase();
  const insight = await db
    .collection(COLLECTIONS.insightMemory)
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(1)
    .next();

  return serializeId(insight as NutritionInsightMemory | null) as (NutritionInsightMemory & { _id?: string }) | null;
}

export async function listNutritionInsightMemory(
  userId: string,
  limit = 20,
): Promise<Array<NutritionInsightMemory & { _id?: string }>> {
  const db = await getDatabase();
  const docs = await db
    .collection(COLLECTIONS.insightMemory)
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  return serializeMany(docs as unknown as NutritionInsightMemory[]) as Array<NutritionInsightMemory & { _id?: string }>;
}

export async function getActiveNutritionInsightSession(
  userId: string,
): Promise<(NutritionInsightSession & { _id?: string }) | null> {
  const db = await getDatabase();
  const session = await db
    .collection(COLLECTIONS.insightSessions)
    .find({ user_id: userId, status: "active" })
    .sort({ last_activity_at: -1 })
    .limit(1)
    .next();

  return serializeId(session as NutritionInsightSession | null) as (NutritionInsightSession & { _id?: string }) | null;
}

export async function createNutritionInsightSession(params: {
  userId: string;
  event: NutritionSessionActivityEvent;
}): Promise<NutritionInsightSession & { _id?: string }> {
  const db = await getDatabase();
  const now = params.event.at;

  const payload: Omit<NutritionInsightSession, "_id"> = {
    user_id: params.userId,
    status: "active",
    started_at: now,
    last_activity_at: now,
    created_at: now,
    updated_at: now,
    event_count: 1,
    action_types: [params.event.action_type],
    events: [
      {
        at: params.event.at,
        action_type: params.event.action_type,
        data: sanitizeSessionData(params.event.data),
      },
    ],
  };

  const result = await db.collection(COLLECTIONS.insightSessions).insertOne(payload);
  return {
    ...payload,
    _id: String(result.insertedId),
  };
}

export async function appendNutritionInsightSessionEvent(params: {
  sessionId: string;
  userId: string;
  event: NutritionSessionActivityEvent;
  maxEvents: number;
}): Promise<(NutritionInsightSession & { _id?: string }) | null> {
  const db = await getDatabase();
  const sessionObjectId = toObjectId(params.sessionId);
  const updateDoc = {
    $set: {
      last_activity_at: params.event.at,
      updated_at: params.event.at,
    },
    $inc: {
      event_count: 1,
    },
    $addToSet: {
      action_types: params.event.action_type,
    },
    $push: {
      events: {
        $each: [
          {
            at: params.event.at,
            action_type: params.event.action_type,
            data: sanitizeSessionData(params.event.data),
          },
        ],
        $slice: -Math.max(params.maxEvents, 1),
      },
    },
  };

  await db.collection(COLLECTIONS.insightSessions).updateOne(
    {
      _id: sessionObjectId,
      user_id: params.userId,
      status: "active",
    } as any,
    updateDoc as any,
  );

  const updated = await db.collection(COLLECTIONS.insightSessions).findOne({ _id: sessionObjectId, user_id: params.userId });
  return serializeId(updated as NutritionInsightSession | null) as (NutritionInsightSession & { _id?: string }) | null;
}

export async function markNutritionInsightSessionFinalized(params: {
  sessionId: string;
  userId: string;
  reason: NutritionInsightSession["finalization_reason"];
  generatedInsightId?: string;
  generatedInsightText?: string;
  duplicateOfInsightId?: string;
}): Promise<(NutritionInsightSession & { _id?: string }) | null> {
  const db = await getDatabase();
  const sessionObjectId = toObjectId(params.sessionId);
  const now = new Date();

  await db.collection(COLLECTIONS.insightSessions).updateOne(
    { _id: sessionObjectId, user_id: params.userId },
    {
      $set: {
        status: "finalized",
        finalized_at: now,
        updated_at: now,
        finalization_reason: params.reason,
        generated_insight_id: params.generatedInsightId,
        generated_insight_text: params.generatedInsightText,
        duplicate_of_insight_id: params.duplicateOfInsightId,
      },
    },
  );

  const updated = await db.collection(COLLECTIONS.insightSessions).findOne({ _id: sessionObjectId, user_id: params.userId });
  return serializeId(updated as NutritionInsightSession | null) as (NutritionInsightSession & { _id?: string }) | null;
}

export async function getNutritionInsightSessionById(
  sessionId: string,
): Promise<(NutritionInsightSession & { _id?: string }) | null> {
  const db = await getDatabase();
  const session = await db.collection(COLLECTIONS.insightSessions).findOne({ _id: toObjectId(sessionId) });
  return serializeId(session as NutritionInsightSession | null) as (NutritionInsightSession & { _id?: string }) | null;
}

export async function listStaleActiveNutritionInsightSessions(params: {
  staleBefore: Date;
  limit: number;
  userId?: string;
}): Promise<Array<NutritionInsightSession & { _id?: string }>> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {
    status: "active",
    last_activity_at: { $lte: params.staleBefore },
  };

  if (params.userId) {
    query.user_id = params.userId;
  }

  const sessions = await db
    .collection(COLLECTIONS.insightSessions)
    .find(query)
    .sort({ last_activity_at: 1 })
    .limit(params.limit)
    .toArray();

  return serializeMany(sessions as unknown as NutritionInsightSession[]) as Array<NutritionInsightSession & { _id?: string }>;
}

function recipeMatchesFilters(recipe: GeneratedRecipe, filters: RecipeFilters): boolean {
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = [recipe.title, recipe.cuisine || "", ...(recipe.tags || []), ...(recipe.ingredients || [])]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagSet = new Set((recipe.tags || []).map((item) => item.toLowerCase()));
    const hasAll = filters.tags.every((tag) => tagSet.has(tag.toLowerCase()));
    if (!hasAll) {
      return false;
    }
  }

  if (filters.cuisine && !(recipe.cuisine || "").toLowerCase().includes(filters.cuisine.toLowerCase())) {
    return false;
  }

  if (filters.source_type && recipe.source_type !== filters.source_type) {
    return false;
  }

  if (
    filters.protein_focus_level &&
    !(recipe.protein_focus_level || "").toLowerCase().includes(filters.protein_focus_level.toLowerCase())
  ) {
    return false;
  }

  if (filters.dietary_type) {
    const hasDietaryTag = (recipe.tags || []).some((tag) => tag.toLowerCase().includes(filters.dietary_type!.toLowerCase()));
    if (!hasDietaryTag) {
      return false;
    }
  }

  return true;
}

export async function getRecipeLibrary(userId: string, filters: RecipeFilters): Promise<RecipeLibraryEntry[]> {
  const [recipes, saved, modifications] = await Promise.all([
    listRecipes(userId),
    listSavedRecipes(userId),
    listRecipeModifications(userId),
  ]);

  const saveByRecipe = new Map(saved.map((item) => [item.recipe_id, item]));
  const modificationCountByRecipe = modifications.reduce((acc, mod) => {
    const current = acc.get(mod.recipe_id) || 0;
    acc.set(mod.recipe_id, current + 1);
    return acc;
  }, new Map<string, number>());

  return recipes
    .filter((recipe) => recipeMatchesFilters(recipe as GeneratedRecipe, filters))
    .filter((recipe) => {
      if (filters.only_saved) {
        return saveByRecipe.has(recipe._id || "");
      }
      return true;
    })
    .map((recipe) => ({
      recipe: recipe as GeneratedRecipe,
      saved: saveByRecipe.get(recipe._id || "") || null,
      modification_count: modificationCountByRecipe.get(recipe._id || "") || 0,
    }));
}
