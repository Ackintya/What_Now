import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "@/lib/mongodb";
import { memoryFavorites, memoryClicks } from "@/lib/memory-store";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

function serializeInsight(doc: any) {
  return {
    ...doc,
    userId: doc.user_id ?? doc.userId,
    favoriteCount: doc.favorite_count ?? doc.favoriteCount ?? 0,
    searchCount: doc.search_count ?? doc.searchCount ?? 0,
    topCategories: doc.top_categories ?? doc.topCategories ?? [],
    searchLocations: doc.search_locations ?? doc.searchLocations ?? [],
    topClicked: doc.top_clicked ?? doc.topClicked ?? [],
  };
}

function normalizeFavorite(doc: any) {
  return {
    ...doc,
    userId: doc.user_id ?? doc.userId,
    restaurantId: doc.restaurant_id ?? doc.restaurantId,
    restaurantName: doc.restaurant_name ?? doc.restaurantName,
    restaurantData: doc.restaurant_data ?? doc.restaurantData,
  };
}

function normalizeClick(doc: any) {
  return {
    ...doc,
    userId: doc.user_id ?? doc.userId,
    restaurantId: doc.restaurant_id ?? doc.restaurantId,
    restaurantName: doc.restaurant_name ?? doc.restaurantName,
  };
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") || "demo-user";

  try {
    const db = await getDb();
    const insights = await db
      .collection("yelp_insight")
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json(insights.map(serializeInsight), { headers: CORS_HEADERS });
  } catch (err: any) {
    console.warn("MongoDB unavailable for insights GET:", err.message);
    return NextResponse.json([], { headers: CORS_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const { userId = "demo-user" } = await request.json();

    let favorites: any[] = [];
    let recentClicks: any[] = [];
    let useDb = false;

    try {
      const db = await getDb();
      const [favoriteDocs, clickDocs] = await Promise.all([
        db.collection("favorites").find({ user_id: userId }).sort({ timestamp: -1 }).toArray(),
        db.collection("clicks").find({ user_id: userId }).sort({ timestamp: -1 }).limit(50).toArray(),
      ]);
      favorites = favoriteDocs.map(normalizeFavorite);
      recentClicks = clickDocs.map(normalizeClick);
      useDb = true;
    } catch (dbErr: any) {
      console.warn("MongoDB unavailable for insights generation, using memory:", dbErr.message);
      favorites = memoryFavorites.filter((f) => f.userId === userId);
      recentClicks = memoryClicks
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50);
    }

    if (favorites.length === 0 && recentClicks.length === 0) {
      return NextResponse.json(
        { insight: "No activity yet. Start exploring and liking restaurants to get personalized insights!" },
        { headers: CORS_HEADERS }
      );
    }

    const searches = recentClicks.filter((c) => c.action === "search");
    const yelpViews = recentClicks.filter((c) => c.action === "view_yelp");

    const searchLocations = [...new Set(searches.map((s) => s.metadata?.location).filter(Boolean))];
    const searchCategories = [...new Set(searches.map((s) => s.metadata?.category).filter((c: any) => c && c !== "all"))];
    const searchCount = searches.length;

    const clickCounts: Record<string, { name: string; count: number }> = {};
    for (const click of yelpViews) {
      const id = click.restaurantId;
      if (!id) continue;
      if (!clickCounts[id]) {
        clickCounts[id] = { name: click.restaurantName, count: 0 };
      }
      clickCounts[id].count++;
    }

    const topClicked = Object.values(clickCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const favNames = favorites.map((f) => f.restaurantName).slice(0, 10);
    const favCategories = favorites
      .flatMap((f) => (f.categories || []).map((c: any) => c.title))
      .filter(Boolean);

    const categoryCounts: Record<string, number> = {};
    for (const cat of favCategories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    const prompt = `Based on this user's restaurant browsing activity, write 3-4 insightful and interesting sentences about their dining preferences, habits, and patterns. Be specific, personal, and include a fun observation.

Liked restaurants: ${favNames.join(", ") || "None"}
Top cuisine categories: ${topCategories.join(", ") || "None"}
Restaurants clicked to view on Yelp: ${topClicked.map((r) => `${r.name} (${r.count}x)`).join(", ") || "None"}
Total searches performed: ${searchCount}
Locations searched: ${searchLocations.join(", ") || "None"}
Categories browsed: ${searchCategories.join(", ") || "Various"}

Write ONLY the insight text, no JSON, no markdown, just plain sentences.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];
    let insightText = "";

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        });
        const result = await model.generateContent(prompt);
        insightText = result.response.text().trim();
        if (insightText) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed for insights:`, err.message);
      }
    }

    if (!insightText) {
      insightText = `You've liked ${favorites.length} restaurant${favorites.length !== 1 ? "s" : ""}. ${
        topCategories.length > 0
          ? `Your favorite cuisines include ${topCategories.join(", ")}.`
          : ""
      } ${
        topClicked.length > 0
          ? `You've shown the most interest in ${topClicked[0].name}.`
          : ""
      }`;
    }

    if (useDb) {
      try {
        const db = await getDb();
        await db.collection("yelp_insight").insertOne({
          user_id: userId,
          insight: insightText,
          timestamp: new Date(),
          favorite_count: favorites.length,
          search_count: searchCount,
          top_categories: topCategories,
          search_locations: searchLocations,
          top_clicked: topClicked.map((r) => r.name),
        });
      } catch {
        console.warn("Could not persist insight to MongoDB");
      }
    }

    return NextResponse.json(
      { insight: insightText, timestamp: new Date() },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("Error generating insights:", err);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
