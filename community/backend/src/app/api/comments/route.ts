import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
  const postId = request.nextUrl.searchParams.get("postId");

  if (!postId) {
    return NextResponse.json(
      { error: "postId is required" },
      { status: 400, headers: CORS }
    );
  }

  try {
    const db = await getDb();
    const comments = await db
      .collection("community-comments")
      .find({ postId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(comments, { headers: CORS });
  } catch (err: any) {
    console.error("Error fetching comments:", err.message);
    return NextResponse.json([], { headers: CORS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postId, userId = "demo-user", displayName = "Anonymous", body } =
      await request.json();

    if (!postId || !body?.trim()) {
      return NextResponse.json(
        { error: "postId and body are required" },
        { status: 400, headers: CORS }
      );
    }

    const comment = {
      postId,
      userId,
      displayName,
      body: body.trim(),
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("community-comments").insertOne(comment);

    await db.collection("community-posts").updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { commentCount: 1 } }
    );

    return NextResponse.json(
      { ...comment, _id: result.insertedId },
      { status: 201, headers: CORS }
    );
  } catch (err: any) {
    console.error("Error creating comment:", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500, headers: CORS }
    );
  }
}
