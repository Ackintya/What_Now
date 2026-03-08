import type { HairAnalysisResult, SkinAnalysisResult, SkinHairProfile } from "../types";

export type AnalysisTarget = "skin" | "hair";

export interface AppearanceAnalyzer {
  analyzeSkin(base64Image: string, profile: Partial<SkinHairProfile>): Promise<SkinAnalysisResult>;
  analyzeHair(base64Image: string, profile: Partial<SkinHairProfile>): Promise<HairAnalysisResult>;
  providerName: string;
}
