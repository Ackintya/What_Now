import type { PrimaryGoal, SourceType } from "./types";

export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "demo-user";

export const PRIMARY_GOALS: Array<{ label: string; value: PrimaryGoal }> = [
  { label: "Muscle Gain", value: "muscle_gain" },
  { label: "Fat Loss", value: "fat_loss" },
  { label: "Maintenance", value: "maintenance" },
  { label: "General Wellness", value: "general_wellness" },
  { label: "High Protein", value: "high_protein" },
];

export const SOURCE_TYPES: SourceType[] = ["generated", "optimized_authentic", "custom"];

export const DIETARY_PRESET_OPTIONS = ["omnivore", "vegetarian", "vegan", "pescatarian", "halal", "gluten-free"];

export const GROUNDING_LINES = {
  recipe: "Also check: the recipe ingredient list and serving sizes before cooking.",
  nutrition_label: "Also check: the official nutrition label for exact protein and calorie details.",
  authentic: "Also check: a trusted recipe source for the traditional baseline version of this dish.",
  menu: "Also check: the restaurant's official menu or nutrition page for exact details.",
  insights: "Also check: your recent meal logs and product labels to verify this trend over the week.",
} as const;

export const MODULE_GUARDRAIL_TEXT =
  "This module supports meal planning and wellness-oriented nutrition guidance. It does not provide medical diagnosis or treatment advice.";

export const BANNED_CLAIMS = [
  "perfect diet",
  "medically required",
  "guaranteed fat loss",
  "this will cure",
  "only healthy option",
  "diagnosis",
  "treatment",
  "prescription",
];
