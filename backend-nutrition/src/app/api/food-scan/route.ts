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

export interface FoodScanResult {
  foods: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  healthScore: number;
  healthLabel: string;
  summary: string;
  healthierAlternatives: string[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let body: { image: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "image (base64) is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = body.mimeType || "image/jpeg";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `Analyze this food image. Identify each food item and estimate nutrition. Reply with ONLY a JSON object (no markdown):
{"foods":[{"name":"item","portion":"size","calories":N,"protein":N,"carbs":N,"fat":N,"fiber":N}],"totalCalories":N,"totalProtein":N,"totalCarbs":N,"totalFat":N,"healthScore":1-10,"healthLabel":"Very Healthy|Healthy|Moderate|Less Healthy|Unhealthy","summary":"one sentence","healthierAlternatives":["2-3 suggestions"]}`;

    const modelNames = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
    let scanResult: FoodScanResult | null = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        });

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } },
        ]);

        const text = result.response.text().trim();
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        scanResult = JSON.parse(cleaned);
        break;
      } catch (modelErr: any) {
        console.warn(`Food scan with ${modelName} failed:`, modelErr.message);
        continue;
      }
    }

    if (!scanResult) {
      return NextResponse.json(
        { error: "Could not analyze this image. Please try a clearer photo." },
        { status: 422, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(scanResult, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("Food scan error:", error.message);
    return NextResponse.json(
      { error: "Failed to analyze food image" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
