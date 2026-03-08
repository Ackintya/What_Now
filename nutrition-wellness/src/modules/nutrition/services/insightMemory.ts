import {
  NUTRITION_MEANINGFUL_ACTIVITY_TYPES,
  NUTRITION_MEMORY_DUPLICATE_SIMILARITY_THRESHOLD,
  NUTRITION_MEMORY_MAX_EVENTS_PER_SESSION,
  NUTRITION_MEMORY_STALE_MINUTES,
} from "../constants";
import {
  appendNutritionInsightSessionEvent,
  createNutritionInsightMemory,
  createNutritionInsightSession,
  getActiveNutritionInsightSession,
  getLatestNutritionInsightMemory,
  getNutritionInsightSessionById,
  listStaleActiveNutritionInsightSessions,
  markNutritionInsightSessionFinalized,
} from "../repositories";
import { enforceWellnessTone } from "../safeText";
import type {
  NutritionActivityType,
  NutritionInsightMemory,
  NutritionInsightSession,
  NutritionSessionActivityEvent,
} from "../types";
import { createGeminiNutritionClient } from "./geminiClient";

function isMeaningfulActivity(actionType: NutritionActivityType): boolean {
  return NUTRITION_MEANINGFUL_ACTIVITY_TYPES.includes(actionType);
}

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function sentenceSplit(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeInsightText(text: string): string {
  return enforceWellnessTone(text)
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function normalizeTokens(text: string): string[] {
  return normalizeInsightText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function tokenJaccard(left: string, right: string): number {
  const leftSet = new Set(normalizeTokens(left));
  const rightSet = new Set(normalizeTokens(right));

  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union > 0 ? intersection / union : 0;
}

function isNearlyDuplicateInsight(previous: string, next: string): boolean {
  const prevNormalized = normalizeTokens(previous).join(" ");
  const nextNormalized = normalizeTokens(next).join(" ");

  if (!prevNormalized || !nextNormalized) {
    return false;
  }

  if (prevNormalized === nextNormalized) {
    return true;
  }

  return tokenJaccard(previous, next) >= NUTRITION_MEMORY_DUPLICATE_SIMILARITY_THRESHOLD;
}

function extractString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => extractString(item))
    .filter(Boolean);
}

function buildSessionSignals(events: NutritionSessionActivityEvent[]) {
  const actionCounts = events.reduce((acc, event) => {
    const key = event.action_type;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let latestGoal = "";
  const mealTitles = new Set<string>();
  const savedTitles = new Set<string>();
  const modifiedTitles = new Set<string>();
  const customTitles = new Set<string>();
  const authenticQueries = new Set<string>();
  const preferredTags = new Set<string>();

  for (const event of events) {
    const data = event.data || {};

    if (event.action_type === "profile_updated") {
      const goal = extractString(data.primary_goal);
      if (goal) {
        latestGoal = goal;
      }

      for (const pref of extractStringArray(data.dietary_preferences)) {
        preferredTags.add(pref);
      }
    }

    if (event.action_type === "recipe_generated") {
      for (const title of extractStringArray(data.meal_titles)) {
        mealTitles.add(title);
      }

      const singleTitle = extractString(data.recipe_title);
      if (singleTitle) {
        mealTitles.add(singleTitle);
      }

      for (const tag of extractStringArray(data.tags)) {
        preferredTags.add(tag);
      }
    }

    if (event.action_type === "authentic_optimization_completed") {
      const query = extractString(data.query);
      if (query) {
        authenticQueries.add(query);
      }

      const optimizedTitle = extractString(data.optimized_recipe_title);
      if (optimizedTitle) {
        mealTitles.add(optimizedTitle);
      }
    }

    if (event.action_type === "recipe_saved") {
      const title = extractString(data.recipe_title);
      if (title) {
        savedTitles.add(title);
      }
    }

    if (event.action_type === "recipe_modified") {
      const title = extractString(data.recipe_title);
      if (title) {
        modifiedTitles.add(title);
      }
    }

    if (event.action_type === "custom_recipe_added") {
      const title = extractString(data.recipe_title);
      if (title) {
        customTitles.add(title);
      }
    }
  }

  const allTags = [...preferredTags].map((tag) => tag.toLowerCase());
  const hasHighProteinSignal = allTags.some((tag) => tag.includes("protein")) ||
    [...mealTitles].some((title) => title.toLowerCase().includes("protein"));

  return {
    action_counts: actionCounts,
    latest_goal: latestGoal,
    meal_titles: [...mealTitles].slice(0, 8),
    saved_recipe_titles: [...savedTitles].slice(0, 8),
    modified_recipe_titles: [...modifiedTitles].slice(0, 8),
    custom_recipe_titles: [...customTitles].slice(0, 8),
    authentic_queries: [...authenticQueries].slice(0, 6),
    preference_tags: [...preferredTags].slice(0, 12),
    has_high_protein_signal: hasHighProteinSignal,
  };
}

function fallbackInsightFromSignals(signals: ReturnType<typeof buildSessionSignals>): string {
  const sentences: string[] = [];

  if (signals.latest_goal) {
    sentences.push(`The user reinforced a ${signals.latest_goal} goal and kept a goal-aligned meal planning pattern during this session.`);
  }

  if (signals.has_high_protein_signal) {
    sentences.push("Their activity suggests a protein-forward recipe style with recurring high-protein preference cues.");
  }

  if (signals.authentic_queries.length > 0) {
    sentences.push("They showed interest in lighter variation options while preserving the spirit of authentic dishes.");
  }

  const savedOrModified = signals.saved_recipe_titles.length + signals.modified_recipe_titles.length;
  if (savedOrModified > 0) {
    sentences.push("They actively saved and refined recipes, indicating an iterative and practical meal-planning workflow.");
  }

  if (signals.custom_recipe_titles.length > 0) {
    sentences.push("They also added custom recipes, which reflects a preference for personalized recipe memory.");
  }

  if (sentences.length === 0) {
    sentences.push("This nutrition session focused on practical meal planning actions and preference shaping.");
    sentences.push("The observed pattern is suitable for future personalization in a non-medical, goal-aware way.");
  }

  if (sentences.length === 1) {
    sentences.push("The session behavior was consistent with wellness-oriented nutrition planning rather than clinical guidance.");
  }

  return normalizeInsightText(sentences.slice(0, 4).join(" "));
}

async function generateSessionInsightText(params: {
  userId: string;
  session: NutritionInsightSession & { _id?: string };
}): Promise<string> {
  const events = params.session.events || [];
  const signals = buildSessionSignals(events);
  const fallback = fallbackInsightFromSignals(signals);

  const gemini = createGeminiNutritionClient();
  if (!gemini) {
    return fallback;
  }

  try {
    const generated = await gemini.summarizeNutritionSessionInsight({
      userId: params.userId,
      startedAt: toDate(params.session.started_at, new Date()),
      endedAt: toDate(params.session.last_activity_at, new Date()),
      events,
    });

    const normalized = normalizeInsightText(generated);
    const sentenceCount = sentenceSplit(normalized).length;

    if (!normalized || sentenceCount < 2) {
      return fallback;
    }

    return sentenceSplit(normalized).slice(0, 4).join(" ");
  } catch (error) {
    console.error("Gemini session insight generation failed, using fallback:", error);
    return fallback;
  }
}

async function persistFinalizedInsight(params: {
  userId: string;
  session: NutritionInsightSession & { _id?: string };
  reason: NutritionInsightSession["finalization_reason"];
}): Promise<{
  created: boolean;
  insight: (NutritionInsightMemory & { _id?: string }) | null;
  duplicateOfInsightId?: string;
}> {
  const insightText = await generateSessionInsightText({
    userId: params.userId,
    session: params.session,
  });

  if (!insightText) {
    await markNutritionInsightSessionFinalized({
      sessionId: String(params.session._id),
      userId: params.userId,
      reason: "no_activity",
    });
    return { created: false, insight: null };
  }

  const latest = await getLatestNutritionInsightMemory(params.userId);
  if (latest && isNearlyDuplicateInsight(latest.insight_text, insightText)) {
    await markNutritionInsightSessionFinalized({
      sessionId: String(params.session._id),
      userId: params.userId,
      reason: "duplicate_summary",
      duplicateOfInsightId: latest._id,
      generatedInsightText: insightText,
    });

    return {
      created: false,
      insight: null,
      duplicateOfInsightId: latest._id,
    };
  }

  const createdInsight = await createNutritionInsightMemory(params.userId, insightText);

  await markNutritionInsightSessionFinalized({
    sessionId: String(params.session._id),
    userId: params.userId,
    reason: params.reason,
    generatedInsightId: createdInsight._id,
    generatedInsightText: createdInsight.insight_text,
  });

  return {
    created: true,
    insight: createdInsight,
  };
}

export async function finalizeNutritionInsightSessionById(params: {
  sessionId: string;
  reason: NutritionInsightSession["finalization_reason"];
}): Promise<{
  finalized: boolean;
  createdInsight: boolean;
  userId?: string;
  insightId?: string;
}> {
  const session = await getNutritionInsightSessionById(params.sessionId);
  if (!session || session.status !== "active") {
    return { finalized: false, createdInsight: false };
  }

  const userId = session.user_id;

  if (!session.events || session.events.length === 0 || session.event_count <= 0) {
    await markNutritionInsightSessionFinalized({
      sessionId: String(session._id),
      userId,
      reason: "no_activity",
    });
    return { finalized: true, createdInsight: false, userId };
  }

  const persisted = await persistFinalizedInsight({
    userId,
    session,
    reason: params.reason,
  });

  return {
    finalized: true,
    createdInsight: persisted.created,
    userId,
    insightId: persisted.insight?._id,
  };
}

export async function trackNutritionActivity(params: {
  userId: string;
  actionType: NutritionActivityType;
  data?: Record<string, unknown>;
  at?: Date;
}): Promise<{ recorded: boolean; sessionId?: string }> {
  if (!isMeaningfulActivity(params.actionType)) {
    return { recorded: false };
  }

  const now = params.at || new Date();
  const staleCutoff = new Date(now.getTime() - NUTRITION_MEMORY_STALE_MINUTES * 60 * 1000);

  const activeSession = await getActiveNutritionInsightSession(params.userId);

  if (activeSession && toDate(activeSession.last_activity_at, now) <= staleCutoff && activeSession._id) {
    await finalizeNutritionInsightSessionById({
      sessionId: activeSession._id,
      reason: "superseded_by_new_activity",
    });
  }

  const refreshedActive = await getActiveNutritionInsightSession(params.userId);

  const event: NutritionSessionActivityEvent = {
    at: now,
    action_type: params.actionType,
    data: params.data || {},
  };

  if (!refreshedActive || !refreshedActive._id) {
    const created = await createNutritionInsightSession({
      userId: params.userId,
      event,
    });

    return {
      recorded: true,
      sessionId: created._id,
    };
  }

  const appended = await appendNutritionInsightSessionEvent({
    sessionId: refreshedActive._id,
    userId: params.userId,
    event,
    maxEvents: NUTRITION_MEMORY_MAX_EVENTS_PER_SESSION,
  });

  return {
    recorded: true,
    sessionId: appended?._id,
  };
}

export async function finalizeStaleNutritionInsightSessions(params?: {
  staleMinutes?: number;
  limit?: number;
  userId?: string;
}): Promise<{
  scanned: number;
  finalized: number;
  createdInsights: number;
}> {
  const staleMinutes = params?.staleMinutes ?? NUTRITION_MEMORY_STALE_MINUTES;
  const limit = params?.limit ?? 100;

  const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000);
  const sessions = await listStaleActiveNutritionInsightSessions({
    staleBefore,
    limit,
    userId: params?.userId,
  });

  let finalizedCount = 0;
  let createdInsightCount = 0;

  for (const session of sessions) {
    if (!session._id) {
      continue;
    }

    const result = await finalizeNutritionInsightSessionById({
      sessionId: session._id,
      reason: "stale_inactivity",
    });

    if (result.finalized) {
      finalizedCount += 1;
    }

    if (result.createdInsight) {
      createdInsightCount += 1;
    }
  }

  return {
    scanned: sessions.length,
    finalized: finalizedCount,
    createdInsights: createdInsightCount,
  };
}

export async function trackNutritionActivitySafely(params: {
  userId: string;
  actionType: NutritionActivityType;
  data?: Record<string, unknown>;
  at?: Date;
}) {
  try {
    return await trackNutritionActivity(params);
  } catch (error) {
    console.error("Nutrition memory activity tracking failed:", error);
    return { recorded: false as const };
  }
}
