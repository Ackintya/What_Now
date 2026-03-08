import { NextRequest, NextResponse } from "next/server";

const YELP_API_BASE = "https://api.yelp.com/v3/businesses/search";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YELP_API_KEY is not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const { searchParams } = request.nextUrl;
  const location = searchParams.get("location");

  if (!location) {
    return NextResponse.json(
      { error: "location parameter is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const params = new URLSearchParams();
  params.set("location", location);

  const term = searchParams.get("term");
  if (term) params.set("term", term);

  const categories = searchParams.get("categories");
  if (categories) params.set("categories", categories);

  const price = searchParams.get("price");
  if (price) params.set("price", price);

  const limit = searchParams.get("limit") || "20";
  params.set("limit", limit);

  const offset = searchParams.get("offset") || "0";
  params.set("offset", offset);

  const sortBy = searchParams.get("sort_by");
  if (sortBy) params.set("sort_by", sortBy);

  const openNow = searchParams.get("open_now");
  if (openNow) params.set("open_now", openNow);

  try {
    const response = await fetch(`${YELP_API_BASE}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Yelp API error:", response.status, errorData);
      return NextResponse.json(
        { error: "Failed to fetch from Yelp", status: response.status },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    const data = await response.json();

    const businesses = (data.businesses || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      image_url: b.image_url,
      url: b.url,
      rating: b.rating,
      review_count: b.review_count,
      price: b.price || null,
      phone: b.display_phone || b.phone,
      categories: (b.categories || []).map((c: any) => ({
        alias: c.alias,
        title: c.title,
      })),
      location: {
        address1: b.location?.address1,
        city: b.location?.city,
        state: b.location?.state,
        zip_code: b.location?.zip_code,
        display_address: b.location?.display_address,
      },
      coordinates: b.coordinates,
      is_closed: b.is_closed,
      distance: b.distance,
    }));

    return NextResponse.json(
      {
        businesses,
        total: data.total,
        region: data.region,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching Yelp data:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching restaurant data" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
