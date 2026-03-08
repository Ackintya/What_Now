import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB || "wellbeing_app") };
}

async function geminiCall(prompt: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch {
      continue;
    }
  }
  return "";
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { client, db } = await getDb();

  try {
    // Fetch all insight sources in parallel
    const [nutritionInsights, yelpInsights, userDoc, userProfile] =
      await Promise.all([
        db
          .collection("nutrition_insight_memory")
          .find({ user_id: userId })
          .sort({ created_at: -1 })
          .limit(5)
          .toArray(),
        db
          .collection("yelp-insights")
          .find({ userId })
          .sort({ timestamp: -1 })
          .limit(5)
          .toArray(),
        db.collection("users").findOne({ _id: userId as any }),
        db.collection("userProfiles").findOne({ userId }),
      ]);

    // Build text sections
    const nutritionText =
      nutritionInsights.length > 0
        ? nutritionInsights
            .map((i) => i.insight_text || i.insight || "")
            .filter(Boolean)
            .join("\n- ")
        : null;

    const yelpText =
      yelpInsights.length > 0
        ? yelpInsights
            .map((i) => i.insight || "")
            .filter(Boolean)
            .join("\n- ")
        : null;

    // Build physical profile section
    const physicalParts: string[] = [];
    if (userDoc?.name) physicalParts.push(`Name: ${userDoc.name}`);
    if (userProfile?.height) physicalParts.push(`Height: ${userProfile.height}cm`);
    if (userProfile?.weight) physicalParts.push(`Weight: ${userProfile.weight}kg`);
    if (userProfile?.lifestyle) physicalParts.push(`Lifestyle: ${userProfile.lifestyle}`);
    if (userProfile?.dateOfBirth) {
      const age = Math.floor(
        (Date.now() - new Date(userProfile.dateOfBirth).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      );
      if (age > 0 && age < 120) physicalParts.push(`Age: ~${age}`);
    }

    // If no data at all, return a simple fallback
    if (!nutritionText && !yelpText && physicalParts.length === 0) {
      return NextResponse.json({
        profileContext:
          "A WellBeing app user who is starting their health journey. They track fitness, nutrition, and wellness goals.",
      });
    }

    const prompt = `You are building a personalized profile for a wellness AI assistant chatbot.

Based on the information below about a user, write a concise profile context (3-5 sentences) that captures their health patterns, food preferences, dining habits, and physical characteristics. This profile will be injected into every chat session to personalize responses.

${physicalParts.length > 0 ? `Physical Profile:\n${physicalParts.join(", ")}` : ""}

${nutritionText ? `Nutrition & Meal Planning Insights (from their activity):\n- ${nutritionText}` : ""}

${yelpText ? `Dining & Restaurant Insights (from their activity):\n- ${yelpText}` : ""}

Write the profile in second person ("You are someone who..."). Be specific and warm. Keep it to 3-5 sentences. Do not make medical claims or diagnoses.`;

    const profileContext =
      (await geminiCall(prompt)) ||
      "A health-conscious WellBeing app user focused on nutrition and fitness.";

    return NextResponse.json({ profileContext });
  } finally {
    await client.close();
  }
}
