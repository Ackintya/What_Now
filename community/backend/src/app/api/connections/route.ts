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

  try {
    const db = await getDb();
    const connections = await db
      .collection("community-connections")
      .find({ fromUserId: userId })
      .toArray();

    const connectedIds = connections.map((c) => c.toUserId);
    return NextResponse.json({ connectedIds }, { headers: CORS });
  } catch (err: any) {
    console.error("Error fetching connections:", err.message);
    return NextResponse.json({ connectedIds: [] }, { headers: CORS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fromUserId = "demo-user", toUserId, toDisplayName } = await request.json();

    if (!toUserId) {
      return NextResponse.json(
        { error: "toUserId is required" },
        { status: 400, headers: CORS }
      );
    }

    const db = await getDb();
    const collection = db.collection("community-connections");
    const existing = await collection.findOne({ fromUserId, toUserId });

    if (existing) {
      await collection.deleteOne({ fromUserId, toUserId });
      return NextResponse.json({ action: "disconnected", toUserId }, { headers: CORS });
    }

    await collection.insertOne({
      fromUserId,
      toUserId,
      toDisplayName: toDisplayName || "User",
      timestamp: new Date(),
    });

    return NextResponse.json({ action: "connected", toUserId }, { headers: CORS });
  } catch (err: any) {
    console.error("Error toggling connection:", err);
    return NextResponse.json(
      { error: "Failed to toggle connection" },
      { status: 500, headers: CORS }
    );
  }
}
