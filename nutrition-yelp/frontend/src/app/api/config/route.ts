import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    base: process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    nutrition: process.env.NUTRITION_URL || process.env.NEXT_PUBLIC_NUTRITION_URL || "http://localhost:3003",
    yelp: process.env.YELP_URL || process.env.NEXT_PUBLIC_YELP_URL || "http://localhost:3004",
    skin: process.env.SKIN_URL || process.env.NEXT_PUBLIC_SKIN_URL || "http://localhost:3002",
    community: process.env.COMMUNITY_URL || process.env.NEXT_PUBLIC_COMMUNITY_URL || "http://localhost:3006"
  });
}
