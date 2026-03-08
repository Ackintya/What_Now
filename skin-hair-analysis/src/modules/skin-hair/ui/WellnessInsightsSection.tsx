import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { WellnessInsightPayload } from "./types";

interface WellnessInsightsSectionProps {
  insights: WellnessInsightPayload[];
  onGenerate: () => Promise<void>;
  loading: boolean;
  defaultOpen?: boolean;
}

const INSIGHT_LABELS: Record<string, string> = {
  dryness_vs_sleep: "Dryness vs Sleep",
  scalp_dryness_vs_nutrition: "Scalp Dryness vs Nutrition",
  dark_circles_vs_fatigue: "Dark Circles vs Fatigue",
  thinning_vs_supplement_consistency: "Thinning vs Supplement Consistency",
  insufficient_pattern: "Pattern Status",
};

export function WellnessInsightsSection({
  insights,
  onGenerate,
  loading,
  defaultOpen = false,
}: WellnessInsightsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id="insights" className="module-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="module-title">Wellness Insights</h3>
          <p className="module-subtitle">
            Lightweight observational pattern cards from sleep, workout fatigue, nutrition, supplement consistency, and appearance logs.
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
              {loading ? "Refreshing..." : "Refresh insights"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            {insights.length === 0 ? (
              <p className="text-sm text-doom-muted">No insight cards yet. Analyze skin/hair first, then refresh insights.</p>
            ) : (
              insights.map((insight) => (
                <div key={insight._id || insight.insight_type} className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4">
                  <p className="font-semibold text-doom-text">{INSIGHT_LABELS[insight.insight_type] || "Wellness pattern"}</p>
                  <p className="text-sm text-doom-text mt-2">Result: {insight.message}</p>
                  <p className="text-sm text-doom-muted mt-1">
                    Why it fits: Signals observed across {insight.related_signals.join(", ")}. This is observational only.
                  </p>
                  <p className="text-xs text-doom-accent mt-1">Confidence: {insight.confidence}</p>
                  <p className="text-xs text-doom-muted mt-2">{insight.grounding_line}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
