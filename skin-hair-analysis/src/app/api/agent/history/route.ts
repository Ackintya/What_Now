import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB || "wellbeing_app") };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ messages: [] });
  }

  const { client, db } = await getDb();
  try {
    const messages = await db
      .collection("agent_chats")
      .find({ user_id: userId })
      .sort({ timestamp: 1 })
      .limit(40)
      .toArray();

    return NextResponse.json({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  } finally {
    await client.close();
  }
}
