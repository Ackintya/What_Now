import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag") || "";
  const sort = request.nextUrl.searchParams.get("sort") || "recent";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "30"), 50);

  try {
    const db = await getDb();
    const filter: any = {};
    if (tag) filter.tags = tag;

    const sortField = sort === "popular" ? { upvotes: -1 as const } : { createdAt: -1 as const };

    const posts = await db
      .collection("community-posts")
      .find(filter)
      .sort(sortField)
      .limit(limit)
      .toArray();

    return NextResponse.json(posts, { headers: CORS });
  } catch (err: any) {
    console.error("Error fetching posts:", err.message);
    return NextResponse.json([], { headers: CORS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId = "demo-user", displayName = "Anonymous", title, body, tags = [] } =
      await request.json();

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400, headers: CORS }
      );
    }

    const post = {
      userId,
      displayName,
      title: title.trim(),
      body: body.trim(),
      tags: tags.filter(Boolean),
      upvotes: 0,
      upvotedBy: [],
      commentCount: 0,
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("community-posts").insertOne(post);

    return NextResponse.json(
      { ...post, _id: result.insertedId },
      { status: 201, headers: CORS }
    );
  } catch (err: any) {
    console.error("Error creating post:", err);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500, headers: CORS }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { postId, userId = "demo-user", action } = await request.json();

    if (!postId || action !== "upvote") {
      return NextResponse.json(
        { error: "postId and action='upvote' required" },
        { status: 400, headers: CORS }
      );
    }

    const db = await getDb();
    const post = await db
      .collection("community-posts")
      .findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404, headers: CORS });
    }

    const alreadyUpvoted = (post.upvotedBy || []).includes(userId);

    if (alreadyUpvoted) {
      await db.collection("community-posts").updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { upvotes: -1 }, $pull: { upvotedBy: userId } as any }
      );
    } else {
      await db.collection("community-posts").updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { upvotes: 1 }, $push: { upvotedBy: userId } as any }
      );
    }

    return NextResponse.json(
      { upvoted: !alreadyUpvoted, upvotes: post.upvotes + (alreadyUpvoted ? -1 : 1) },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("Error upvoting post:", err);
    return NextResponse.json(
      { error: "Failed to upvote" },
      { status: 500, headers: CORS }
    );
  }
}
