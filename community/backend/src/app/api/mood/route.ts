import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") || "demo-user";
  const today = new Date().toISOString().split("T")[0];

  try {
    const db = await getDb();

    const userMood = await db
      .collection("community-moods")
      .findOne({ userId, date: today });

    const todayMoods = await db
      .collection("community-moods")
      .find({ date: today })
      .toArray();

    const totalToday = todayMoods.length;
    const avgMood = totalToday > 0
      ? todayMoods.reduce((sum, m) => sum + m.rating, 0) / totalToday
      : 0;

    const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const m of todayMoods) {
      moodDistribution[m.rating] = (moodDistribution[m.rating] || 0) + 1;
    }

    const last7Days = await db
      .collection("community-moods")
      .find({ userId })
      .sort({ date: -1 })
      .limit(7)
      .toArray();

    return NextResponse.json(
      {
        userMood: userMood ? { rating: userMood.rating, note: userMood.note } : null,
        community: {
          avgMood: Math.round(avgMood * 10) / 10,
          totalCheckins: totalToday,
          distribution: moodDistribution,
        },
        history: last7Days.map((m) => ({ date: m.date, rating: m.rating })),
      },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("Error fetching mood:", err.message);
    return NextResponse.json(
      { userMood: null, community: { avgMood: 0, totalCheckins: 0, distribution: {} }, history: [] },
      { headers: CORS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId = "demo-user", rating, note = "" } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400, headers: CORS }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const db = await getDb();
    await db.collection("community-moods").updateOne(
      { userId, date: today },
      {
        $set: {
          userId,
          rating,
          note: note.trim(),
          date: today,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, rating, date: today }, { headers: CORS });
  } catch (err: any) {
    console.error("Error saving mood:", err);
    return NextResponse.json(
      { error: "Failed to save mood" },
      { status: 500, headers: CORS }
    );
  }
}
