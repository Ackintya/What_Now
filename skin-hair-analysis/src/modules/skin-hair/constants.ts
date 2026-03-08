import type { ScalpType, SkinHairConcern, SkinType } from "./types";

export const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "sensitive"];
export const SCALP_TYPES: ScalpType[] = ["dry", "oily", "balanced", "sensitive"];

export const CONCERN_OPTIONS: SkinHairConcern[] = [
  "acne",
  "dryness",
  "oiliness",
  "dark circles",
  "dandruff",
  "thinning",
  "irritation",
];

export const PRODUCT_CATEGORIES = [
  "cleanser",
  "moisturizer",
  "serum",
  "sunscreen",
  "shampoo",
  "conditioner",
  "scalp serum",
];

export const ANALYSIS_GROUNDING_LINES = {
  skin:
    "Also check: the product label and a dermatologist-approved skincare guide if irritation keeps showing up.",
  hair:
    "Also check: the shampoo or scalp product label for sulfate and fragrance content before routine changes.",
} as const;

export const WELLNESS_GROUNDING_LINE =
  "Also check: your sleep and routine logs to confirm if this pattern keeps repeating over multiple weeks.";

export const RECOMMENDATION_GROUNDING_LINE =
  "Also check: the full ingredient list on the product label to confirm it avoids your sensitivities.";

export const SAFE_TERMS = [
  "possible",
  "appearance",
  "visible pattern",
  "may align",
  "signal",
];

export const FORBIDDEN_TERMS = [
  "diagnosed",
  "you have",
  "this proves",
  "caused by",
  "disease",
  "treatment",
  "cure",
];

export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "demo-user";
