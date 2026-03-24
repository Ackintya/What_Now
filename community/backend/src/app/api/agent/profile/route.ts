import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB || "wellbeing_app") };
}

async function geminiCall(prompt: string): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
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
    // Always rebuild fresh on every call — no cache check
    console.log(`🔄 [Agent Profile] Rebuilding profile for userId: ${userId}`);

    let objId: ObjectId | null = null;
    try { objId = new ObjectId(userId); } catch { /* not a valid ObjectId */ }

    // 2-day window for time-sensitive data
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const [
      userDoc,
      userProfile,
      nutritionProfile,
      skinHairProfile,
      lovedProducts,
      generatedRecipes,
      savedRecipes,
      pantryItems,
      favorites,
      clickHistory,
      nutritionInsights,
      yelpInsights,
      nutritionSession,
      communityPosts,
      communityComments,
      communityMoods,
      communityEvents,
      communityConnections,
    ] = await Promise.all([
      // Identity — always fetch
      objId ? db.collection("users").findOne({ _id: objId }) : null,
      db.collection("user_profiles").findOne({ user_id: userId }),
      db.collection("nutrition_profiles").findOne({ user_id: userId }),
      db.collection("skin_hair_profiles").findOne({ user_id: userId }),
      db.collection("loved_products").find({ user_id: userId }).toArray(),
      // Recent activity — past 2 days
      db.collection("generated_recipes").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection("saved_recipes").find({ user_id: userId, saved_at: { $gte: twoDaysAgo } }).sort({ saved_at: -1 }).limit(10).toArray(),
      db.collection("pantry_items").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).toArray(),
      db.collection("favorites").find({ user_id: userId, timestamp: { $gte: twoDaysAgo } }).sort({ timestamp: -1 }).toArray(),
      db.collection("clicks").find({ user_id: userId, timestamp: { $gte: twoDaysAgo } }).sort({ timestamp: -1 }).limit(30).toArray(),
      db.collection("nutrition_insight_memory").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).sort({ created_at: -1 }).limit(5).toArray(),
      db.collection("yelp_insight").find({ user_id: userId, timestamp: { $gte: twoDaysAgo } }).sort({ timestamp: -1 }).limit(3).toArray(),
      db.collection("nutrition_sessions_summary").findOne({ user_id: userId, started_at: { $gte: twoDaysAgo } }),
      // Community activity — past 2 days
      db.collection("community_posts").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).sort({ created_at: -1 }).limit(5).toArray(),
      db.collection("community_comments").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).sort({ created_at: -1 }).limit(5).toArray(),
      db.collection("community_moods").find({ user_id: userId, created_at: { $gte: twoDaysAgo } }).sort({ created_at: -1 }).limit(5).toArray(),
      db.collection("community_events").find({ attendees: userId, date: { $gte: new Date().toISOString().split("T")[0] } }).sort({ date: 1 }).limit(5).toArray(),
      db.collection("community_connections").find({ $or: [{ from_user_id: userId }, { to_user_id: userId }] }).sort({ timestamp: -1 }).limit(10).toArray(),
    ]);

    if (userProfile?.date_of_birth && !userProfile.dateOfBirth) {
      userProfile.dateOfBirth = userProfile.date_of_birth;
    }

    for (const favorite of favorites) {
      if (favorite.restaurant_name && !favorite.restaurantName) {
        favorite.restaurantName = favorite.restaurant_name;
      }
    }

    if (yelpInsights[0]) {
      if (yelpInsights[0].top_categories && !yelpInsights[0].topCategories) {
        yelpInsights[0].topCategories = yelpInsights[0].top_categories;
      }
      if (yelpInsights[0].search_locations && !yelpInsights[0].searchLocations) {
        yelpInsights[0].searchLocations = yelpInsights[0].search_locations;
      }
    }

    // ── Console log all fetched data ──────────────────────────
    console.log("\n🤖 [Agent Profile] ── Past 2 Days Data ──────────────────");
    console.log(`👤 User:           ${userDoc ? `${userDoc.name} (${userDoc.email})` : "not found"}`);
    console.log(`📋 Physical:       ${userProfile ? `${userProfile.height}cm, ${userProfile.weight}kg, ${userProfile.lifestyle}, DOB: ${userProfile.dateOfBirth}` : "not found"}`);
    console.log(`🎯 Nutrition:      ${nutritionProfile ? `goal=${nutritionProfile.primary_goal}, protein=${nutritionProfile.protein_goal_g}g, kcal=${nutritionProfile.calorie_goal}, restrictions=${nutritionProfile.restrictions?.join(", ")||"none"}` : "not found"}`);
    console.log(`🥘 Pantry (${pantryItems.length}):      ${pantryItems.map((p:any) => p.item_name).join(", ") || "empty"}`);
    console.log(`🍳 Recipes (${generatedRecipes.length}):`);
    generatedRecipes.forEach((r:any) => console.log(`   - ${r.title} [${r.tags?.join(", ")}]`));
    console.log(`🧴 Skin:           ${skinHairProfile ? `type=${skinHairProfile.skin_type}, scalp=${skinHairProfile.scalp_type}, concerns=${skinHairProfile.concerns?.join(", ")}` : "not found"}`);
    console.log(`💄 Loved Products (${lovedProducts.length}): ${lovedProducts.map((p:any) => `${p.product_name} (${p.brand})`).join(", ") || "none"}`);
    console.log(`❤️  Favorites (${favorites.length}):   ${favorites.map((f:any) => `${f.restaurantName}`).join(", ") || "none"}`);
    console.log(`🔍 Searches (${clickHistory.length}):   ${[...new Set(clickHistory.filter((c:any) => c.action==="search" && c.metadata?.category !== "__liked").map((c:any) => c.metadata?.category))].join(", ") || "none"}`);
    console.log(`🧠 Nutrition Insights (${nutritionInsights.length}): ${nutritionInsights.map((n:any) => n.insight_text || n.insight).join(" | ") || "none"}`);
    console.log(`🍽️  Yelp Insights (${yelpInsights.length}): ${yelpInsights.map((y:any) => y.insight).join(" | ") || "none"}`);
    console.log(`👥 Community Posts (${communityPosts.length}): ${communityPosts.map((p:any) => p.title).join(", ") || "none"}`);
    console.log(`💬 Community Comments (${communityComments.length})`);
    console.log(`😊 Community Moods (${communityMoods.length}): ${communityMoods.map((m:any) => `${m.rating}/5`).join(", ") || "none"}`);
    console.log(`📅 Upcoming Events (${communityEvents.length}): ${communityEvents.map((e:any) => e.title).join(", ") || "none"}`);
    console.log(`🤝 Connections (${communityConnections.length})`);
    console.log("──────────────────────────────────────────────────────────\n");

    // ── Build prompt sections ─────────────────────────────────

    // ── Age calculation ───────────────────────────────────────
    function calculateAge(dob: string): number | null {
      if (!dob) return null;
      const birth = new Date(dob);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const notYetHadBirthday =
        today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
      if (notYetHadBirthday) age--;
      return age;
    }
    const age = calculateAge(userProfile?.dateOfBirth);

    const favCuisines = favorites.length > 0
      ? [...new Set(favorites.flatMap((f: any) => f.categories?.map((c: any) => c.title) || []))]
      : [];

    const searchedCategories = [...new Set(
      clickHistory
        .filter((c: any) => c.action === "search" && c.metadata?.category && !["all","__liked"].includes(c.metadata.category))
        .map((c: any) => c.metadata.category)
    )];

    const searchedLocations = [...new Set(
      clickHistory
        .filter((c: any) => c.action === "search" && c.metadata?.location)
        .map((c: any) => c.metadata.location)
    )];

    const recipeTitles = generatedRecipes.map((r: any) => r.title);
    const recipeTags = [...new Set(generatedRecipes.flatMap((r: any) => r.tags || []))];
    const latestYelpInsight = yelpInsights[0]?.insight || null;

    const prompt = `You are building a personalized user profile context for a wellness AI assistant chatbot called WellBeing Agent.

Below is REAL data collected from this user's activity in the past 2 days across the WellBeing app. Synthesize it into a clear, warm, specific profile (4-6 sentences) written in second person. This will be injected into every chat session.

---

## PERSONAL INFO
- Name: ${userDoc?.name || "Unknown"}
- Email: ${userDoc?.email || "unknown"}
- Date of Birth: ${userProfile?.dateOfBirth || "unknown"}
- Age: ${age !== null ? `${age} years old` : "unknown"}
- Height: ${userProfile?.height ? `${userProfile.height}cm` : "unknown"}
- Weight: ${userProfile?.weight ? `${userProfile.weight}kg` : "unknown"}
- Activity Level: ${userProfile?.lifestyle || "unknown"}

## FITNESS & NUTRITION GOALS
- Primary Goal: ${nutritionProfile?.primary_goal?.replace(/_/g, " ") || "not set"}
- Daily Protein Target: ${nutritionProfile?.protein_goal_g ? `${nutritionProfile.protein_goal_g}g` : "not set"}
- Daily Calorie Target: ${nutritionProfile?.calorie_goal ? `${nutritionProfile.calorie_goal} kcal` : "not set"}
- Dietary Restrictions: ${nutritionProfile?.restrictions?.length ? nutritionProfile.restrictions.join(", ") : "none"}
- Dietary Preferences: ${nutritionProfile?.dietary_preferences?.length ? nutritionProfile.dietary_preferences.join(", ") : "none"}
- Disliked Ingredients: ${nutritionProfile?.disliked_ingredients?.length ? nutritionProfile.disliked_ingredients.join(", ") : "none"}

## PANTRY INGREDIENTS CURRENTLY AVAILABLE
${pantryItems.length > 0 ? pantryItems.map(p => `- ${p.item_name}`).join("\n") : "- No pantry data"}

## RECIPES GENERATED & SAVED
${recipeTitles.length > 0 ? recipeTitles.map(t => `- ${t}`).join("\n") : "- None yet"}
Recipe Tags: ${recipeTags.length > 0 ? recipeTags.join(", ") : "none"}

## DINING PREFERENCES
- Favourite Restaurants: ${favorites.length > 0 ? favorites.map((f: any) => `${f.restaurantName} (${f.categories?.map((c: any) => c.title).join("/")})`).join(", ") : "none saved"}
- Cuisine Categories Liked: ${favCuisines.length > 0 ? favCuisines.join(", ") : "unknown"}
- Restaurant Search Categories: ${searchedCategories.length > 0 ? searchedCategories.join(", ") : "none"}
- Search Locations: ${searchedLocations.length > 0 ? searchedLocations.join(", ") : "unknown"}

## SKIN & HAIR PROFILE
- Skin Type: ${skinHairProfile?.skin_type || "unknown"}
- Scalp Type: ${skinHairProfile?.scalp_type || "unknown"}
- Skin Concerns: ${skinHairProfile?.concerns?.length ? skinHairProfile.concerns.join(", ") : "none"}
- Allergies: ${skinHairProfile?.allergies?.length ? skinHairProfile.allergies.join(", ") : "none"}
- Preferred Product Categories: ${skinHairProfile?.preferred_categories?.length ? skinHairProfile.preferred_categories.join(", ") : "none"}
- Loved Skincare Products: ${lovedProducts.length > 0 ? lovedProducts.map(p => `${p.product_name} by ${p.brand} (${p.category})`).join(", ") : "none"}

## RECENT APP ACTIVITY
${nutritionSession ? `- Actions taken: ${nutritionSession.action_types?.join(" → ") || "none"}
- Event count: ${nutritionSession.event_count || 0}
- Session started: ${nutritionSession.started_at ? new Date(nutritionSession.started_at).toISOString() : "unknown"}` : "- No recent session"}

## COMMUNITY ACTIVITY (past 2 days)
- Posts shared: ${communityPosts.length > 0 ? communityPosts.map((p:any) => `"${p.title}" [${p.tags?.join(", ")}]`).join("; ") : "none"}
- Comments made: ${communityComments.length > 0 ? `${communityComments.length} comment(s)` : "none"}
- Mood check-ins: ${communityMoods.length > 0 ? communityMoods.map((m:any) => `${m.rating}/5${m.note ? ` ("${m.note}")` : ""}`).join(", ") : "none"}
- Upcoming events attending: ${communityEvents.length > 0 ? communityEvents.map((e:any) => `${e.title} on ${e.date}`).join(", ") : "none"}
- Connections made: ${communityConnections.length > 0 ? communityConnections.length : "none"}

## AI-GENERATED INSIGHTS (past 2 days)
Nutrition Insights: ${nutritionInsights.length > 0 ? nutritionInsights.map((n:any) => n.insight_text || n.insight).join(" ") : "none yet"}
Dining Behaviour Insight: ${latestYelpInsight || "none yet"}
Top Dining Categories (from search+favourites): ${yelpInsights[0]?.topCategories?.join(", ") || favCuisines.join(", ") || "unknown"}
Search Locations: ${yelpInsights[0]?.searchLocations?.join(", ") || searchedLocations.join(", ") || "unknown"}

---

STRICT RULES — follow these exactly:
1. Only use facts explicitly present in the data above. Do NOT invent, assume, or infer anything not stated.
2. If a field is "unknown", "none", or "not set" — do NOT mention it or fill it with guesses.
3. Do NOT make medical claims, diagnoses, or treatment recommendations.
4. Do NOT hallucinate restaurant names, recipe names, ingredients, or product names — only use what is listed above.
5. If there is not enough data to write a sentence, skip it entirely rather than guessing.

Now write a 4-6 sentence profile context in second person ("You are someone who..."). Be specific — mention their actual name, goals, cuisine preferences, skin concerns using only the real data above. Be warm and personal. Write in flowing prose, no bullet points.`;

    console.log("📝 [Agent Profile] ── Sending Prompt to Gemini ──────────");
    console.log(prompt);
    console.log("──────────────────────────────────────────────────────────\n");

    const profileContext =
      (await geminiCall(prompt)) ||
      `You are ${userDoc?.name || "a WellBeing user"}, someone dedicated to health and wellness who tracks fitness, nutrition, and skincare.`;

    console.log("✅ [Agent Profile] ── Generated Profile Context ──────────");
    console.log(profileContext);
    console.log("──────────────────────────────────────────────────────────\n");

    // ── Save to MongoDB cache (upsert, 24hr TTL) ──────────────
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await db.collection("agent_profile_cache").updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          profile_context: profileContext,
          built_at: now,
          expires_at: expiresAt,
        },
      },
      { upsert: true }
    );
    console.log(`💾 [Agent Profile] Saved to MongoDB cache (expires: ${expiresAt.toISOString()})`);

    return NextResponse.json({ profileContext, fromCache: false });
  } finally {
    await client.close();
  }
}
