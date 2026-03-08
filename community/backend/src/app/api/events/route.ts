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

export async function GET() {
  try {
    const db = await getDb();
    const events = await db
      .collection("community-events")
      .find({ date: { $gte: new Date().toISOString().split("T")[0] } })
      .sort({ date: 1 })
      .limit(30)
      .toArray();

    return NextResponse.json(events, { headers: CORS });
  } catch (err: any) {
    console.error("Error fetching events:", err.message);
    return NextResponse.json([], { headers: CORS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId = "demo-user",
      displayName = "Anonymous",
      title,
      description,
      date,
      time,
      location,
      category,
    } = await request.json();

    if (!title?.trim() || !date || !time) {
      return NextResponse.json(
        { error: "Title, date, and time are required" },
        { status: 400, headers: CORS }
      );
    }

    const event = {
      userId,
      displayName,
      title: title.trim(),
      description: (description || "").trim(),
      date,
      time,
      location: (location || "").trim(),
      category: category || "general",
      attendees: [userId],
      attendeeNames: [displayName],
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("community-events").insertOne(event);

    return NextResponse.json(
      { ...event, _id: result.insertedId },
      { status: 201, headers: CORS }
    );
  } catch (err: any) {
    console.error("Error creating event:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500, headers: CORS }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { eventId, userId = "demo-user", displayName = "You" } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400, headers: CORS }
      );
    }

    const db = await getDb();
    const event = await db
      .collection("community-events")
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404, headers: CORS });
    }

    const isAttending = (event.attendees || []).includes(userId);

    if (isAttending) {
      await db.collection("community-events").updateOne(
        { _id: new ObjectId(eventId) },
        {
          $pull: { attendees: userId, attendeeNames: displayName } as any,
        }
      );
    } else {
      await db.collection("community-events").updateOne(
        { _id: new ObjectId(eventId) },
        {
          $push: { attendees: userId, attendeeNames: displayName } as any,
        }
      );
    }

    return NextResponse.json(
      {
        attending: !isAttending,
        attendeeCount: event.attendees.length + (isAttending ? -1 : 1),
      },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("Error toggling RSVP:", err);
    return NextResponse.json(
      { error: "Failed to toggle RSVP" },
      { status: 500, headers: CORS }
    );
  }
}
