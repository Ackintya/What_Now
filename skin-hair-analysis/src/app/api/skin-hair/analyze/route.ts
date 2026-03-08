export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeHairImage, analyzeSkinImage } from "@/modules/skin-hair/analysis";
import { createHairLog, createSkinLog, getSkinHairProfile } from "@/modules/skin-hair/repositories";
import { formatHairResultCard, formatSkinResultCard } from "@/modules/skin-hair/formatters";
import { validateImageType } from "@/modules/skin-hair/validators";

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

function toBase64(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = String(formData.get("user_id") || "").trim();
    const target = String(formData.get("target") || "").trim().toLowerCase();
    const file = formData.get("image");

    if (!userId || !target || !(file instanceof File)) {
      return NextResponse.json(
        { error: "user_id, target (skin|hair), and image file are required" },
        { status: 400 },
      );
    }

    if (target !== "skin" && target !== "hair") {
      return NextResponse.json({ error: "target must be skin or hair" }, { status: 400 });
    }

    if (!validateImageType(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 6MB)" }, { status: 400 });
    }

    const profile = (await getSkinHairProfile(userId)) || {};
    const bytes = await file.arrayBuffer();
    const base64Image = toBase64(bytes);

    const analysisSessionId = crypto.randomUUID();

    if (target === "skin") {
      const { result, provider } = await analyzeSkinImage(base64Image, profile);

      await createSkinLog({
        user_id: userId,
        analysis_session_id: analysisSessionId,
        date: new Date(),
        dryness_score: result.dryness_score,
        oiliness_score: result.oiliness_score,
        acne_like_appearance_score: result.acne_like_appearance_score,
        dark_circles_score: result.dark_circles_score,
        confidence: result.confidence,
        derived_from_image: true,
        model_version: provider,
        brief_observation: result.brief_observation,
        grounding_line: result.grounding_line,
      });

      return NextResponse.json({
        success: true,
        target,
        analysis_session_id: analysisSessionId,
        analysis: result,
        formatted_output: formatSkinResultCard(result),
        image_privacy: "Raw image discarded immediately after analysis.",
      });
    }

    const { result, provider } = await analyzeHairImage(base64Image, profile);

    await createHairLog({
      user_id: userId,
      analysis_session_id: analysisSessionId,
      date: new Date(),
      scalp_dryness_score: result.scalp_dryness_score,
      dandruff_like_flaking_score: result.dandruff_like_flaking_score,
      thinning_appearance_score: result.thinning_appearance_score,
      confidence: result.confidence,
      derived_from_image: true,
      model_version: provider,
      brief_observation: result.brief_observation,
      grounding_line: result.grounding_line,
    });

    return NextResponse.json({
      success: true,
      target,
      analysis_session_id: analysisSessionId,
      analysis: result,
      formatted_output: formatHairResultCard(result),
      image_privacy: "Raw image discarded immediately after analysis.",
    });
  } catch (error) {
    console.error("Image analysis failed:", error);
    return NextResponse.json({ error: "Image analysis failed" }, { status: 500 });
  }
}
