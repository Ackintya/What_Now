import { CONCERN_OPTIONS, SCALP_TYPES, SKIN_TYPES } from "./constants";
import type { SkinHairProfile } from "./types";

export function splitCommaInput(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function uniqueList(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function validateProfilePayload(payload: Record<string, unknown>) {
  const skinType = String(payload.skin_type || "").toLowerCase();
  const scalpType = String(payload.scalp_type || "").toLowerCase();

  if (!SKIN_TYPES.includes(skinType as SkinHairProfile["skin_type"])) {
    throw new Error("Invalid skin_type");
  }

  if (!SCALP_TYPES.includes(scalpType as SkinHairProfile["scalp_type"])) {
    throw new Error("Invalid scalp_type");
  }

  const rawConcerns = Array.isArray(payload.concerns) ? payload.concerns : [];
  const concerns = uniqueList(rawConcerns.map((item) => String(item).toLowerCase())).filter((concern) =>
    CONCERN_OPTIONS.includes(concern as SkinHairProfile["concerns"][number]),
  );

  return {
    skin_type: skinType as SkinHairProfile["skin_type"],
    scalp_type: scalpType as SkinHairProfile["scalp_type"],
    concerns: concerns as SkinHairProfile["concerns"],
    allergies: uniqueList((Array.isArray(payload.allergies) ? payload.allergies : []).map((item) => String(item).toLowerCase())),
    sensitivities: uniqueList(
      (Array.isArray(payload.sensitivities) ? payload.sensitivities : []).map((item) => String(item).toLowerCase()),
    ),
    preferred_categories: uniqueList(
      (Array.isArray(payload.preferred_categories) ? payload.preferred_categories : []).map((item) =>
        String(item).toLowerCase(),
      ),
    ),
  };
}

export function validateImageType(fileType: string): boolean {
  return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(fileType.toLowerCase());
}

export function parseUserId(searchParams: URLSearchParams): string {
  const userId = searchParams.get("userId");
  if (!userId) {
    throw new Error("userId is required");
  }
  return userId;
}
