import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "@/lib/mongodb";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

function normalizeFavorite(favorite: any) {
  return {
    ...favorite,
    userId: favorite.user_id ?? favorite.userId,
    restaurantId: favorite.restaurant_id ?? favorite.restaurantId,
    restaurantName: favorite.restaurant_name ?? favorite.restaurantName,
    restaurantData: favorite.restaurant_data ?? favorite.restaurantData,
  };
}

function normalizeClick(click: any) {
  return {
    ...click,
    userId: click.user_id ?? click.userId,
    restaurantId: click.restaurant_id ?? click.restaurantId,
    restaurantName: click.restaurant_name ?? click.restaurantName,
  };
}

function normalizePost(post: any) {
  return {
    ...post,
    userId: post.user_id ?? post.userId,
    displayName: post.display_name ?? post.displayName,
  };
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") || "demo-user";

  try {
    const db = await getDb();

    const [favoriteDocs, clickDocs, postDocs, userSessions] = await Promise.all([
      db.collection("favorites").find({ user_id: userId }).toArray(),
      db.collection("clicks").find({ user_id: userId, action: "search" }).sort({ timestamp: -1 }).limit(20).toArray(),
      db.collection("community_posts").find().sort({ created_at: -1 }).limit(50).toArray(),
      db.collection("sessions").find({ user_id: userId }).sort({ date: -1 }).limit(10).toArray(),
    ]);

    const userFavorites = favoriteDocs.map(normalizeFavorite);
    const userClicks = clickDocs.map(normalizeClick);
    const allPosts = postDocs.map(normalizePost);

    const userCategories = userFavorites
      .flatMap((f) => (f.categories || []).map((c: any) => c.title))
      .filter(Boolean);
    const searchLocations = [...new Set(userClicks.map((c) => c.metadata?.location).filter(Boolean))];
    const exerciseTypes = [...new Set(userSessions.map((s) => s.exercise).filter(Boolean))];

    const activitySummary = {
      favoriteCount: userFavorites.length,
      topCategories: [...new Set(userCategories)].slice(0, 5),
      searchLocations: searchLocations.slice(0, 3),
      exercises: exerciseTypes,
      postCount: allPosts.filter((p) => p.userId === userId).length,
    };

    const otherUsers = allPosts
      .filter((p) => p.userId !== userId)
      .reduce((acc: Record<string, any>, post) => {
        if (!acc[post.userId]) {
          acc[post.userId] = {
            displayName: post.displayName,
            sharedTags: new Set<string>(),
            postCount: 0,
          };
        }
        acc[post.userId].postCount++;
        for (const tag of post.tags || []) {
          if (userCategories.some((c) => c.toLowerCase().includes(tag.toLowerCase())) ||
              exerciseTypes.some((e) => e.toLowerCase().includes(tag.toLowerCase()))) {
            acc[post.userId].sharedTags.add(tag);
          }
        }
        return acc;
      }, {});

    const similarPeople = Object.entries(otherUsers)
      .map(([uid, data]) => ({
        userId: uid,
        displayName: data.displayName,
        sharedInterests: [...data.sharedTags],
        postCount: data.postCount,
        matchScore: data.sharedTags.size * 2 + data.postCount,
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    let aiInsight = "";
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && (userFavorites.length > 0 || userSessions.length > 0)) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { temperature: 0.7, maxOutputTokens: 128 },
        });

        const prompt = `Write exactly ONE short encouraging sentence (max 15 words) for someone who likes ${activitySummary.topCategories.join(", ") || "restaurants"} and is near ${activitySummary.searchLocations.join(", ") || "their area"}. Mention connecting with others who share similar wellness goals. End with a period. No bullet points.`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        aiInsight = raw.replace(/\n.*/s, "").trim() || raw;
      } catch {
        aiInsight = "Connect with people on similar wellness journeys near you!";
      }
    }

    return NextResponse.json(
      { activitySummary, similarPeople, aiInsight },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("Error in people-like-you:", err.message);
    return NextResponse.json(
      {
        activitySummary: {},
        similarPeople: [],
        aiInsight: "Join the community and connect with people on similar wellness journeys!",
      },
      { headers: CORS }
    );
  }
}
