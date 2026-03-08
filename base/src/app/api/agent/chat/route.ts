import { NextRequest, NextResponse } from "next/server";

async function geminiChat(
  profileContext: string,
  history: { role: string; content: string }[],
  message: string
): Promise<string> {
  const systemPrompt = `You are WellBeing Agent — a friendly, knowledgeable, and personalized wellness AI assistant embedded in the WellBeing app.

USER PROFILE CONTEXT:
${profileContext || "A WellBeing app user interested in health and wellness."}

INSTRUCTIONS:
- Be conversational, warm, and specific to this user's known habits and preferences
- Keep responses concise (2-4 sentences) unless detail is genuinely needed
- Topics you can help with: fitness & exercise form, nutrition & meal planning, restaurant choices, skin care, hair care, general wellness, recovery
- Reference the user's specific habits and preferences when relevant
- Never make medical diagnoses or prescribe treatments
- If asked about something outside wellness, gently redirect`;

  // Build Gemini contents: system turn + history + current message
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    {
      role: "model",
      parts: [{ text: "Got it! I'm ready to give you personalized wellness guidance." }],
    },
    ...history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 500, temperature: 0.8 },
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch {
      continue;
    }
  }
  return "I'm having trouble responding right now. Please try again.";
}

export async function POST(req: NextRequest) {
  try {
    const { userId, profileContext, messages, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // Keep last 9 messages as history (leave room for current)
    const history = (messages || []).slice(-9);

    const response = await geminiChat(profileContext || "", history, message);

    return NextResponse.json({ response });
  } catch (err) {
    console.error("Agent chat error:", err);
    return NextResponse.json(
      { response: "I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}
