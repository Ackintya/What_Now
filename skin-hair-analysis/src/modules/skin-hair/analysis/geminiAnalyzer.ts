import { GoogleGenerativeAI } from "@google/generative-ai";
import { ANALYSIS_GROUNDING_LINES } from "../constants";
import type { HairAnalysisResult, SkinAnalysisResult, SkinHairProfile } from "../types";
import { clampScore, sanitizeObservation } from "./safeText";
import type { AppearanceAnalyzer } from "./types";

function extractJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini response did not contain JSON");
  }

  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function listContext(profile: Partial<SkinHairProfile>) {
  return [
    `skin_type: ${profile.skin_type || "unknown"}`,
    `scalp_type: ${profile.scalp_type || "unknown"}`,
    `concerns: ${profile.concerns?.join(", ") || "none"}`,
    `sensitivities: ${profile.sensitivities?.join(", ") || "none"}`,
  ].join("\n");
}

export class GeminiAppearanceAnalyzer implements AppearanceAnalyzer {
  providerName = "gemini-fallback";

  private genAI;
  private modelCandidates = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async generateWithFallback(
    parts: string | Array<string | { inlineData: { mimeType: string; data: string } }>,
  ) {
    let lastError: unknown = null;

    for (const modelName of this.modelCandidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts as any);
        this.providerName = modelName;
        return result;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No Gemini model candidate succeeded");
  }

  async analyzeSkin(base64Image: string, profile: Partial<SkinHairProfile>): Promise<SkinAnalysisResult> {
    const prompt = `
You analyze visible facial appearance only. No diagnosis, no treatment, no disease naming.
Return strict JSON only with keys:
{
  "dryness_score": number 0-100,
  "oiliness_score": number 0-100,
  "acne_like_appearance_score": number 0-100,
  "dark_circles_score": number 0-100,
  "confidence": number 0-100,
  "brief_observation": "one short sentence using appearance/signal language"
}
Allowed language in brief_observation: "possible", "appearance", "visible pattern", "may align", "signal".
Forbidden language: "you have", "diagnosed", "caused by", "proves", treatment recommendations.
Use only what is visible in the image.

User context:
${listContext(profile)}
`;

    const response = await this.generateWithFallback([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ]);

    const parsed = extractJson(response.response.text());

    return {
      dryness_score: clampScore(parsed.dryness_score),
      oiliness_score: clampScore(parsed.oiliness_score),
      acne_like_appearance_score: clampScore(parsed.acne_like_appearance_score),
      dark_circles_score: clampScore(parsed.dark_circles_score),
      confidence: clampScore(parsed.confidence),
      brief_observation: sanitizeObservation(
        parsed.brief_observation,
        "Possible appearance signal: visible dryness pattern with mild under-eye fatigue appearance.",
      ),
      grounding_line: ANALYSIS_GROUNDING_LINES.skin,
    };
  }

  async analyzeHair(base64Image: string, profile: Partial<SkinHairProfile>): Promise<HairAnalysisResult> {
    const prompt = `
You analyze visible scalp/hair appearance only. No diagnosis, no treatment, no disease naming.
Return strict JSON only with keys:
{
  "scalp_dryness_score": number 0-100,
  "dandruff_like_flaking_score": number 0-100,
  "thinning_appearance_score": number 0-100,
  "confidence": number 0-100,
  "brief_observation": "one short sentence using appearance/signal language"
}
Allowed language in brief_observation: "possible", "appearance", "visible pattern", "may align", "signal".
Forbidden language: "you have", "diagnosed", "caused by", "proves", treatment recommendations.
Use only what is visible in the image.

User context:
${listContext(profile)}
`;

    const response = await this.generateWithFallback([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ]);

    const parsed = extractJson(response.response.text());

    return {
      scalp_dryness_score: clampScore(parsed.scalp_dryness_score),
      dandruff_like_flaking_score: clampScore(parsed.dandruff_like_flaking_score),
      thinning_appearance_score: clampScore(parsed.thinning_appearance_score),
      confidence: clampScore(parsed.confidence),
      brief_observation: sanitizeObservation(
        parsed.brief_observation,
        "Possible appearance signal: visible flaking pattern with mild thinning appearance.",
      ),
      grounding_line: ANALYSIS_GROUNDING_LINES.hair,
    };
  }
}
