import { NextRequest, NextResponse } from 'next/server';
import {
  buildSpecPrompts,
  callOpenAISpecGeneration,
  inspectSpecQuality,
  isSpecPromptVariant,
  parseSpecResponse,
} from '@/lib/video-agents/specLab';

export async function POST(req: NextRequest) {
  try {
    const {
      exerciseName,
      promptVariant = 'reasoned_contract',
      model = process.env.OPENAI_SPEC_MODEL || 'gpt-4o-mini',
      observedRanges = null,
      developerNote = null,
      dryRun = false,
    } = await req.json();

    if (typeof exerciseName !== 'string' || !exerciseName.trim()) {
      return NextResponse.json({ error: 'exerciseName is required' }, { status: 400 });
    }

    if (!isSpecPromptVariant(promptVariant)) {
      return NextResponse.json({ error: 'Invalid promptVariant' }, { status: 400 });
    }

    const prompts = buildSpecPrompts({
      exerciseName,
      promptVariant,
      observedRanges: typeof observedRanges === 'string' ? observedRanges : null,
      developerNote: typeof developerNote === 'string' ? developerNote : null,
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        promptVariant: prompts.promptVariant,
        model,
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
      });
    }

    const rawText = await callOpenAISpecGeneration(model, prompts.systemPrompt, prompts.userPrompt);
    const parsed = parseSpecResponse(rawText);
    const quality = inspectSpecQuality(parsed.spec);

    return NextResponse.json({
      ok: quality.ok,
      promptVariant: prompts.promptVariant,
      model,
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      rawText,
      parsed,
      quality,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
