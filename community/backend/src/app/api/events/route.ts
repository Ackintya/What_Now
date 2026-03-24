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

function serializeEvent(event: any) {
  return {
    ...event,
    userId: event.user_id ?? event.userId,
    displayName: event.display_name ?? event.displayName,
    attendeeNames: event.attendee_names ?? event.attendeeNames ?? [],
    createdAt: event.created_at ?? event.createdAt,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const events = await db
      .collection("community_events")
      .find({ date: { $gte: new Date().toISOString().split("T")[0] } })
      .sort({ date: 1 })
      .limit(30)
      .toArray();

    return NextResponse.json(events.map(serializeEvent), { headers: CORS });
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
      user_id: userId,
      display_name: displayName,
      title: title.trim(),
      description: (description || "").trim(),
      date,
      time,
      location: (location || "").trim(),
      category: category || "general",
      attendees: [userId],
      attendee_names: [displayName],
      created_at: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("community_events").insertOne(event);

    return NextResponse.json(
      { ...serializeEvent(event), _id: result.insertedId },
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
      .collection("community_events")
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404, headers: CORS });
    }

    const attendees = event.attendees || [];
    const isAttending = attendees.includes(userId);

    if (isAttending) {
      await db.collection("community_events").updateOne(
        { _id: new ObjectId(eventId) },
        {
          $pull: { attendees: userId, attendee_names: displayName } as any,
        }
      );
    } else {
      await db.collection("community_events").updateOne(
        { _id: new ObjectId(eventId) },
        {
          $push: { attendees: userId, attendee_names: displayName } as any,
        }
      );
    }

    return NextResponse.json(
      {
        attending: !isAttending,
        attendeeCount: attendees.length + (isAttending ? -1 : 1),
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
