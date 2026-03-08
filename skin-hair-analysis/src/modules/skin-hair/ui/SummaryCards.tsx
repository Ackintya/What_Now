import type { SummaryPayload } from "./types";

interface SummaryCardsProps {
  summary: SummaryPayload | null;
  loading: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  return (
    <section id="overview" className="module-card">
      <div className="flex flex-col gap-2 mb-5">
        <h2 className="module-title">Skin & Hair Health</h2>
        <p className="module-subtitle">
          Personalized visible-pattern analysis, product-fit recommendations, and lightweight wellness correlation cards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4">
          <p className="text-sm text-doom-muted">Profile status</p>
          <p className="text-lg font-semibold text-doom-text mt-1">
            {loading ? "Loading..." : summary?.profile_ready ? "Profile ready" : "Needs setup"}
          </p>
          <p className="text-xs text-doom-muted mt-1">Latest skin: {summary?.latest_skin_signal || "-"}</p>
        </div>

        <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4">
          <p className="text-sm text-doom-muted">Saved products</p>
          <p className="text-lg font-semibold text-doom-text mt-1">{loading ? "Loading..." : summary?.loved_products_count || 0}</p>
          <p className="text-xs text-doom-muted mt-1">Recommendations: {summary?.recommendations_count || 0}</p>
        </div>

        <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4">
          <p className="text-sm text-doom-muted">Latest wellness insight</p>
          <p className="text-sm text-doom-text mt-1">{loading ? "Loading..." : summary?.latest_insight || "No insight yet"}</p>
        </div>
      </div>
    </section>
  );
}
