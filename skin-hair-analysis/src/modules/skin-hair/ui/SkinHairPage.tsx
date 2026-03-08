"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_USER_ID } from "../constants";
import {
  analyzeImage,
  createLovedProduct,
  fetchLovedProducts,
  fetchProfile,
  fetchRecommendations,
  fetchSummary,
  fetchWellnessInsights,
  generateRecommendations,
  generateWellnessInsights,
  removeLovedProduct,
  saveProfile,
  updateLovedProduct,
} from "./api";
import { AnalysisSection } from "./AnalysisSection";
import { LovedProductsSection } from "./LovedProductsSection";
import { ProfileSection } from "./ProfileSection";
import { RecommendationsSection } from "./RecommendationsSection";
import { SummaryCards } from "./SummaryCards";
import type {
  AnalysisPayload,
  CreateLovedProductPayload,
  LovedProductPayload,
  ProfilePayload,
  RecommendationPayload,
  SummaryPayload,
  WellnessInsightPayload,
} from "./types";
import { WellnessInsightsSection } from "./WellnessInsightsSection";

const DEFAULT_PROFILE = (userId: string): ProfilePayload => ({
  user_id: userId,
  skin_type: "combination",
  scalp_type: "balanced",
  concerns: [],
  allergies: [],
  sensitivities: [],
  preferred_categories: [],
});

type SectionKey = "profile" | "products" | "recommendations" | "analysis" | "insights";

export function SkinHairPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const [profile, setProfile] = useState<ProfilePayload>(DEFAULT_PROFILE(DEFAULT_USER_ID));
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [products, setProducts] = useState<LovedProductPayload[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationPayload[]>([]);
  const [insights, setInsights] = useState<WellnessInsightPayload[]>([]);
  const [skinResult, setSkinResult] = useState<AnalysisPayload | null>(null);
  const [hairResult, setHairResult] = useState<AnalysisPayload | null>(null);

  const [initializing, setInitializing] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analyzingTarget, setAnalyzingTarget] = useState<"skin" | "hair" | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");

  const showStatus = useCallback((message: string, type: "info" | "error" = "info") => {
    setStatusType(type);
    setStatusMessage(message);
  }, []);

  const loadAll = useCallback(async () => {
    setInitializing(true);

    try {
      const [profileResult, summaryResult, productsResult, recommendationResult, insightResult] = await Promise.all([
        fetchProfile(userId),
        fetchSummary(userId),
        fetchLovedProducts(userId),
        fetchRecommendations(userId),
        fetchWellnessInsights(userId),
      ]);

      setProfile(profileResult || DEFAULT_PROFILE(userId));
      setSummary(summaryResult);
      setProducts(productsResult);
      setRecommendations(recommendationResult);
      setInsights(insightResult);
      showStatus("Module data loaded.", "info");
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

  const saveProfileHandler = useCallback(async () => {
    try {
      setSavingProfile(true);
      const saved = await saveProfile({ ...profile, user_id: userId });
      setProfile(saved);
      setSummary(await fetchSummary(userId));
      showStatus("Profile saved.", "info");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setSavingProfile(false);
    }
  }, [profile, showStatus, userId]);

  const analyzeHandler = useCallback(
    async (target: "skin" | "hair", file: File) => {
      try {
        setAnalyzingTarget(target);
        const result = await analyzeImage({ userId, target, file });

        if (target === "skin") {
          setSkinResult(result);
        } else {
          setHairResult(result);
        }

        setSummary(await fetchSummary(userId));
        showStatus(`${target === "skin" ? "Skin" : "Hair"} analysis completed.`, "info");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setAnalyzingTarget(null);
      }
    },
    [showStatus, userId],
  );

  const addProductHandler = useCallback(
    async (product: CreateLovedProductPayload) => {
      try {
        setProductsLoading(true);
        await createLovedProduct({ ...product, user_id: userId });
        const [nextProducts, nextSummary] = await Promise.all([fetchLovedProducts(userId), fetchSummary(userId)]);
        setProducts(nextProducts);
        setSummary(nextSummary);
        showStatus("Loved product saved.", "info");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setProductsLoading(false);
      }
    },
    [showStatus, userId],
  );

  const deleteProductHandler = useCallback(
    async (productId: string) => {
      try {
        setProductsLoading(true);
        await removeLovedProduct(userId, productId);
        const [nextProducts, nextSummary] = await Promise.all([fetchLovedProducts(userId), fetchSummary(userId)]);
        setProducts(nextProducts);
        setSummary(nextSummary);
        showStatus("Loved product deleted.", "info");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setProductsLoading(false);
      }
    },
    [showStatus, userId],
  );

  const updateProductHandler = useCallback(
    async (productId: string, patch: Partial<CreateLovedProductPayload>) => {
      try {
        setProductsLoading(true);
        await updateLovedProduct(productId, {
          ...patch,
          user_id: userId,
        });

        setProducts(await fetchLovedProducts(userId));
        showStatus("Loved product updated.", "info");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setProductsLoading(false);
      }
    },
    [showStatus, userId],
  );

  const generateRecommendationsHandler = useCallback(async () => {
    try {
      setRecommendationsLoading(true);
      const next = await generateRecommendations(userId);
      setRecommendations(next);
      setSummary(await fetchSummary(userId));
      showStatus("Recommendations generated.", "info");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setRecommendationsLoading(false);
    }
  }, [showStatus, userId]);

  const saveRecommendationToLovedHandler = useCallback(
    async (recommendation: RecommendationPayload) => {
      const alreadySaved = products.some(
        (product) =>
          product.product_name.trim().toLowerCase() === recommendation.product_name.trim().toLowerCase() &&
          product.brand.trim().toLowerCase() === recommendation.brand.trim().toLowerCase(),
      );

      if (alreadySaved) {
        showStatus("This product is already in loved products.", "info");
        return;
      }

      try {
        setProductsLoading(true);
        await createLovedProduct({
          user_id: userId,
          product_name: recommendation.product_name,
          brand: recommendation.brand,
          category: recommendation.category,
        });

        const [nextProducts, nextSummary] = await Promise.all([fetchLovedProducts(userId), fetchSummary(userId)]);
        setProducts(nextProducts);
        setSummary(nextSummary);
        showStatus("Recommendation saved to loved products.", "info");
      } catch (error) {
        console.error(error);
        showStatus((error as Error).message, "error");
      } finally {
        setProductsLoading(false);
      }
    },
    [products, showStatus, userId],
  );

  const refreshInsightsHandler = useCallback(async () => {
    try {
      setInsightsLoading(true);
      const next = await generateWellnessInsights(userId);
      setInsights(next);
      setSummary(await fetchSummary(userId));
      showStatus("Wellness insights refreshed.", "info");
    } catch (error) {
      console.error(error);
      showStatus((error as Error).message, "error");
    } finally {
      setInsightsLoading(false);
    }
  }, [showStatus, userId]);

  const statusClass = useMemo(
    () =>
      statusType === "error"
        ? "border-red-500/40 bg-red-500/10 text-red-200"
        : "border-doom-accent/40 bg-doom-accent/10 text-doom-text",
    [statusType],
  );

  const sectionButtons: Array<{ key: SectionKey; label: string }> = [
    { key: "profile", label: "Profile" },
    { key: "products", label: "Loved Products" },
    { key: "recommendations", label: "Recommendations" },
    { key: "analysis", label: "Analysis" },
    { key: "insights", label: "Wellness Insights" },
  ];

  const renderActiveSection = () => {
    if (activeSection === "profile") {
      return (
        <ProfileSection
          profile={profile}
          onChange={(next) => setProfile({ ...next, user_id: userId })}
          onSave={saveProfileHandler}
          saving={savingProfile}
          defaultOpen
        />
      );
    }

    if (activeSection === "products") {
      return (
        <LovedProductsSection
          products={products}
          onAdd={addProductHandler}
          onDelete={deleteProductHandler}
          onUpdate={updateProductHandler}
          loading={productsLoading}
          userId={userId}
          defaultOpen
        />
      );
    }

    if (activeSection === "recommendations") {
      return (
        <RecommendationsSection
          recommendations={recommendations}
          lovedProducts={products}
          onGenerate={generateRecommendationsHandler}
          onSaveToLoved={saveRecommendationToLovedHandler}
          loading={recommendationsLoading}
          saveToLovedLoading={productsLoading}
          defaultOpen
        />
      );
    }

    if (activeSection === "analysis") {
      return (
        <AnalysisSection
          skinResult={skinResult}
          hairResult={hairResult}
          analyzingTarget={analyzingTarget}
          onAnalyze={analyzeHandler}
          defaultOpen
        />
      );
    }

    return (
      <WellnessInsightsSection
        insights={insights}
        onGenerate={refreshInsightsHandler}
        loading={insightsLoading}
        defaultOpen
      />
    );
  };

  return (
    <main className="min-h-screen pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="module-card">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-doom-muted">Testing user context</p>
              <h1 className="text-2xl font-bold text-doom-text">Skin & Hair Module Workspace</h1>
            </div>
            <div className="w-full md:w-80">
              <label className="text-xs text-doom-muted">User ID</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="input-field"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="demo-user"
                />
                <button className="btn-secondary" type="button" onClick={() => void loadAll()}>
                  Load
                </button>
              </div>
            </div>
          </div>

          {statusMessage ? <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${statusClass}`}>{statusMessage}</p> : null}
        </div>

        <SummaryCards summary={summary} loading={initializing} />
        <div className="module-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {sectionButtons.map((section) => {
              const active = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full px-4 py-3 rounded-lg border text-base font-medium transition ${
                    active
                      ? "border-doom-accent bg-doom-accent/20 text-doom-accent"
                      : "border-doom-primary/30 text-doom-text hover:bg-doom-bg/50"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {renderActiveSection()}
      </div>
    </main>
  );
}
