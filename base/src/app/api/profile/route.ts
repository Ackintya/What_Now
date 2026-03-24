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

interface UserProfileDocument {
  user_id: string;
  date_of_birth?: string;
  height?: number;
  weight?: number;
  lifestyle?: string;
  updated_at: Date;
}

function serializeProfile(profile: UserProfileDocument): UserProfile {
  return {
    userId: profile.user_id,
    dateOfBirth: profile.date_of_birth,
    height: profile.height,
    weight: profile.weight,
    lifestyle: profile.lifestyle,
    updatedAt: profile.updated_at,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const userProfilesCollection = db.collection<UserProfileDocument>("user_profiles");

    // Fetch user profile
    const profile = await userProfilesCollection.findOne({ user_id: user.userId });

    if (!profile) {
      // Return empty object if profile doesn't exist yet
      return NextResponse.json({ profile: {} });
    }

    // Remove _id from response
    const { _id, ...profileData } = profile;

    return NextResponse.json({
      profile: serializeProfile(profileData),
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
    const profileUpdate: Partial<UserProfileDocument> = {
      user_id: user.userId,
      updated_at: new Date(),
    };

    if (dateOfBirth !== undefined) {
      profileUpdate.date_of_birth = dateOfBirth;
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
    const userProfilesCollection = db.collection<UserProfileDocument>("user_profiles");

    // Upsert user profile
    await userProfilesCollection.updateOne(
      { user_id: user.userId },
      { $set: profileUpdate },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      profile: serializeProfile(profileUpdate as UserProfileDocument),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
