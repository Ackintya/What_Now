import {
  getLatestHairLog,
  getLatestSkinLog,
  getSkinHairProfile,
  listLovedProducts,
  listRecommendations,
  listWellnessInsights,
} from "./repositories";

export interface SkinHairSummary {
  profile_ready: boolean;
  loved_products_count: number;
  recommendations_count: number;
  latest_skin_signal: string;
  latest_hair_signal: string;
  latest_insight: string;
}

export async function getSkinHairSummary(userId: string): Promise<SkinHairSummary> {
  const [profile, lovedProducts, recommendations, latestSkinLog, latestHairLog, wellnessInsights] =
    await Promise.all([
      getSkinHairProfile(userId),
      listLovedProducts(userId),
      listRecommendations(userId),
      getLatestSkinLog(userId),
      getLatestHairLog(userId),
      listWellnessInsights(userId),
    ]);

  return {
    profile_ready: Boolean(profile),
    loved_products_count: lovedProducts.length,
    recommendations_count: recommendations.length,
    latest_skin_signal: latestSkinLog
      ? `Dryness ${latestSkinLog.dryness_score} / Dark circles ${latestSkinLog.dark_circles_score}`
      : "No skin analysis yet",
    latest_hair_signal: latestHairLog
      ? `Scalp dryness ${latestHairLog.scalp_dryness_score} / Thinning ${latestHairLog.thinning_appearance_score}`
      : "No hair analysis yet",
    latest_insight: wellnessInsights[0]?.message || "No wellness insights yet",
  };
}
