import { GoogleGenerativeAI } from "@google/generative-ai";
import { PRODUCT_CATEGORIES } from "./constants";
import type { CatalogProduct } from "./data/mockProducts";
import { buildProductSearchUrl, lookupProductIngredients } from "./ingredientLookup";
import type { LovedProduct, SkinHairProfile } from "./types";

interface GeminiCandidate {
  product_name?: string;
  brand?: string;
  category?: string;
  tags?: string[];
  ingredients?: string[];
}

interface DiscoveryParams {
  profile: Partial<SkinHairProfile>;
  lovedProducts: LovedProduct[];
  maxProducts?: number;
}

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Gemini product discovery did not return JSON");
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
}

function normalizeCategory(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  if (PRODUCT_CATEGORIES.includes(raw)) {
    return raw;
  }
  return "serum";
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}

function normalizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

function dedupeCatalog(items: CatalogProduct[]): CatalogProduct[] {
  const seen = new Set<string>();
  const unique: CatalogProduct[] = [];

  for (const item of items) {
    const key = `${item.brand.toLowerCase()}::${item.product_name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

async function fetchGeminiCandidates(params: DiscoveryParams): Promise<GeminiCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [];
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  const maxProducts = Math.min(Math.max(params.maxProducts || 6, 3), 10);
  const concerns = params.profile.concerns?.join(", ") || "none";
  const sensitivities = [...(params.profile.allergies || []), ...(params.profile.sensitivities || [])].join(", ") || "none";
  const lovedProductNames = params.lovedProducts.map((product) => `${product.brand} ${product.product_name}`).join(" | ") || "none";

  const prompt = `
Return JSON only.
Task: suggest ${maxProducts} skin/hair products that are similar in fit to the user's loved products while avoiding their listed sensitivities.
This is for product-fit guidance only, not medical advice.

User context:
- skin type: ${params.profile.skin_type || "unknown"}
- scalp type: ${params.profile.scalp_type || "unknown"}
- concerns: ${concerns}
- avoid ingredients: ${sensitivities}
- loved products: ${lovedProductNames}

Return strict JSON shape:
{
  "products": [
    {
      "product_name": "string",
      "brand": "string",
      "category": "cleanser|moisturizer|serum|sunscreen|shampoo|conditioner|scalp serum",
      "ingredients": ["inci names in lowercase"],
      "tags": ["short lowercase tags"]
    }
  ]
}

Rules:
- Do not include products that are likely to contain the avoid ingredients.
- Keep categories relevant to concerns and loved products.
- No diagnosis or treatment language.
`;

  let parsed: Record<string, unknown> | null = null;
  let lastError: unknown = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      parsed = extractJsonObject(result.response.text());
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!parsed) {
    throw (lastError as Error) || new Error("Gemini discovery failed for all model candidates");
  }

  const products = Array.isArray(parsed.products) ? parsed.products : [];

  return products.slice(0, maxProducts).map((item) => {
    const candidate = item as GeminiCandidate;
    return {
      product_name: String(candidate.product_name || "").trim(),
      brand: String(candidate.brand || "").trim(),
      category: normalizeCategory(candidate.category),
      ingredients: normalizeIngredients(candidate.ingredients),
      tags: normalizeTags(candidate.tags),
    };
  });
}

export async function discoverProductsWithGemini(params: DiscoveryParams): Promise<CatalogProduct[]> {
  const candidates = await fetchGeminiCandidates(params);

  if (candidates.length === 0) {
    return [];
  }

  const enriched = await Promise.all(
    candidates.map(async (candidate, index) => {
      if (!candidate.product_name || !candidate.brand) {
        return null;
      }

      try {
        const lookup = await lookupProductIngredients({
          productName: candidate.product_name,
          brand: candidate.brand,
        });

        return {
          id: `gemini-${index}-${Date.now()}`,
          product_name: candidate.product_name,
          brand: candidate.brand,
          category: candidate.category || "serum",
          ingredients: lookup.ingredients,
          tags: candidate.tags || [],
          source: "Gemini discovery + online ingredients",
          product_url: lookup.product_url,
        } as CatalogProduct;
      } catch (error) {
        console.error("Online ingredient lookup failed for Gemini candidate, using Gemini-provided ingredients:", error);

        if (!candidate.ingredients || candidate.ingredients.length < 5) {
          return null;
        }

        return {
          id: `gemini-fallback-${index}-${Date.now()}`,
          product_name: candidate.product_name,
          brand: candidate.brand,
          category: candidate.category || "serum",
          ingredients: candidate.ingredients,
          tags: candidate.tags || [],
          source: "Gemini discovery (model-estimated ingredients; verify label)",
          product_url: buildProductSearchUrl(candidate.product_name, candidate.brand),
        } as CatalogProduct;
      }
    }),
  );

  return dedupeCatalog(enriched.filter((item): item is CatalogProduct => Boolean(item)));
}
