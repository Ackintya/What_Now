import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// ── MongoDB ────────────────────────────────────────────────────────────────
async function getDb() {
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB || "wellbeing_app") };
}

// Collections Gemini is allowed to query + the userId field name each uses
const ALLOWED_COLLECTIONS: Record<string, string> = {
  sessions:                  "userId",
  nutrition_profiles:        "user_id",
  generated_recipes:         "user_id",
  saved_recipes:             "user_id",
  pantry_items:              "user_id",
  skin_hair_profiles:        "user_id",
  skin_logs:                 "user_id",
  hair_logs:                 "user_id",
  loved_products:            "user_id",
  product_recommendations:   "user_id",
  favorites:                 "userId",
  clicks:                    "userId",
  nutrition_insight_memory:  "user_id",
  "yelp-insights":           "userId",
  wellness_insights:         "user_id",
  userProfiles:              "userId",
};

// ── Tool definitions ───────────────────────────────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_user_data",
        description:
          "Fetch this user's records from a WellBeing database collection. " +
          "Always call this tool when the user asks about their own data — " +
          "date of birth, height, weight, exercise sessions, recipes, skin logs, " +
          "hair logs, restaurant favorites, pantry contents, nutrition goals, etc. " +
          "Never guess — always fetch the real data first.",
        parameters: {
          type: "object",
          properties: {
            collection: {
              type: "string",
              enum: Object.keys(ALLOWED_COLLECTIONS),
              description:
                "Collection to query. " +
                "'userProfiles' → DOB/height/weight/lifestyle. " +
                "'sessions' → workout history. " +
                "'skin_logs' → skin analysis history. " +
                "'hair_logs' → hair analysis history. " +
                "'generated_recipes' → AI-generated recipes. " +
                "'saved_recipes' → saved recipe IDs. " +
                "'loved_products' → skincare products user likes. " +
                "'product_recommendations' → recommended skincare/haircare. " +
                "'pantry_items' → current pantry ingredients. " +
                "'favorites' → favourite restaurants. " +
                "'nutrition_profiles' → diet goals and restrictions. " +
                "'clicks' → restaurant search history. " +
                "'nutrition_insight_memory' → AI nutrition insights. " +
                "'yelp-insights' → AI dining insights.",
            },
            limit: {
              type: "integer",
              description: "Max records to return. Default 5, max 20.",
            },
            sort_field: {
              type: "string",
              description: "Field to sort by, e.g. 'created_at', 'timestamp', 'saved_at'.",
            },
            sort_order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "asc or desc. Default: desc (newest first).",
            },
          },
          required: ["collection"],
        },
      },
    ],
  },
];

// ── Execute tool call ──────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  if (name !== "get_user_data") return { error: "Unknown tool" };

  const { collection, limit = 5, sort_field, sort_order = "desc" } = args;

  if (!ALLOWED_COLLECTIONS[collection]) {
    return { error: `Collection '${collection}' is not accessible.` };
  }

  const { client, db } = await getDb();
  try {
    const userIdField = ALLOWED_COLLECTIONS[collection];
    const sortObj = sort_field
      ? { [sort_field]: sort_order === "asc" ? 1 : -1 }
      : { _id: -1 as const };

    const results = await db
      .collection(collection)
      .find({ [userIdField]: userId })
      .sort(sortObj)
      .limit(Math.min(Number(limit) || 5, 20))
      .toArray();

    // Strip passwords
    const sanitized = results.map((r: any) => {
      const { password, ...rest } = r;
      return rest;
    });

    console.log(
      `🔧 [Agent Tool] get_user_data("${collection}") → ${sanitized.length} records`
    );
    console.log(JSON.stringify(sanitized, null, 2));

    return { collection, count: sanitized.length, data: sanitized };
  } finally {
    await client.close();
  }
}

// ── Gemini API call (with proper systemInstruction) ─────────────────────
async function callGemini(
  systemInstruction: string,
  contents: any[],
  withTools: boolean
): Promise<any> {
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

  const body: any = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
  };
  if (withTools) body.tools = TOOLS;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data?.candidates?.[0]) return data;
      console.error(`[Gemini] ${model} returned no candidates:`, JSON.stringify(data));
    } catch (e) {
      console.error(`[Gemini] ${model} failed:`, e);
      continue;
    }
  }
  return null;
}

// ── POST /api/agent/chat ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId, profileContext, messages, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // System instruction — top-level, separate from conversation
    const systemInstruction = `You are WellBeing Agent — a friendly, accurate wellness AI assistant embedded in the WellBeing app.

USER PROFILE CONTEXT (from their real data):
${profileContext || "No profile built yet."}

USER ID: ${userId}

CRITICAL RULES:
1. You have a tool: get_user_data. USE IT whenever the user asks about their own data.
   - Asked about date of birth, age, height, weight? → call get_user_data("userProfiles")
   - Asked about workouts or exercise sessions? → call get_user_data("sessions")
   - Asked about recipes or food? → call get_user_data("generated_recipes") or "saved_recipes"
   - Asked about skin or hair? → call get_user_data("skin_logs") or "hair_logs"
   - Asked about restaurants or favorites? → call get_user_data("favorites")
   - Asked about nutrition goals? → call get_user_data("nutrition_profiles")
   - When in doubt about any personal data, CALL THE TOOL — never guess.
2. Only state facts you can confirm from the profile context or tool results. Never hallucinate.
3. Do not make medical diagnoses or prescribe treatments.
4. Keep responses warm, concise (3-5 sentences), and specific to this user's real data.`;

    // Build conversation (only real messages, no system prompt in contents)
    const history = (messages || []).slice(-9);
    const contents: any[] = [
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    console.log(`\n💬 [Agent Chat] User: "${message}"`);

    // ── Agentic loop: up to 4 tool call rounds ─────────────────
    let currentContents = [...contents];
    let finalResponse = "";

    for (let round = 0; round < 4; round++) {
      const geminiResp = await callGemini(systemInstruction, currentContents, true);
      if (!geminiResp) break;

      const candidate = geminiResp.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const functionCallPart = parts.find((p: any) => p.functionCall);
      const textPart = parts.find((p: any) => p.text);

      if (functionCallPart) {
        const { name, args } = functionCallPart.functionCall;
        console.log(`🔧 [Agent Chat] Round ${round + 1} — calling tool: ${name}(${JSON.stringify(args)})`);

        const toolResult = await executeTool(name, args, userId);

        currentContents = [
          ...currentContents,
          { role: "model", parts: [{ functionCall: { name, args } }] },
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name,
                  response: { result: toolResult },
                },
              },
            ],
          },
        ];
        continue;
      }

      if (textPart) {
        finalResponse = textPart.text.trim();
        console.log(`✅ [Agent Chat] Final response after ${round} tool round(s):\n${finalResponse}\n`);
        break;
      }

      break;
    }

    if (!finalResponse) {
      finalResponse = "I couldn't generate a response right now. Please try again.";
    }

    // ── Persist both messages to MongoDB ──────────────────────
    try {
      const { client: saveClient, db: saveDb } = await getDb();
      const now = new Date();
      await saveDb.collection("agent_chats").insertMany([
        { userId, role: "user",      content: message,       timestamp: now },
        { userId, role: "assistant", content: finalResponse, timestamp: new Date(now.getTime() + 1) },
      ]);
      await saveClient.close();
    } catch (saveErr) {
      console.error("[Agent Chat] Failed to save messages:", saveErr);
    }

    return NextResponse.json({ response: finalResponse });
  } catch (err) {
    console.error("Agent chat error:", err);
    return NextResponse.json(
      { response: "I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}
