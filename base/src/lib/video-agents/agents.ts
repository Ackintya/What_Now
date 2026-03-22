/**
 * Shared Gemini helpers, prompts, parsers, and tester for the video-agents pipeline.
 * Server-side only — never import this from client components.
 */

import type { ExerciseFrame } from './precompute';
import { createAnalyzerFromSpec, normalizeAnalyzerSpec, type AnalyzerSpec } from './specEngine';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
export const SPEC_MODEL = 'gemini-2.5-flash';
export const SIM_MODEL = 'gemini-2.5-flash';

export const EXAMPLE_SPEC = {
  cameraSetup: 'front',
  cameraInstructions: 'Face the camera with your full body visible.',
  spec: {
    version: 1,
    exerciseName: 'bicep curl',
    cameraSetup: 'front',
    cameraInstructions: 'Face the camera with your full body visible.',
    startPhase: 'neutral',
    entryChecks: [
      {
        metric: 'fullBodyVisible',
        equals: true,
        message: 'Full body must stay visible',
        severity: 'HIGH',
        joint: 'meta',
        invalidatesPosition: true,
      },
      {
        metric: 'bodyHeightRatio',
        min: 0.55,
        max: 0.92,
        message: 'Step back until your full body fits in frame',
        severity: 'HIGH',
        joint: 'meta',
        invalidatesPosition: true,
      },
      {
        metric: 'orientation',
        oneOf: ['front', 'unclear'],
        message: 'Face the camera',
        severity: 'HIGH',
        joint: 'meta',
        invalidatesPosition: true,
      },
    ],
    formChecks: [
      {
        metric: 'spineAngle',
        min: 168,
        message: 'Keep your back straight',
        severity: 'HIGH',
        joint: 'spine',
        invalidatesPosition: true,
      },
      {
        metric: 'avgShoulder',
        max: 32,
        message: 'Keep elbows closer to your torso',
        severity: 'MEDIUM',
        joint: 'shoulder',
        invalidatesPosition: true,
      },
      {
        metric: 'avgKnee',
        min: 160,
        message: 'Keep your legs straighter',
        severity: 'MEDIUM',
        joint: 'knee',
        invalidatesPosition: true,
      },
    ],
    phases: [
      { name: 'down', matchAll: [{ metric: 'avgElbow', min: 145, max: 180 }] },
      { name: 'up', matchAll: [{ metric: 'avgElbow', min: 25, max: 85 }] },
    ],
    transitions: [
      { from: ['neutral', 'up'], to: 'down', incrementRep: false, requireValidPosition: false },
      { from: ['down'], to: 'up', incrementRep: true, requireValidPosition: true },
    ],
    debugMetrics: ['avgElbow', 'avgShoulder', 'avgKnee', 'spineAngle', 'bodyHeightRatio'],
  },
};

export const SPEC_SYSTEM = `You are an exercise analyzer spec generator.
Generate JSON only. Never generate JavaScript.

You are building a rule-based analyzer that runs on precomputed pose metrics.

Available numeric angle metrics:
- leftElbow, rightElbow, avgElbow
- leftShoulder, rightShoulder, avgShoulder (ESH shoulder-elevation angles)
- leftKnee, rightKnee, avgKnee
- leftHip, rightHip, avgHip
- spineAngle, neckAngle

Available meta metrics:
- orientation: "front" | "side" | "unclear"
- shoulderSpanRatio
- bodyHeightRatio
- fullBodyVisible
- shoulderVisibilityAsymmetry

Metric semantics:
- Higher bodyHeightRatio means the body occupies more of the frame.
- Good full-body range is usually bodyHeightRatio 0.55 to 0.92.
- Bicep curls: elbow is high when arm is straight, low when flexed.
- Raises/presses: shoulder ESH increases as the arm lifts.
- Exercise-family hints:
  - curls: usually separate phases mainly with avgElbow
  - lateral/front raises: usually separate phases mainly with avgShoulder
  - shoulder press / overhead press: usually separate phases with BOTH avgElbow and avgShoulder
  - for shoulder press, down is elbows bent with shoulders lower; up is elbows straighter with shoulders higher

Return exactly this JSON shape:
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

AnalyzerCheck shape:
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

AnalyzerPhase shape:
{ "name": "down", "matchAll": [{ "metric": "avgElbow", "min": 145, "max": 180 }] }

AnalyzerTransition shape:
{ "from": ["down"], "to": "up", "incrementRep": true, "requireValidPosition": true }

Rules:
1. Use only the available metrics.
2. The spec must be deterministic and executable without extra code.
3. Thresholds must fit the provided observed metric ranges.
4. Include 2 or 3 phases max.
5. Include 2 to 5 form checks max.
6. Rep counting should happen on a clean transition into the work phase, usually "up".
7. entryChecks should always cover fullBodyVisible, bodyHeightRatio, and orientation.
8. Do not use impossible thresholds like elbow < 30 unless the observed range actually reaches that.
9. For standing exercises like bicep curl, lateral raise, front raise, shoulder press, overhead press, and upright row:
   - include a HIGH severity knee check with message exactly "Please don't bend your legs"
   - include a HIGH severity spineAngle check with message exactly "Please stand straight"
   - both checks should invalidate position

Example:
${JSON.stringify(EXAMPLE_SPEC, null, 2)}`;

export const SIM_SYSTEM = `You are a MediaPipe pose data simulator. Generate a JSON array of exactly 30 frames (1 rep at 30fps).
Each frame: { "angles": { leftElbow, rightElbow, leftShoulder, rightShoulder, leftKnee, rightKnee, leftHip, rightHip, spineAngle, neckAngle }, "meta": { orientation, shoulderSpanRatio, bodyHeightRatio, fullBodyVisible, shoulderVisibilityAsymmetry } }
Angle reference: elbow straight=165, curled=25. knee standing=170, squat=85. spine upright=175. ESH arms-at-side=20, raised=85.
Meta: front view shoulderSpanRatio=0.28, side view=0.05. bodyHeightRatio=0.88. fullBodyVisible=true.
Use smooth sinusoidal transitions. Return ONLY a valid JSON array with no markdown and no explanation.`;

export async function callGemini(
  model: string,
  system: string,
  user: string,
  maxTokens = 8192,
  jsonMode = false,
): Promise<string> {
  const generationConfig: Record<string, unknown> = { temperature: 0.2, maxOutputTokens: maxTokens };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig,
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

function parseJsonObject(text: string): Record<string, unknown> {
  const stripped = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    const match = stripped.match(/\{[\s\S]+\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
    throw new Error(`Could not parse JSON object: ${stripped.slice(0, 160)}`);
  }
}

export function parseAnalyzerResponse(text: string) {
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

  if (spec.phases.length < 2) {
    throw new Error('Analyzer spec needs at least 2 phases');
  }

  if (spec.transitions.length < 1) {
    throw new Error('Analyzer spec needs at least 1 transition');
  }

  return { cameraSetup, cameraInstructions, spec };
}

export function parseSimData(text: string): ExerciseFrame[] {
  const clean = text.trim().replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  const normalizeFrames = (frames: ExerciseFrame[]): ExerciseFrame[] =>
    frames.map((frame) => ({
      ...frame,
      angles: Object.fromEntries(
        Object.entries(frame.angles || {}).map(([key, value]) => [
          key,
          typeof value === 'number'
            ? Math.max(0, Math.min(180, value))
            : value,
        ])
      ) as ExerciseFrame['angles'],
      meta: {
        ...frame.meta,
        bodyHeightRatio: typeof frame.meta?.bodyHeightRatio === 'number'
          ? Math.max(0, Math.min(1.2, frame.meta.bodyHeightRatio))
          : 0,
      },
    }));

  try {
    return normalizeFrames(JSON.parse(clean) as ExerciseFrame[]);
  } catch {
    const lastClose = clean.lastIndexOf('},');
    if (lastClose > 0) {
      try {
        return normalizeFrames(JSON.parse(`${clean.slice(0, lastClose + 1)}]`) as ExerciseFrame[]);
      } catch {
        // Fall through to the final error below.
      }
    }
    throw new Error(`Could not parse sim data JSON: ${clean.slice(0, 100)}`);
  }
}

export function runTester(specInput: AnalyzerSpec, frames: ExerciseFrame[], expectedReps = 3) {
  const checks: Array<{ name: string; passed: boolean; detail: string; required?: boolean }> = [];
  const runtimeErrors: string[] = [];
  const phaseTransitions: Array<{ frame: number; from: string; to: string }> = [];
  let validFrameCount = 0;
  let lastPhase = 'neutral';

  let analyzerFn: ReturnType<typeof createAnalyzerFromSpec>;
  let normalizedSpec: AnalyzerSpec;
  try {
    normalizedSpec = normalizeAnalyzerSpec(specInput);
    analyzerFn = createAnalyzerFromSpec(normalizedSpec);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      passed: false,
      failureContext: `Spec error: ${message}`,
      checks: [{ name: 'Spec parse', passed: false, detail: message }],
      repsFound: 0,
    };
  }

  const state: { phase: string; reps: number } = {
    phase: normalizedSpec.startPhase,
    reps: 0,
  };
  const allFrames = [...frames, ...frames, ...frames];

  for (let i = 0; i < allFrames.length; i++) {
    let result;
    try {
      result = analyzerFn(allFrames[i], state);
    } catch (e: unknown) {
      runtimeErrors.push(`Frame ${i}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    state.phase = result.phase ?? state.phase;
    state.reps = result.reps ?? state.reps;

    if (result.phase && result.phase !== lastPhase) {
      phaseTransitions.push({ frame: i, from: lastPhase, to: result.phase });
      lastPhase = result.phase;
    }

    if (result.isValidPosition) {
      validFrameCount++;
    }
  }

  const repsFound = state.reps;
  const downCount = phaseTransitions.filter((transition) => transition.to === 'down').length;
  const upCount = phaseTransitions.filter((transition) => transition.to === 'up').length;

  const check = (name: string, passed: boolean, detail: string, required = true) =>
    checks.push({ name, passed, detail, required });

  check('No runtime errors', runtimeErrors.length === 0, runtimeErrors[0] || 'clean');
  check(
    `Rep count (expected ≥${expectedReps - 1}, got ${repsFound})`,
    repsFound >= expectedReps - 1,
    repsFound === 0 ? 'Zero reps — phase thresholds are likely wrong' : `${repsFound} reps`
  );
  check(
    'Phase cycling',
    repsFound >= expectedReps ? true : downCount >= expectedReps && upCount >= expectedReps,
    repsFound >= expectedReps ? 'inferred from rep count' : `${phaseTransitions.length} transitions (${downCount}↓ ${upCount}↑)`
  );
  check('Valid frames exist', validFrameCount > 0, `${validFrameCount}/${allFrames.length} valid`);

  const passed = checks.filter((entry) => entry.required !== false).every((entry) => entry.passed);
  const failureContext = passed
    ? ''
    : checks.filter((entry) => !entry.passed).map((entry) => `${entry.name}: ${entry.detail}`).join('\n');

  return { passed, repsFound, checks, failureContext };
}
