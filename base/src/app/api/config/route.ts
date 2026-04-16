import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    dashboard: process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3005",
    nutrition: process.env.NEXT_PUBLIC_NUTRITION_URL || "http://localhost:3003",
    yelp: process.env.NEXT_PUBLIC_YELP_URL || "http://localhost:3004",
    skin: process.env.NEXT_PUBLIC_SKIN_URL || "http://localhost:3002",
    community: process.env.NEXT_PUBLIC_COMMUNITY_URL || "http://localhost:3006"
  });
}
