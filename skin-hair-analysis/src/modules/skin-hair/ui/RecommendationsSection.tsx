import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LovedProductPayload, RecommendationPayload } from "./types";

interface RecommendationsSectionProps {
  recommendations: RecommendationPayload[];
  lovedProducts: LovedProductPayload[];
  onGenerate: () => Promise<void>;
  onSaveToLoved: (recommendation: RecommendationPayload) => Promise<void>;
  loading: boolean;
  saveToLovedLoading: boolean;
  defaultOpen?: boolean;
}

export function RecommendationsSection({
  recommendations,
  lovedProducts,
  onGenerate,
  onSaveToLoved,
  loading,
  saveToLovedLoading,
  defaultOpen = false,
}: RecommendationsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id="recommendations" className="module-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="module-title">Product Recommendations</h3>
          <p className="module-subtitle">
            Want to find products similar to what you already love? Generate Gemini-discovered options scored with deterministic ingredient overlap and sensitivity filtering.
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={() => setIsOpen((prev) => !prev)}>
          <span>{isOpen ? "Hide" : "Open"}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!isOpen ? null : (
        <>
          <div className="flex justify-end mt-5">
            <button type="button" className="btn-primary" onClick={onGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate recommendations"}
            </button>
          </div>

          <div className="space-y-3 mt-5">
            {recommendations.length === 0 ? (
              <p className="text-sm text-doom-muted">No recommendations yet. Save profile and loved products first.</p>
            ) : (
              recommendations.map((recommendation) => {
                const alreadySaved = lovedProducts.some(
                  (product) =>
                    product.product_name.trim().toLowerCase() === recommendation.product_name.trim().toLowerCase() &&
                    product.brand.trim().toLowerCase() === recommendation.brand.trim().toLowerCase(),
                );

                return (
                  <div
                    key={recommendation._id || recommendation.product_name}
                    className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-doom-text">{recommendation.product_name}</p>
                        <p className="text-sm text-doom-muted">
                          {recommendation.brand} - {recommendation.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="chip">Match score: {recommendation.match_score}</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={alreadySaved || saveToLovedLoading}
                          onClick={() => onSaveToLoved(recommendation)}
                        >
                          {alreadySaved ? "Saved" : saveToLovedLoading ? "Saving..." : "Save to loved"}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-doom-text mt-3">
                      Result: {recommendation.product_name} appears compatible with your current product fingerprint.
                    </p>
                    <p className="text-sm text-doom-muted mt-1">Why it fits: {recommendation.recommendation_reason}</p>
                    <p className="text-xs text-doom-accent mt-1">Confidence: {recommendation.confidence}</p>
                    {recommendation.recommendation_source ? (
                      <p className="text-xs text-doom-muted mt-1">Source: {recommendation.recommendation_source}</p>
                    ) : null}
                    {recommendation.product_url ? (
                      <p className="text-xs text-doom-muted mt-1">
                        <a
                          href={recommendation.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-doom-accent underline"
                        >
                          Take a look and check out the ingredients for yourself.
                        </a>
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recommendation.matched_ingredients.map((ingredient) => (
                        <span key={`${recommendation._id}-${ingredient}`} className="chip">
                          matched: {ingredient}
                        </span>
                      ))}
                    </div>

                    {recommendation.blocked_ingredients_avoided.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recommendation.blocked_ingredients_avoided.map((ingredient) => (
                          <span
                            key={`${recommendation._id}-blocked-${ingredient}`}
                            className="chip text-green-300 border-green-500/30"
                          >
                            avoided: {ingredient}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <p className="text-xs text-doom-muted mt-3">{recommendation.grounding_line}</p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}
