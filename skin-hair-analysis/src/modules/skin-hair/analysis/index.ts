import type { HairAnalysisResult, SkinAnalysisResult, SkinHairProfile } from "../types";
import { GeminiAppearanceAnalyzer } from "./geminiAnalyzer";
import { MockAppearanceAnalyzer } from "./mockAnalyzer";
import type { AppearanceAnalyzer } from "./types";

function getAnalyzer(): AppearanceAnalyzer {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new MockAppearanceAnalyzer();
  }

  try {
    return new GeminiAppearanceAnalyzer(apiKey);
  } catch (error) {
    console.error("Gemini analyzer initialization failed, falling back to mock analyzer:", error);
    return new MockAppearanceAnalyzer();
  }
}

export async function analyzeSkinImage(
  base64Image: string,
  profile: Partial<SkinHairProfile>,
): Promise<{ result: SkinAnalysisResult; provider: string }> {
  const analyzer = getAnalyzer();

  try {
    const result = await analyzer.analyzeSkin(base64Image, profile);
    return { result, provider: analyzer.providerName };
  } catch (error) {
    console.error("Skin analysis failed with primary analyzer, using mock analyzer:", error);
    const fallback = new MockAppearanceAnalyzer();
    const result = await fallback.analyzeSkin(base64Image, profile);
    return { result, provider: fallback.providerName };
  }
}

export async function analyzeHairImage(
  base64Image: string,
  profile: Partial<SkinHairProfile>,
): Promise<{ result: HairAnalysisResult; provider: string }> {
  const analyzer = getAnalyzer();

  try {
    const result = await analyzer.analyzeHair(base64Image, profile);
    return { result, provider: analyzer.providerName };
  } catch (error) {
    console.error("Hair analysis failed with primary analyzer, using mock analyzer:", error);
    const fallback = new MockAppearanceAnalyzer();
    const result = await fallback.analyzeHair(base64Image, profile);
    return { result, provider: fallback.providerName };
  }
}
