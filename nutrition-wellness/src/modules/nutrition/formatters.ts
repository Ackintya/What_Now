import type { ModuleResultCard } from "./types";
import { ensureGroundingLine, enforceWellnessTone } from "./safeText";

export function formatResultCard(card: ModuleResultCard): ModuleResultCard {
  return {
    result: enforceWellnessTone(card.result),
    why_it_fits: enforceWellnessTone(card.why_it_fits),
    confidence: card.confidence,
    also_check: ensureGroundingLine(card.also_check),
  };
}
