import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

interface UserProfile {
  userId: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  lifestyle?: string;
  updatedAt: Date;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const userProfilesCollection = db.collection("userProfiles");

    // Fetch user profile
    const profile = await userProfilesCollection.findOne({ userId: user.userId });

    if (!profile) {
      // Return empty object if profile doesn't exist yet
      return NextResponse.json({ profile: {} });
    }

    // Remove _id from response
    const { _id, ...profileData } = profile;

    return NextResponse.json({
      profile: profileData,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dateOfBirth, height, weight, lifestyle } = body;

    // Build profile update object (only include defined fields)
    const profileUpdate: Partial<UserProfile> = {
      userId: user.userId,
      updatedAt: new Date(),
    };

    if (dateOfBirth !== undefined) {
      profileUpdate.dateOfBirth = dateOfBirth;
    }
    if (height !== undefined) {
      profileUpdate.height = height;
    }
    if (weight !== undefined) {
      profileUpdate.weight = weight;
    }
    if (lifestyle !== undefined) {
      profileUpdate.lifestyle = lifestyle;
    }

    const db = await getDatabase();
    const userProfilesCollection = db.collection("userProfiles");

    // Upsert user profile
    await userProfilesCollection.updateOne(
      { userId: user.userId },
      { $set: profileUpdate },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      profile: profileUpdate,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
