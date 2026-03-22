import { createAnalyzerFromSpec, normalizeAnalyzerSpec, type AnalyzerSpec } from './specEngine';

export type SpecPromptVariant = 'baseline_contract' | 'reasoned_contract';

const METRIC_GUIDE = `Available numeric metrics:
- leftElbow, rightElbow, avgElbow
- leftShoulder, rightShoulder, avgShoulder
- leftKnee, rightKnee, avgKnee
- leftHip, rightHip, avgHip
- spineAngle, neckAngle

Available meta metrics:
- orientation: "front" | "side" | "unclear"
- shoulderSpanRatio
- bodyHeightRatio
- fullBodyVisible
- shoulderVisibilityAsymmetry`;

const SHAPE_GUIDE = `Return JSON only with this shape:
{
  "cameraSetup": "front" | "side",
  "cameraInstructions": "short spoken setup sentence",
  "spec": {
    "version": 1,
    "exerciseName": "exercise name",
    "cameraSetup": "front" | "side",
    "cameraInstructions": "same short spoken setup sentence",
    "startPhase": "neutral" | "down" | "up",
    "entryChecks": [AnalyzerCheck],
    "formChecks": [AnalyzerCheck],
    "phases": [AnalyzerPhase],
    "transitions": [AnalyzerTransition],
    "debugMetrics": ["metricName"]
  }
}

AnalyzerCheck:
{
  "metric": "avgElbow",
  "min": 0,
  "max": 180,
  "equals": true,
  "oneOf": ["front", "unclear"],
  "message": "spoken coaching cue",
  "severity": "LOW" | "MEDIUM" | "HIGH",
  "joint": "spine" | "shoulder" | "knee" | "meta",
  "invalidatesPosition": true,
  "appliesWhenPhase": ["up"]
}

AnalyzerPhase:
{ "name": "down", "matchAll": [{ "metric": "avgElbow", "min": 145, "max": 180 }] }

AnalyzerTransition:
{ "from": ["down"], "to": "up", "incrementRep": true, "requireValidPosition": true }`;

const GLOBAL_RULES = `Rules:
1. Use only the available metrics.
2. The spec must be deterministic and executable without extra code.
3. Do not output JavaScript or Python.
4. entryChecks must always cover fullBodyVisible, bodyHeightRatio, and orientation.
5. Include 2 or 3 phases maximum.
6. Include 2 to 5 form checks maximum.
7. Count reps on a clean transition into the work phase.
8. Use conservative thresholds when uncertain instead of extreme values.
9. For standing upper-body exercises, include posture and leg-straightness checks.
10. Return valid JSON only.`;

export interface SpecLabPromptInput {
  exerciseName: string;
  promptVariant?: SpecPromptVariant;
  observedRanges?: string | null;
  developerNote?: string | null;
}

export interface ParsedSpecResponse {
  cameraSetup: 'front' | 'side';
  cameraInstructions: string;
  spec: AnalyzerSpec;
}

export interface SpecQualityReport {
  ok: boolean;
  warnings: string[];
  derived: {
    phaseNames: string[];
    transitionCount: number;
    formCheckCount: number;
    entryCheckCount: number;
    incrementingTransitions: number;
  };
}

export function isSpecPromptVariant(value: unknown): value is SpecPromptVariant {
  return value === 'baseline_contract' || value === 'reasoned_contract';
}

export function buildSpecPrompts(input: SpecLabPromptInput) {
  const promptVariant = input.promptVariant ?? 'reasoned_contract';

  const systemPrompt =
    promptVariant === 'baseline_contract'
      ? [
          'You generate analyzer specs for a plug-and-play exercise engine.',
          METRIC_GUIDE,
          SHAPE_GUIDE,
          GLOBAL_RULES,
        ].join('\n\n')
      : [
          'You generate analyzer specs for a plug-and-play exercise engine.',
          'Infer the exercise-specific constraints from the exercise name and the allowed metrics.',
          'Do not rely on memorized templates or copy patterns from other exercises.',
          'Choose only the joints, phases, and checks that are biomechanically necessary.',
          'Prefer simple specs that a deterministic runtime can execute safely.',
          METRIC_GUIDE,
          SHAPE_GUIDE,
          GLOBAL_RULES,
        ].join('\n\n');

  const userSections = [
    `Create an analyzer spec for this exercise: ${input.exerciseName.trim()}`,
    'Goal: live rep counting plus basic form checks in a deterministic runtime.',
  ];

  if (input.observedRanges?.trim()) {
    userSections.push(`Observed feature ranges:\n${input.observedRanges.trim()}`);
  }

  if (input.developerNote?.trim()) {
    userSections.push(`Developer note:\n${input.developerNote.trim()}`);
  }

  if (promptVariant === 'reasoned_contract') {
    userSections.push(
      [
        'Before deciding thresholds, infer:',
        '- the main moving joints',
        '- the stable joints that should be checked for bad form',
        '- the most likely camera setup',
        '- what event should increment the rep counter',
        'Do that reasoning internally and return JSON only.',
      ].join('\n')
    );
  }

  userSections.push('Return JSON only.');

  return {
    promptVariant,
    systemPrompt,
    userPrompt: userSections.join('\n\n'),
  };
}

export async function callOpenAISpecGeneration(
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({}));
    throw new Error(errorPayload.error?.message || `OpenAI HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (joined) {
      return joined;
    }
  }

  throw new Error('Empty model response');
}

function parseJsonObject(text: string): Record<string, unknown> {
  const stripped = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    const match = stripped.match(/\{[\s\S]+\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
    throw new Error(`Could not parse JSON object: ${stripped.slice(0, 200)}`);
  }
}

export function parseSpecResponse(text: string): ParsedSpecResponse {
  const parsed = parseJsonObject(text);
  const rawSpec = (parsed.spec ?? parsed.analyzerSpec ?? parsed) as AnalyzerSpec;
  const cameraSetup = parsed.cameraSetup === 'side' ? 'side' : (rawSpec?.cameraSetup === 'side' ? 'side' : 'front');
  const cameraInstructionsSource = typeof parsed.cameraInstructions === 'string'
    ? parsed.cameraInstructions
    : rawSpec?.cameraInstructions;
  const cameraInstructions = typeof cameraInstructionsSource === 'string' && cameraInstructionsSource.trim()
    ? cameraInstructionsSource.trim()
    : (cameraSetup === 'side' ? 'Stand sideways with your full body visible.' : 'Face the camera with your full body visible.');

  const spec = normalizeAnalyzerSpec({
    ...rawSpec,
    version: 1,
    cameraSetup,
    cameraInstructions,
    exerciseName: typeof rawSpec?.exerciseName === 'string' && rawSpec.exerciseName.trim()
      ? rawSpec.exerciseName.trim()
      : 'Exercise',
  });

  return {
    cameraSetup,
    cameraInstructions,
    spec,
  };
}

export function inspectSpecQuality(specInput: AnalyzerSpec): SpecQualityReport {
  const warnings: string[] = [];
  const spec = normalizeAnalyzerSpec(specInput);
  const phaseNames = spec.phases.map((phase) => phase.name);
  const phaseSet = new Set(phaseNames);
  const incrementingTransitions = spec.transitions.filter((transition) => transition.incrementRep).length;

  if (spec.phases.length < 2) {
    warnings.push('Spec needs at least 2 phases.');
  }

  if (spec.transitions.length < 1) {
    warnings.push('Spec needs at least 1 transition.');
  }

  if (incrementingTransitions < 1) {
    warnings.push('Spec has no rep-incrementing transition.');
  }

  for (const transition of spec.transitions) {
    if (!phaseSet.has(transition.to)) {
      warnings.push(`Transition target "${transition.to}" is not defined as a phase.`);
    }
    for (const fromPhase of transition.from) {
      if (fromPhase !== 'neutral' && !phaseSet.has(fromPhase)) {
        warnings.push(`Transition source "${fromPhase}" is not defined as a phase.`);
      }
    }
  }

  if (!spec.debugMetrics?.length) {
    warnings.push('Spec should expose at least one debug metric.');
  }

  try {
    createAnalyzerFromSpec(spec);
  } catch (error) {
    warnings.push(`Analyzer compile failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: warnings.length === 0,
    warnings,
    derived: {
      phaseNames,
      transitionCount: spec.transitions.length,
      formCheckCount: spec.formChecks.length,
      entryCheckCount: spec.entryChecks.length,
      incrementingTransitions,
    },
  };
}
