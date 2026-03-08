import { MOCK_AUTHENTIC_BASELINES } from "../data/mockAuthenticDishes";
import type { AuthenticBaseline } from "../types";

export interface AuthenticDishSource {
  search(query: string, cuisine?: string): Promise<AuthenticBaseline | null>;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractDishHint(query: string): string {
  const normalized = normalize(query);
  return normalized
    .replace(/\b(authentic|traditional|healthier|healthy|more protein|extra protein|less oil|lighter|version)\b/g, "")
    .replace(/\bwith\b.*$/, "")
    .replace(/\bbut\b.*$/, "")
    .trim();
}

export class MockAuthenticDishSource implements AuthenticDishSource {
  async search(query: string, cuisine?: string): Promise<AuthenticBaseline | null> {
    const queryNorm = normalize(query);
    const hint = extractDishHint(queryNorm);

    const scored = MOCK_AUTHENTIC_BASELINES.map((item) => {
      let score = 0;
      const nameNorm = normalize(item.dish_name);
      const cuisineNorm = normalize(item.cuisine);

      if (queryNorm.includes(nameNorm)) {
        score += 4;
      }

      if (hint && nameNorm.includes(hint)) {
        score += 3;
      }

      if (cuisine && cuisineNorm === normalize(cuisine)) {
        score += 3;
      }

      if (queryNorm.includes(cuisineNorm)) {
        score += 2;
      }

      for (const ingredient of item.core_ingredients) {
        if (queryNorm.includes(normalize(ingredient))) {
          score += 1;
        }
      }

      return { item, score };
    }).sort((a, b) => b.score - a.score);

    if (scored[0].score <= 0) {
      return MOCK_AUTHENTIC_BASELINES[0];
    }

    return scored[0].item;
  }
}

export class ScraperReadyAuthenticSource implements AuthenticDishSource {
  constructor(private readonly fallback: AuthenticDishSource = new MockAuthenticDishSource()) {}

  async search(query: string, cuisine?: string): Promise<AuthenticBaseline | null> {
    // MVP: live scraping can plug in here later.
    return this.fallback.search(query, cuisine);
  }
}
