import { MOCK_PRODUCT_CATALOG } from "./data/mockProducts";

interface LookupRequest {
  productName: string;
  brand?: string;
}

interface LookupCandidate {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text_en?: string;
  ingredients_text?: string;
  ingredients_tags?: string[];
  url?: string;
}

export interface IngredientLookupResult {
  ingredients: string[];
  source: string;
  matched_product: string;
  product_url: string;
  grounding_line: string;
}

const LOOKUP_GROUNDING_LINE =
  "Also check: the full ingredient list on the product label or the brand's official product page before use.";

export function buildProductSearchUrl(productName: string, brand?: string): string {
  const query = [brand, productName, "ingredient list"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function splitTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function normalizeIngredient(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanIngredients(items: string[]): string[] {
  const filtered = items
    .map(normalizeIngredient)
    .map((item) => item.replace(/\//g, " / ").replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 2)
    .filter((item) => !/^\d+$/.test(item))
    .filter((item) => !item.startsWith("code "));

  return [...new Set(filtered)].slice(0, 60);
}

function parseIngredientText(value: string): string[] {
  const normalized = value
    .replace(/\u0000/g, "")
    .replace(/[;|]/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIngredientTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => String(tag))
    .map((tag) => tag.replace(/^en:/, "").replace(/-/g, " ").trim())
    .filter(Boolean);
}

function candidateScore(candidate: LookupCandidate, queryName: string, queryBrand?: string): number {
  const queryTokens = splitTokens(queryName);
  const brandTokens = splitTokens(queryBrand || "");
  const haystack = `${candidate.product_name || ""} ${candidate.brands || ""}`.toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 4;
    }
  }

  for (const token of brandTokens) {
    if (haystack.includes(token)) {
      score += 5;
    }
  }

  if ((candidate.ingredients_text_en || candidate.ingredients_text || "").length > 25) {
    score += 3;
  }

  if (Array.isArray(candidate.ingredients_tags) && candidate.ingredients_tags.length > 6) {
    score += 2;
  }

  return score;
}

async function queryOpenBeautyFacts(query: string): Promise<LookupCandidate[]> {
  const searchUrl =
    `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    "&search_simple=1&action=process&json=1&page_size=12" +
    "&fields=code,product_name,brands,ingredients_text_en,ingredients_text,ingredients_tags,url";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`OpenBeautyFacts lookup failed with status ${response.status}`);
    }

    const body = (await response.json()) as { products?: LookupCandidate[] };
    return Array.isArray(body.products) ? body.products : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenBeautyFacts(productName: string, brand?: string): Promise<LookupCandidate[]> {
  const queries = [
    [productName, brand].filter(Boolean).join(" ").trim(),
    productName.trim(),
    splitTokens(productName).slice(0, 4).join(" "),
  ].filter(Boolean);

  const merged: LookupCandidate[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const candidates = await queryOpenBeautyFacts(query);
    for (const candidate of candidates) {
      const key = `${(candidate.brands || "").toLowerCase()}::${(candidate.product_name || "").toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(candidate);
    }
  }

  return merged;
}

function lookupFromMockCatalog(productName: string, brand?: string): IngredientLookupResult | null {
  const normalizedName = productName.toLowerCase();
  const normalizedBrand = (brand || "").toLowerCase();

  const matched = MOCK_PRODUCT_CATALOG.find((product) => {
    const productNameMatch = product.product_name.toLowerCase().includes(normalizedName) || normalizedName.includes(product.product_name.toLowerCase());
    const brandMatch = !normalizedBrand || product.brand.toLowerCase().includes(normalizedBrand);
    return productNameMatch && brandMatch;
  });

  if (!matched) {
    return null;
  }

  return {
    ingredients: cleanIngredients(matched.ingredients),
    source: "NowWhat fallback catalog",
    matched_product: `${matched.brand} ${matched.product_name}`,
    product_url: buildProductSearchUrl(matched.product_name, matched.brand),
    grounding_line: LOOKUP_GROUNDING_LINE,
  };
}

export async function lookupProductIngredients(request: LookupRequest): Promise<IngredientLookupResult> {
  const productName = request.productName.trim();
  const brand = request.brand?.trim();

  if (!productName) {
    throw new Error("Product name is required for ingredient lookup");
  }

  try {
    const candidates = await fetchOpenBeautyFacts(productName, brand);

    const ranked = [...candidates]
      .map((candidate) => ({
        candidate,
        score: candidateScore(candidate, productName, brand),
      }))
      .sort((a, b) => b.score - a.score);

    for (const { candidate } of ranked) {
      const fromText = parseIngredientText(candidate.ingredients_text_en || candidate.ingredients_text || "");
      const fromTags = parseIngredientTags(candidate.ingredients_tags);
      const ingredients = cleanIngredients([...fromText, ...fromTags]);

      if (ingredients.length >= 5) {
        const openBeautyFactsUrl =
          candidate.url ||
          (candidate.code ? `https://world.openbeautyfacts.org/product/${candidate.code}` : undefined);

        return {
          ingredients,
          source: "Open Beauty Facts",
          matched_product: `${candidate.brands || ""} ${candidate.product_name || ""}`.trim() || productName,
          product_url: openBeautyFactsUrl || buildProductSearchUrl(candidate.product_name || productName, candidate.brands || brand),
          grounding_line: LOOKUP_GROUNDING_LINE,
        };
      }
    }
  } catch (error) {
    console.error("Online ingredient lookup failed, falling back to local catalog:", error);
  }

  const fallback = lookupFromMockCatalog(productName, brand);
  if (fallback) {
    return fallback;
  }

  throw new Error("Could not find ingredients online for this product. Try a more specific product name and brand.");
}
