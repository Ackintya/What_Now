import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || null;

  return NextResponse.json({
    dashboard: process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3005",
    nutrition: process.env.NUTRITION_URL || process.env.NEXT_PUBLIC_NUTRITION_URL || "http://localhost:3003",
    yelp: process.env.YELP_URL || process.env.NEXT_PUBLIC_YELP_URL || "http://localhost:3004",
    skin: process.env.SKIN_URL || process.env.NEXT_PUBLIC_SKIN_URL || "http://localhost:3002",
    community: process.env.COMMUNITY_URL || process.env.NEXT_PUBLIC_COMMUNITY_URL || "http://localhost:3006",
    token: token
  });
}
