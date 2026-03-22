import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = 'gemini-2.5-flash';

const MASTER_SYSTEM = `You are a fitness AI coach in a voice app. You speak like a real personal trainer — casual, direct, human.

CRITICAL RULES:
- Read the FULL conversation history before every response. Never ask something that was already answered.
- Max 15 words per response. Natural speech only — this is spoken aloud.
- No fillers: "great", "certainly", "absolutely", "of course", "sure", "awesome"
- Ask only ONE question per turn. Never two.
- Vary your sentence structure — never start two responses the same way.
- If the user already told you something, acknowledge it or build on it, don't re-ask.

STATE GUIDE:
- greeting: Greet briefly and ask what exercise. One short sentence.
- gathering: You know the exercise. Ask ONE follow-up (injuries? goals? how long they've been training?).
  When ready to generate, set action="generate_exercise".
  IMPORTANT: Only set action="generate_exercise" ONCE. If jobStatus is not null, job already started — never set it again.
- preparing: Job is running in background. Keep chatting naturally. Ask about their workout history, goals, past injuries, etc.
  Do NOT say "I'm generating" every turn — say it once, then just have a normal conversation.
- ready: Job is done. Tell the exact camera position in one sentence. E.g. "Stand sideways, full body visible. Hit start when you're set."
- exercising: Give ONE short coaching cue based on frame data. Max 8 words. E.g. "Good depth — slow down a little."
- reviewing: One sentence summary of the set. Ask what they want to do next.

JOB STATUS (background — factor this into conversation naturally, don't always mention it):
- null: no job started
- "queued" or "running": code + simulation being generated
- "testing" or "retrying": verifying the analyzer
- "done": analyzer ready → transition nextState to "ready", tell user camera position
- "failed": acknowledge briefly and ask if they want to try again

OUTPUT — respond with ONLY this JSON object. No other text outside the JSON:
{"response":"<what you say — natural speech>","action":null,"exerciseName":null,"nextState":"<state>"}

ACTIONS:
- "generate_exercise": set ONCE when transitioning gathering→preparing (only when jobStatus is null)
- null: all other turns

Exercises supported: squat, deadlift, lunge, push up, pull up, bicep curl, lateral raise, shoulder press, bench press, row, plank.`;

async function callMasterGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: MASTER_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || 'unknown';
    throw new Error(`Empty Gemini response (finishReason: ${reason})`);
  }
  return text as string;
}

export async function POST(req: NextRequest) {
  const {
    userMessage = '',
    conversationHistory = [],
    currentState = 'greeting',
    frameSnapshot = null,
    exerciseName = null,
    jobStatus = null,
  } = await req.json();

  try {
    // Build contextual user message
    let contextualMessage = userMessage;
    if (frameSnapshot && currentState === 'exercising') {
      const { angles = {}, reps = 0, formIssues = [] } = frameSnapshot;
      const issues = formIssues.map((i: any) => i.message).join(', ') || 'none';
      contextualMessage = `[Frame check — rep ${reps}, form issues: ${issues}, spine: ${Math.round(angles.spineAngle || 0)}°, knee: ${Math.round(((angles.leftKnee || 0) + (angles.rightKnee || 0)) / 2)}°]`;
    }

    // Full conversation history — all messages sent every time (standard chatbot pattern)
    const historyLines = conversationHistory
      .map((m: { role: string; text: string }) =>
        `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`
      )
      .join('\n');

    const jobCtx = jobStatus
      ? `[Background: exercise pipeline status = "${jobStatus}"]\n`
      : '';
    const stateCtx = `[State: ${currentState}${exerciseName ? `, exercise: ${exerciseName}` : ''}]\n`;

    const prompt = [
      jobCtx,
      stateCtx,
      historyLines,
      historyLines ? '' : '',
      `User: ${contextualMessage || '(checking in)'}`,
      '',
      'Coach (JSON only):',
    ].join('\n');

    const rawResponse = await callMasterGemini(prompt);
    console.log('[Master] raw:', rawResponse.slice(0, 300));

    // Parse response
    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const stripped = rawResponse.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        const match = stripped.match(/\{[\s\S]+\}/);
        parsed = match
          ? JSON.parse(match[0])
          : { response: stripped.split('\n')[0], action: null, exerciseName: null, nextState: currentState };
      }
    }

    // Sanitize response text
    let responseText: string = parsed.response || '';
    if (typeof responseText === 'object') responseText = JSON.stringify(responseText);

    // Unwrap double-encoded JSON
    if (responseText.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(responseText);
        if (inner.response) responseText = inner.response;
      } catch {}
    }

    // Filter meta-commentary the model sometimes emits
    const garbage = [/^here is/i, /^here's/i, /^the json/i, /^as requested/i, /^certainly/i, /^\s*\{/, /^\s*```/];
    if (!responseText || garbage.some(p => p.test(responseText.trim()))) {
      responseText = '';
    }

    responseText = responseText.trim() || 'Got it.';

    return NextResponse.json({
      response: responseText,
      action: parsed.action || null,
      exerciseName: parsed.exerciseName || exerciseName || null,
      nextState: parsed.nextState || currentState,
    });

  } catch (e: any) {
    console.error('[Master] ERROR:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
