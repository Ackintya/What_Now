import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

interface HealthScoreRequest {
  name: string;
  categories: { alias: string; title: string }[];
  price?: string | null;
}

interface HealthScoreResponse {
  score: number;
  reasoning: string;
  tags: string[];
}

const BATCH_SIZE = 5;

function buildPrompt(restaurants: HealthScoreRequest[]): string {
  const list = restaurants
    .map(
      (r, i) =>
        `${i + 1}. "${r.name}" [${r.categories.map((c) => c.title).join(", ")}] ${r.price || ""}`
    )
    .join("\n");

  return `Rate each restaurant 1-10 for healthiness. Reply with ONLY a JSON array. Each object: {"score":N,"reasoning":"brief sentence","tags":["1-2 tags from: Plant-Based, Fresh Ingredients, High Protein, Low Calorie, Whole Grains, Fried Foods, Processed, High Sugar, High Calorie, Balanced Options"]}

${list}`;
}

function fallbackScore(r: HealthScoreRequest): HealthScoreResponse {
  const cats = r.categories.map((c) => c.alias.toLowerCase());
  const healthyCats = ["salad", "vegan", "vegetarian", "juicebars", "acaibowls", "healthfood", "rawfood", "glutenfree", "mediterranean", "poke"];
  const unhealthyCats = ["burgers", "pizza", "hotdog", "donuts", "icecream", "chickenwings", "fastfood"];
  const healthyMatches = cats.filter((c) => healthyCats.some((h) => c.includes(h))).length;
  const unhealthyMatches = cats.filter((c) => unhealthyCats.some((u) => c.includes(u))).length;
  let score = 5 + healthyMatches * 2 - unhealthyMatches * 2;
  score = Math.max(1, Math.min(10, score));
  const tags = healthyMatches > 0 ? ["Healthy Options"] : unhealthyMatches > 0 ? ["Indulgent"] : ["Mixed Menu"];
  return { score, reasoning: `Based on categories: ${r.categories.map((c) => c.title).join(", ")}`, tags };
}

async function scoreBatch(
  genAI: GoogleGenerativeAI,
  batch: HealthScoreRequest[]
): Promise<HealthScoreResponse[]> {
  const modelNames = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
  const prompt = buildPrompt(batch);

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const scores: HealthScoreResponse[] = JSON.parse(cleaned);

      if (Array.isArray(scores) && scores.length === batch.length) {
        return scores;
      }
      console.warn(`Model ${modelName} returned ${scores.length} scores for ${batch.length} restaurants, using fallback`);
    } catch (err: any) {
      console.warn(`Model ${modelName} failed for batch:`, err.message);
    }
  }

  return batch.map(fallbackScore);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: HealthScoreRequest | HealthScoreRequest[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const restaurants = Array.isArray(body) ? body : [body];

  if (restaurants.length === 0 || !restaurants[0].name) {
    return NextResponse.json(
      { error: "Request must include restaurant name and categories" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const batches: HealthScoreRequest[][] = [];
    for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
      batches.push(restaurants.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map((batch) => scoreBatch(genAI, batch))
    );

    const scores = batchResults.flat();

    if (Array.isArray(body)) {
      return NextResponse.json(scores, { headers: CORS_HEADERS });
    }
    return NextResponse.json(scores[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Error in health scoring:", error);
    const fallbackScores = restaurants.map(fallbackScore);
    if (Array.isArray(body)) {
      return NextResponse.json(fallbackScores, { headers: CORS_HEADERS });
    }
    return NextResponse.json(fallbackScores[0], { headers: CORS_HEADERS });
  }
}
