export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listPantryItems, replacePantryItems } from "@/modules/nutrition/repositories";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const items = await listPantryItems(userId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Failed to list pantry items:", error);
    return NextResponse.json({ error: "Failed to list pantry items" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const userId = String(payload.user_id || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const normalized = rawItems
      .map((item) => {
        if (typeof item === "string") {
          return { item_name: item.trim() };
        }

        if (typeof item === "object" && item) {
          const asObj = item as Record<string, unknown>;
          return {
            item_name: String(asObj.item_name || "").trim(),
            quantity: asObj.quantity !== undefined ? Number(asObj.quantity) : undefined,
            unit: typeof asObj.unit === "string" ? asObj.unit.trim() : undefined,
          };
        }

        return { item_name: "" };
      })
      .filter((item) => item.item_name.length > 0);

    const items = await replacePantryItems(userId, normalized);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Failed to save pantry items:", error);
    return NextResponse.json({ error: "Failed to save pantry items" }, { status: 500 });
  }
}
