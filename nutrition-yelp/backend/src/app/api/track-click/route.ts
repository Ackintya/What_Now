import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { memoryClicks } from "@/lib/memory-store";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { userId = "demo-user", restaurantId = "", restaurantName = "", action = "click", metadata = {} } =
      await request.json();

    const entry = {
      user_id: userId,
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      action,
      metadata,
      timestamp: new Date(),
    };

    try {
      const db = await getDb();
      await db.collection("clicks").insertOne(entry);
    } catch (dbErr: any) {
      console.warn("MongoDB unavailable for click tracking, using memory:", dbErr.message);
      memoryClicks.push({
        userId,
        restaurantId,
        restaurantName,
        action,
        metadata,
        timestamp: entry.timestamp,
      });
    }

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("Error tracking click:", err);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
