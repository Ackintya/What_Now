
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookMarked,
  Lightbulb,
  PlusCircle,
  Refrigerator,
  Save,
  Search,
  Soup,
  Sparkles,
} from "lucide-react";
import { DEFAULT_USER_ID, MODULE_GUARDRAIL_TEXT, PRIMARY_GOALS } from "../constants";
import {
  createRecipe,
  duplicateRecipe,
  fetchInsights,
  fetchPantryItems,
  fetchProfile,
  fetchRecipeLibrary,
  fetchSummary,
  generateInsights,
  generatePantryMeals,
  modifyRecipe,
  optimizeAuthenticDish,
  savePantryItems,
  saveProfile,
  saveRecipe,
  unsaveRecipe,
} from "./api";
import type {
  AuthenticOptimizationResult,
  PantryMealDraft,
  PrimaryGoal,
  RecipeLibraryEntry,
  SummaryPayload,
  WellnessMealInsight,
} from "../types";

interface ProfileDraft {
  primary_goal: PrimaryGoal;
  protein_goal_g: string;
  calorie_goal: string;
  dietary_preferences: string;
  allergies: string;
  restrictions: string;
  preferred_cuisines: string;
  disliked_ingredients: string;
}

interface CustomRecipeDraft {
  title: string;
  cuisine: string;
  ingredients: string;
  instructions: string;
  notes: string;
  tags: string;
}

interface LibraryFilters {
  search: string;
  tags: string;
  cuisine: string;
  sourceType: string;
  proteinFocus: string;
  dietary: string;
  onlySaved: boolean;
}

type SectionKey = "profile" | "pantry" | "optimizer" | "library" | "custom" | "insights";

function isSectionKey(value: string | null): value is SectionKey {
  return value === "profile" || value === "pantry" || value === "optimizer" || value === "library" || value === "custom" || value === "insights";
}

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function multilineToArray(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToDraft(profile: any): ProfileDraft {
  const goal =
    profile?.primary_goal === "muscle_gain" ||
    profile?.primary_goal === "fat_loss" ||
    profile?.primary_goal === "maintenance" ||
    profile?.primary_goal === "high_protein"
      ? profile.primary_goal
      : "general_wellness";

  return {
    primary_goal: goal,
    protein_goal_g: profile?.protein_goal_g ? String(profile.protein_goal_g) : "",
    calorie_goal: profile?.calorie_goal ? String(profile.calorie_goal) : "",
    dietary_preferences: (profile?.dietary_preferences || []).join(", "),
    allergies: (profile?.allergies || []).join(", "),
    restrictions: (profile?.restrictions || []).join(", "),
    preferred_cuisines: (profile?.preferred_cuisines || []).join(", "),
    disliked_ingredients: (profile?.disliked_ingredients || []).join(", "),
  };
}

const DEFAULT_PROFILE_DRAFT: ProfileDraft = {
  primary_goal: "general_wellness",
  protein_goal_g: "",
  calorie_goal: "",
  dietary_preferences: "omnivore",
  allergies: "",
  restrictions: "",
  preferred_cuisines: "",
  disliked_ingredients: "",
};

const DEFAULT_CUSTOM_RECIPE: CustomRecipeDraft = {
  title: "",
  cuisine: "",
  ingredients: "",
  instructions: "",
  notes: "",
  tags: "",
};

const DEFAULT_FILTERS: LibraryFilters = {
  search: "",
  tags: "",
  cuisine: "",
  sourceType: "",
  proteinFocus: "",
  dietary: "",
  onlySaved: true,
};

export function NutritionWellnessPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(DEFAULT_PROFILE_DRAFT);
  const [pantryInput, setPantryInput] = useState("");
  const [workoutContext, setWorkoutContext] = useState("");
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [generatedMeals, setGeneratedMeals] = useState<PantryMealDraft[]>([]);

  const [authQuery, setAuthQuery] = useState("");
  const [authCuisine, setAuthCuisine] = useState("");
  const [authPreferences, setAuthPreferences] = useState("more protein, keep authentic");
  const [authResult, setAuthResult] = useState<AuthenticOptimizationResult | null>(null);

  const [libraryEntries, setLibraryEntries] = useState<RecipeLibraryEntry[]>([]);
  const [librarySeeded, setLibrarySeeded] = useState(false);
  const [libraryFilters, setLibraryFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [tweakByRecipe, setTweakByRecipe] = useState<Record<string, string>>({});

  const [customRecipe, setCustomRecipe] = useState<CustomRecipeDraft>(DEFAULT_CUSTOM_RECIPE);
  const [insights, setInsights] = useState<WellnessMealInsight[]>([]);
  const [insightsSeeded, setInsightsSeeded] = useState(false);

  const [initializing, setInitializing] = useState(true);
  const [savingProfileState, setSavingProfileState] = useState(false);
  const [savingPantryState, setSavingPantryState] = useState(false);
  const [generatingPantryState, setGeneratingPantryState] = useState(false);
  const [optimizingAuthState, setOptimizingAuthState] = useState(false);
  const [savingRecipeState, setSavingRecipeState] = useState<string | null>(null);
  const [loadingLibraryState, setLoadingLibraryState] = useState(false);
  const [savingCustomRecipeState, setSavingCustomRecipeState] = useState(false);
  const [generatingInsightsState, setGeneratingInsightsState] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");

  const sectionButtons: Array<{ key: SectionKey; label: string }> = [
    { key: "profile", label: "Profile" },
    { key: "pantry", label: "Pantry Planner" },
    { key: "optimizer", label: "Dish Optimizer" },
    { key: "library", label: "Recipe Library" },
    { key: "custom", label: "Custom Recipe" },
    { key: "insights", label: "Insights" },
  ];

  const showStatus = useCallback((message: string, type: "info" | "error" = "info") => {
    setStatusType(type);
    setStatusMessage(message);
  }, []);

  const loadLibrary = useCallback(
    async (filters: LibraryFilters) => {
      setLoadingLibraryState(true);
      try {
        const result = await fetchRecipeLibrary(userId, {
          search: filters.search || undefined,
          tags: csvToArray(filters.tags),
          cuisine: filters.cuisine || undefined,
          sourceType: filters.sourceType || undefined,
          proteinFocus: filters.proteinFocus || undefined,
          dietary: filters.dietary || undefined,
          onlySaved: filters.onlySaved,
        });

        setLibraryEntries(result.entries);
        setLibrarySeeded(result.seeded);
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setLoadingLibraryState(false);
      }
    },
    [showStatus, userId],
  );

  const loadAll = useCallback(async () => {
    setInitializing(true);
    try {
      const [summaryPayload, profilePayload, pantryPayload, libraryPayload, insightsPayload] = await Promise.all([
        fetchSummary(userId),
        fetchProfile(userId),
        fetchPantryItems(userId),
        fetchRecipeLibrary(userId, { onlySaved: true }),
        fetchInsights(userId),
      ]);

      setSummary(summaryPayload);
      setProfileDraft(profileToDraft(profilePayload));
      setPantryItems(pantryPayload.map((item) => item.item_name));
      setPantryInput(pantryPayload.map((item) => item.item_name).join(", "));
      setLibraryEntries(libraryPayload.entries);
      setLibrarySeeded(libraryPayload.seeded);
      setInsights(insightsPayload.insights);
      setInsightsSeeded(insightsPayload.seeded);
      showStatus("Nutrition module data loaded.");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setInitializing(false);
    }
  }, [showStatus, userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const nextSection = searchParams.get("section");
    if (isSectionKey(nextSection)) {
      setActiveSection(nextSection);
    }
  }, [searchParams]);

  const changeSection = useCallback(
    (nextSection: SectionKey) => {
      setActiveSection(nextSection);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("section", nextSection);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const saveProfileHandler = useCallback(async () => {
    setSavingProfileState(true);
    try {
      await saveProfile({
        user_id: userId,
        primary_goal: profileDraft.primary_goal,
        protein_goal_g: profileDraft.protein_goal_g ? Number(profileDraft.protein_goal_g) : undefined,
        calorie_goal: profileDraft.calorie_goal ? Number(profileDraft.calorie_goal) : undefined,
        dietary_preferences: csvToArray(profileDraft.dietary_preferences),
        allergies: csvToArray(profileDraft.allergies),
        restrictions: csvToArray(profileDraft.restrictions),
        preferred_cuisines: csvToArray(profileDraft.preferred_cuisines),
        disliked_ingredients: csvToArray(profileDraft.disliked_ingredients),
      });

      setSummary(await fetchSummary(userId));
      showStatus("Nutrition profile saved.");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setSavingProfileState(false);
    }
  }, [profileDraft, showStatus, userId]);

  const savePantryHandler = useCallback(async () => {
    setSavingPantryState(true);
    try {
      const items = csvToArray(pantryInput);
      const saved = await savePantryItems(userId, items);
      setPantryItems(saved.map((item) => item.item_name));
      showStatus("Pantry items saved.");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setSavingPantryState(false);
    }
  }, [pantryInput, showStatus, userId]);

  const generatePantryMealsHandler = useCallback(async () => {
    setGeneratingPantryState(true);
    try {
      const ingredients = csvToArray(pantryInput);
      const result = await generatePantryMeals({
        user_id: userId,
        pantry_ingredients: ingredients,
        workout_context: workoutContext || undefined,
        max_results: 3,
      });

      setGeneratedMeals(result.meals);
      setPantryItems(ingredients);
      showStatus(
        result.generated_with_gemini
          ? `Meals generated with ${result.model || "Gemini"}.`
          : "Meals generated using fallback templates.",
      );
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setGeneratingPantryState(false);
    }
  }, [pantryInput, showStatus, userId, workoutContext]);

  const saveGeneratedRecipe = useCallback(
    async (meal: PantryMealDraft, sourceType: "generated" | "optimized_authentic") => {
      setSavingRecipeState(meal.title);
      try {
        await createRecipe({
          user_id: userId,
          title: meal.title,
          source_type: sourceType,
          cuisine: meal.cuisine,
          goal_context: meal.goal_context || profileDraft.primary_goal,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          tags: meal.tags,
          protein_focus_level: meal.protein_focus_level,
          generated_with_gemini: meal.generated_with_gemini,
          result_summary: meal.result,
          why_it_fits: meal.why_it_fits,
          confidence: meal.confidence,
          grounding_line: meal.also_check,
          save: true,
          save_note: "Saved from generation flow",
        });

        await Promise.all([loadLibrary(libraryFilters), fetchSummary(userId).then(setSummary)]);
        showStatus("Recipe saved to library.");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setSavingRecipeState(null);
      }
    },
    [libraryFilters, loadLibrary, profileDraft.primary_goal, showStatus, userId],
  );

  const optimizeAuthenticHandler = useCallback(async () => {
    setOptimizingAuthState(true);
    try {
      const result = await optimizeAuthenticDish({
        user_id: userId,
        query: authQuery,
        cuisine: authCuisine || undefined,
        optimization_preferences: csvToArray(authPreferences),
      });

      setAuthResult(result.optimization);
      showStatus(
        result.generated_with_gemini
          ? `Authentic optimization generated with ${result.model || "Gemini"}.`
          : "Authentic optimization generated using fallback logic.",
      );
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setOptimizingAuthState(false);
    }
  }, [authCuisine, authPreferences, authQuery, showStatus, userId]);

  const applyFiltersHandler = useCallback(async () => {
    await loadLibrary(libraryFilters);
  }, [libraryFilters, loadLibrary]);

  const resetFiltersHandler = useCallback(async () => {
    setLibraryFilters(DEFAULT_FILTERS);
    await loadLibrary(DEFAULT_FILTERS);
  }, [loadLibrary]);

  const toggleSaveHandler = useCallback(
    async (entry: RecipeLibraryEntry) => {
      if (!entry.recipe._id) {
        return;
      }

      setSavingRecipeState(entry.recipe._id);
      try {
        if (entry.saved) {
          await unsaveRecipe(entry.recipe._id, userId);
          showStatus("Recipe removed from saved library.");
        } else {
          await saveRecipe(entry.recipe._id, userId, "Saved from library view");
          showStatus("Recipe saved.");
        }

        await Promise.all([loadLibrary(libraryFilters), fetchSummary(userId).then(setSummary)]);
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setSavingRecipeState(null);
      }
    },
    [libraryFilters, loadLibrary, showStatus, userId],
  );

  const applyTweakHandler = useCallback(
    async (entry: RecipeLibraryEntry) => {
      if (!entry.recipe._id) {
        return;
      }

      const tweakText = tweakByRecipe[entry.recipe._id] || "";
      if (!tweakText.trim()) {
        showStatus("Add tweak notes before applying.", "error");
        return;
      }

      setSavingRecipeState(entry.recipe._id);
      try {
        await modifyRecipe(entry.recipe._id, {
          user_id: userId,
          modification_notes: tweakText,
        });

        await Promise.all([loadLibrary(libraryFilters), fetchSummary(userId).then(setSummary)]);
        showStatus("Tweak applied and modified version saved.");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setSavingRecipeState(null);
      }
    },
    [libraryFilters, loadLibrary, showStatus, tweakByRecipe, userId],
  );

  const duplicateRecipeHandler = useCallback(
    async (entry: RecipeLibraryEntry) => {
      if (!entry.recipe._id) {
        return;
      }

      setSavingRecipeState(entry.recipe._id);
      try {
        await duplicateRecipe(entry.recipe._id, userId);
        await Promise.all([loadLibrary(libraryFilters), fetchSummary(userId).then(setSummary)]);
        showStatus("Recipe duplicated and saved.");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setSavingRecipeState(null);
      }
    },
    [libraryFilters, loadLibrary, showStatus, userId],
  );

  const saveCustomRecipeHandler = useCallback(async () => {
    setSavingCustomRecipeState(true);
    try {
      await createRecipe({
        user_id: userId,
        title: customRecipe.title,
        source_type: "custom",
        cuisine: customRecipe.cuisine,
        goal_context: profileDraft.primary_goal,
        ingredients: multilineToArray(customRecipe.ingredients),
        instructions: multilineToArray(customRecipe.instructions),
        tags: csvToArray(customRecipe.tags),
        generated_with_gemini: false,
        notes: customRecipe.notes,
        result_summary: `${customRecipe.title} saved as a custom recipe in your library.`,
        why_it_fits: "Custom recipe added to preserve your own cooking preferences and nutrition intent.",
        confidence: "medium",
        grounding_line: "Also check: the recipe ingredient list and serving sizes before cooking.",
        save: true,
      });

      setCustomRecipe(DEFAULT_CUSTOM_RECIPE);
      await Promise.all([loadLibrary(libraryFilters), fetchSummary(userId).then(setSummary)]);
      showStatus("Custom recipe added to library.");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setSavingCustomRecipeState(false);
    }
  }, [customRecipe, libraryFilters, loadLibrary, profileDraft.primary_goal, showStatus, userId]);

  const generateInsightsHandler = useCallback(async () => {
    setGeneratingInsightsState(true);
    try {
      const generated = await generateInsights(userId);
      setInsights(generated);
      setInsightsSeeded(false);
      setSummary(await fetchSummary(userId));
      showStatus("Wellness nutrition insights refreshed.");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setGeneratingInsightsState(false);
    }
  }, [showStatus, userId]);

  const statusClass = useMemo(
    () =>
      statusType === "error"
        ? "border-red-500/40 bg-red-500/10 text-red-200"
        : "border-doom-accent/40 bg-doom-accent/10 text-doom-text",
    [statusType],
  );

  return (
    <main className="min-h-screen pt-20 pb-10">
      <div className="w-full px-1 sm:px-2 lg:px-3 space-y-6">
        <section className="module-card" id="overview">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-base text-doom-muted">Hackathon standalone module</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-doom-text">Nutrition Wellness Workspace</h1>
              <p className="text-base text-doom-muted mt-2 max-w-5xl">{MODULE_GUARDRAIL_TEXT}</p>
            </div>

            <div className="w-full lg:w-80">
              <label className="text-base text-doom-muted">User ID</label>
              <div className="flex gap-2 mt-1">
                <input className="input-field" value={userId} onChange={(event) => setUserId(event.target.value)} />
                <button className="btn-secondary" type="button" onClick={() => void loadAll()}>
                  Load
                </button>
              </div>
            </div>
          </div>

          {statusMessage ? <p className={`mt-4 rounded-lg border px-3 py-2 text-base ${statusClass}`}>{statusMessage}</p> : null}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Sparkles className="w-5 h-5 text-doom-primary" />}
            label="Active Goal"
            value={summary?.active_goal || "general_wellness"}
            loading={initializing}
          />
          <SummaryCard
            icon={<BookMarked className="w-5 h-5 text-blue-400" />}
            label="Saved Recipes"
            value={String(summary?.saved_recipe_count || 0)}
            loading={initializing}
          />
          <SummaryCard
            icon={<Soup className="w-5 h-5 text-orange-300" />}
            label="Latest Recipe"
            value={summary?.latest_recipe_title || "No recipes yet"}
            loading={initializing}
          />
          <SummaryCard
            icon={<Lightbulb className="w-5 h-5 text-yellow-300" />}
            label="Latest Insight"
            value={summary?.latest_insight_message || "No generated insight yet"}
            loading={initializing}
          />
        </section>

        <section className="module-card sticky top-16 z-30 bg-doom-surface/95 backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
            {sectionButtons.map((section) => {
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  className={`w-full flex items-center justify-center px-3 py-3 rounded-lg border text-base sm:text-base font-medium transition ${
                    isActive
                      ? "border-doom-accent bg-doom-accent/20 text-doom-accent"
                      : "border-doom-primary/30 text-doom-text hover:bg-doom-bg/50"
                  }`}
                  onClick={() => changeSection(section.key)}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className={`module-card ${activeSection === "profile" ? "block" : "hidden"}`} id="profile">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="module-title">Nutrition Profile</h2>
              <p className="module-subtitle">Set goals, preferences, allergies, and cuisines for generation context.</p>
            </div>
            <button className="btn-primary" type="button" onClick={() => void saveProfileHandler()} disabled={savingProfileState}>
              <Save className="w-4 h-4 mr-2" />
              {savingProfileState ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-base text-doom-muted">Primary goal</label>
              <select
                className="input-field mt-1"
                value={profileDraft.primary_goal}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, primary_goal: event.target.value as PrimaryGoal }))}
              >
                {PRIMARY_GOALS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-base text-doom-muted">Protein goal (g/day)</label>
              <input
                className="input-field mt-1"
                type="number"
                value={profileDraft.protein_goal_g}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, protein_goal_g: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-base text-doom-muted">Calorie goal</label>
              <input
                className="input-field mt-1"
                type="number"
                value={profileDraft.calorie_goal}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, calorie_goal: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label="Dietary preferences"
              placeholder="vegetarian, halal, pescatarian"
              value={profileDraft.dietary_preferences}
              onChange={(value) => setProfileDraft((prev) => ({ ...prev, dietary_preferences: value }))}
            />
            <Field
              label="Allergies"
              placeholder="peanuts, shellfish"
              value={profileDraft.allergies}
              onChange={(value) => setProfileDraft((prev) => ({ ...prev, allergies: value }))}
            />
            <Field
              label="Restrictions"
              placeholder="low sodium, no beef"
              value={profileDraft.restrictions}
              onChange={(value) => setProfileDraft((prev) => ({ ...prev, restrictions: value }))}
            />
            <Field
              label="Preferred cuisines"
              placeholder="Indian, Thai, Mediterranean"
              value={profileDraft.preferred_cuisines}
              onChange={(value) => setProfileDraft((prev) => ({ ...prev, preferred_cuisines: value }))}
            />
          </div>

          <div className="mt-4">
            <Field
              label="Disliked ingredients"
              placeholder="mushroom, cilantro"
              value={profileDraft.disliked_ingredients}
              onChange={(value) => setProfileDraft((prev) => ({ ...prev, disliked_ingredients: value }))}
            />
          </div>
        </section>

        <section className={`module-card ${activeSection === "pantry" ? "block" : "hidden"}`} id="pantry">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="module-title">Pantry Meal Planner</h2>
              <p className="module-subtitle">Generate goal-fit meals from what you already have at home.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" type="button" onClick={() => void savePantryHandler()} disabled={savingPantryState}>
                {savingPantryState ? "Saving..." : "Save Pantry"}
              </button>
              <button className="btn-primary" type="button" onClick={() => void generatePantryMealsHandler()} disabled={generatingPantryState}>
                {generatingPantryState ? "Generating..." : "Generate Meals"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Pantry ingredients (comma-separated)"
              placeholder="eggs, spinach, tofu, rice"
              value={pantryInput}
              onChange={setPantryInput}
            />
            <Field
              label="Workout context"
              placeholder="post-workout high-protein meal"
              value={workoutContext}
              onChange={setWorkoutContext}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {pantryItems.length === 0 ? <span className="text-base text-doom-muted">No pantry items saved yet.</span> : null}
            {pantryItems.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>

          {generatedMeals.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {generatedMeals.map((meal) => (
                <article key={meal.title} className="rounded-xl border border-doom-primary/20 bg-doom-bg/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-doom-text">{meal.title}</h3>
                      <p className="text-base text-doom-muted">{meal.description}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void saveGeneratedRecipe(meal, "generated")}
                      disabled={savingRecipeState === meal.title}
                    >
                      {savingRecipeState === meal.title ? "Saving..." : "Save Recipe"}
                    </button>
                  </div>

                  <p className="text-base text-doom-text">
                    <strong>Result:</strong> {meal.result}
                  </p>
                  <p className="text-base text-doom-text">
                    <strong>Why it fits:</strong> {meal.why_it_fits}
                  </p>
                  <p className="text-base text-doom-text">
                    <strong>Confidence:</strong> {meal.confidence}
                  </p>
                  <p className="text-base text-doom-accent">
                    <strong>{meal.also_check}</strong>
                  </p>

                  <div>
                    <p className="text-base uppercase tracking-wide text-doom-muted mb-1">Ingredients</p>
                    <ul className="text-base text-doom-text list-disc pl-5 space-y-1">
                      {meal.ingredients.map((ingredient) => (
                        <li key={ingredient}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-base uppercase tracking-wide text-doom-muted mb-1">Steps</p>
                    <ol className="text-base text-doom-text list-decimal pl-5 space-y-1">
                      {meal.instructions.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className={`module-card ${activeSection === "optimizer" ? "block" : "hidden"}`} id="optimizer">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="module-title">Authentic Dish Optimizer</h2>
              <p className="module-subtitle">Preserve traditional identity while making protein or balance-oriented adjustments.</p>
            </div>
            <button className="btn-primary" type="button" onClick={() => void optimizeAuthenticHandler()} disabled={optimizingAuthState}>
              {optimizingAuthState ? "Optimizing..." : "Optimize Dish"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Dish request"
              placeholder="Pad Thai but more protein"
              value={authQuery}
              onChange={setAuthQuery}
            />
            <Field label="Cuisine (optional)" placeholder="Thai" value={authCuisine} onChange={setAuthCuisine} />
            <Field
              label="Optimization preferences"
              placeholder="less oil, extra protein"
              value={authPreferences}
              onChange={setAuthPreferences}
            />
          </div>

          {authResult ? (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <article className="rounded-xl border border-doom-primary/20 bg-doom-bg/40 p-4">
                <h3 className="text-lg font-semibold text-doom-text">Traditional Baseline</h3>
                <p className="text-base text-doom-muted mt-2">{authResult.baseline.traditional_summary}</p>
                <p className="text-base text-doom-muted mt-3">Source reference: {authResult.baseline.source_reference}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {authResult.baseline.core_ingredients.map((ingredient) => (
                    <span key={ingredient} className="chip">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-doom-accent/30 bg-doom-bg/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-doom-text">{authResult.optimized_recipe.title}</h3>
                    <p className="text-base text-doom-muted">{authResult.optimized_recipe.description}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void saveGeneratedRecipe(authResult.optimized_recipe, "optimized_authentic")}
                    disabled={savingRecipeState === authResult.optimized_recipe.title}
                  >
                    {savingRecipeState === authResult.optimized_recipe.title ? "Saving..." : "Save Recipe"}
                  </button>
                </div>

                <p className="text-base text-doom-text">
                  <strong>Result:</strong> {authResult.optimized_recipe.result}
                </p>
                <p className="text-base text-doom-text">
                  <strong>Why it fits:</strong> {authResult.optimized_recipe.why_it_fits}
                </p>
                <p className="text-base text-doom-text">
                  <strong>Confidence:</strong> {authResult.optimized_recipe.confidence}
                </p>
                <p className="text-base text-doom-accent">
                  <strong>{authResult.optimized_recipe.also_check}</strong>
                </p>

                <div>
                  <p className="text-base uppercase tracking-wide text-doom-muted mb-1">What changed</p>
                  <ul className="text-base text-doom-text list-disc pl-5 space-y-1">
                    {authResult.change_summary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        <section className={`module-card ${activeSection === "library" ? "block" : "hidden"}`} id="library">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="module-title">Saved Recipe Library</h2>
              <p className="module-subtitle">Search, filter, tweak, duplicate, and manage saved generated or custom recipes.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" type="button" onClick={() => void resetFiltersHandler()}>
                Reset
              </button>
              <button className="btn-primary" type="button" onClick={() => void applyFiltersHandler()} disabled={loadingLibraryState}>
                <Search className="w-4 h-4 mr-2" />
                {loadingLibraryState ? "Filtering..." : "Apply Filters"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Search"
              placeholder="chicken, pad thai, tofu"
              value={libraryFilters.search}
              onChange={(value) => setLibraryFilters((prev) => ({ ...prev, search: value }))}
            />
            <Field
              label="Tags (comma-separated)"
              placeholder="high-protein, vegetarian"
              value={libraryFilters.tags}
              onChange={(value) => setLibraryFilters((prev) => ({ ...prev, tags: value }))}
            />
            <Field
              label="Cuisine"
              placeholder="Indian"
              value={libraryFilters.cuisine}
              onChange={(value) => setLibraryFilters((prev) => ({ ...prev, cuisine: value }))}
            />
            <Field
              label="Protein focus"
              placeholder="high"
              value={libraryFilters.proteinFocus}
              onChange={(value) => setLibraryFilters((prev) => ({ ...prev, proteinFocus: value }))}
            />
            <Field
              label="Dietary type"
              placeholder="vegetarian"
              value={libraryFilters.dietary}
              onChange={(value) => setLibraryFilters((prev) => ({ ...prev, dietary: value }))}
            />
            <div>
              <label className="text-base text-doom-muted">Source type</label>
              <select
                className="input-field mt-1"
                value={libraryFilters.sourceType}
                onChange={(event) => setLibraryFilters((prev) => ({ ...prev, sourceType: event.target.value }))}
              >
                <option value="">Any</option>
                <option value="generated">Generated</option>
                <option value="optimized_authentic">Optimized Authentic</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-base text-doom-text mt-3">
            <input
              type="checkbox"
              checked={libraryFilters.onlySaved}
              onChange={(event) => setLibraryFilters((prev) => ({ ...prev, onlySaved: event.target.checked }))}
            />
            Show saved recipes only
          </label>

          {librarySeeded ? <p className="text-base text-doom-muted mt-2">Showing seeded demo recipes because your saved library is empty.</p> : null}

          <div className="mt-5 space-y-4">
            {libraryEntries.length === 0 ? <p className="text-base text-doom-muted">No recipes found for current filters.</p> : null}
            {libraryEntries.map((entry) => (
              <article key={entry.recipe._id || entry.recipe.title} className="rounded-xl border border-doom-primary/20 bg-doom-bg/40 p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-doom-text">{entry.recipe.title}</h3>
                    <p className="text-base text-doom-muted">
                      Source: {entry.recipe.source_type} {entry.recipe.cuisine ? `| Cuisine: ${entry.recipe.cuisine}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.recipe.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => void toggleSaveHandler(entry)}
                      disabled={savingRecipeState === (entry.recipe._id || "")}
                    >
                      {entry.saved ? "Unsave" : "Save"}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => void duplicateRecipeHandler(entry)}
                      disabled={savingRecipeState === (entry.recipe._id || "")}
                    >
                      Duplicate
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-base text-doom-text">
                  <p>
                    <strong>Result:</strong> {entry.recipe.result_summary}
                  </p>
                  <p>
                    <strong>Why it fits:</strong> {entry.recipe.why_it_fits}
                  </p>
                  <p>
                    <strong>Confidence:</strong> {entry.recipe.confidence}
                  </p>
                  <p className="text-doom-accent">
                    <strong>{entry.recipe.grounding_line}</strong>
                  </p>
                </div>

                <p className="text-base text-doom-muted mt-2">Saved tweaks: {entry.modification_count}</p>

                <div className="mt-3 flex flex-col md:flex-row gap-2">
                  <input
                    className="input-field"
                    placeholder="add tofu, reduce oil, remove peanuts, increase serving size"
                    value={entry.recipe._id ? tweakByRecipe[entry.recipe._id] || "" : ""}
                    onChange={(event) => {
                      if (!entry.recipe._id) return;
                      setTweakByRecipe((prev) => ({
                        ...prev,
                        [entry.recipe._id as string]: event.target.value,
                      }));
                    }}
                  />
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => void applyTweakHandler(entry)}
                    disabled={savingRecipeState === (entry.recipe._id || "")}
                  >
                    Apply Tweak
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`module-card ${activeSection === "custom" ? "block" : "hidden"}`} id="custom">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="module-title">Add Custom Recipe</h2>
              <p className="module-subtitle">Manually add your own recipes and save them directly to the library.</p>
            </div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => void saveCustomRecipeHandler()}
              disabled={savingCustomRecipeState}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {savingCustomRecipeState ? "Saving..." : "Add Recipe"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Recipe title"
              placeholder="High-protein chickpea bowl"
              value={customRecipe.title}
              onChange={(value) => setCustomRecipe((prev) => ({ ...prev, title: value }))}
            />
            <Field
              label="Cuisine"
              placeholder="Mediterranean"
              value={customRecipe.cuisine}
              onChange={(value) => setCustomRecipe((prev) => ({ ...prev, cuisine: value }))}
            />
            <div>
              <label className="text-base text-doom-muted">Ingredients (one per line)</label>
              <textarea
                className="textarea-field mt-1"
                value={customRecipe.ingredients}
                onChange={(event) => setCustomRecipe((prev) => ({ ...prev, ingredients: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-base text-doom-muted">Instructions (one per line)</label>
              <textarea
                className="textarea-field mt-1"
                value={customRecipe.instructions}
                onChange={(event) => setCustomRecipe((prev) => ({ ...prev, instructions: event.target.value }))}
              />
            </div>
            <Field
              label="Tags (comma-separated)"
              placeholder="high-protein, quick"
              value={customRecipe.tags}
              onChange={(value) => setCustomRecipe((prev) => ({ ...prev, tags: value }))}
            />
            <Field
              label="Notes"
              placeholder="Optional notes"
              value={customRecipe.notes}
              onChange={(value) => setCustomRecipe((prev) => ({ ...prev, notes: value }))}
            />
          </div>
        </section>

        <section className={`module-card ${activeSection === "insights" ? "block" : "hidden"}`} id="insights">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="module-title">Wellness Nutrition Insights</h2>
              <p className="module-subtitle">Simple trend snippets that connect profile and recipe patterns.</p>
            </div>
            <button className="btn-primary" type="button" onClick={() => void generateInsightsHandler()} disabled={generatingInsightsState}>
              <Refrigerator className="w-4 h-4 mr-2" />
              {generatingInsightsState ? "Generating..." : "Generate Insights"}
            </button>
          </div>

          {insightsSeeded ? <p className="text-base text-doom-muted mb-3">Showing seeded insight cards for first-run demo context.</p> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.length === 0 ? <p className="text-base text-doom-muted">No insights yet.</p> : null}
            {insights.map((insight, index) => (
              <article key={`${insight.insight_type}-${index}`} className="rounded-xl border border-doom-primary/20 bg-doom-bg/40 p-4">
                <p className="text-base uppercase tracking-wide text-doom-muted">{insight.insight_type}</p>
                <p className="text-base text-doom-text mt-2">{insight.message}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {insight.related_signals.map((signal) => (
                    <span key={signal} className="chip">
                      {signal}
                    </span>
                  ))}
                </div>
                <p className="text-base text-doom-muted mt-3">Confidence: {insight.confidence}</p>
                <p className="text-base text-doom-accent mt-2">
                  <strong>{insight.grounding_line}</strong>
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="module-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base uppercase tracking-wide text-doom-muted">{label}</p>
          <p className="text-base sm:text-base text-doom-text mt-2">{loading ? "Loading..." : value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-base text-doom-muted">{label}</label>
      <input
        className="input-field mt-1"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

