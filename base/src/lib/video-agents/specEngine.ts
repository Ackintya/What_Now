import type { AnalysisResult, AnalysisState, ExerciseFrame } from './precompute';

export type AnalyzerMetric =
  | keyof ExerciseFrame['angles']
  | keyof ExerciseFrame['meta']
  | 'avgElbow'
  | 'avgShoulder'
  | 'avgKnee'
  | 'avgHip';

export interface AnalyzerCondition {
  metric: AnalyzerMetric;
  min?: number;
  max?: number;
  equals?: string | boolean | number;
  oneOf?: Array<string | boolean | number>;
}

export interface AnalyzerCheck extends AnalyzerCondition {
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  joint?: string;
  invalidatesPosition?: boolean;
  appliesWhenPhase?: string[];
}

export interface AnalyzerPhase {
  name: string;
  matchAll: AnalyzerCondition[];
}

export interface AnalyzerTransition {
  from: string[];
  to: string;
  incrementRep?: boolean;
  requireValidPosition?: boolean;
}

export interface AnalyzerSpec {
  version: 1;
  exerciseName: string;
  cameraSetup: 'front' | 'side';
  cameraInstructions: string;
  startPhase: 'up' | 'down' | 'neutral';
  entryChecks: AnalyzerCheck[];
  formChecks: AnalyzerCheck[];
  phases: AnalyzerPhase[];
  transitions: AnalyzerTransition[];
  debugMetrics?: AnalyzerMetric[];
}

function isStandingExercise(exerciseName: string): boolean {
  return /(bicep curl|curl|lateral raise|front raise|shoulder press|overhead press|upright row|tricep extension)/i.test(exerciseName);
}

function clampNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function normalizeCondition(condition: AnalyzerCondition): AnalyzerCondition {
  return {
    metric: condition.metric,
    min: clampNumber(condition.min),
    max: clampNumber(condition.max),
    equals: condition.equals,
    oneOf: Array.isArray(condition.oneOf) ? condition.oneOf.slice(0, 6) : undefined,
  };
}

function normalizeCheck(check: AnalyzerCheck): AnalyzerCheck {
  return {
    ...normalizeCondition(check),
    message: typeof check.message === 'string' && check.message.trim()
      ? check.message.trim()
      : 'Adjust your form',
    severity: check.severity === 'LOW' || check.severity === 'MEDIUM' ? check.severity : 'HIGH',
    joint: typeof check.joint === 'string' ? check.joint : undefined,
    invalidatesPosition: check.invalidatesPosition !== false,
    appliesWhenPhase: Array.isArray(check.appliesWhenPhase)
      ? check.appliesWhenPhase.filter((phase): phase is string => typeof phase === 'string' && phase.trim().length > 0)
      : undefined,
  };
}

export function normalizeAnalyzerSpec(input: AnalyzerSpec): AnalyzerSpec {
  const rawEntryChecks = Array.isArray(input.entryChecks) ? input.entryChecks.map(normalizeCheck) : [];
  const metaEntryChecks: AnalyzerCheck[] = [];
  const promotedFormChecks: AnalyzerCheck[] = [];

  for (const check of rawEntryChecks) {
    if (check.metric === 'fullBodyVisible' || check.metric === 'bodyHeightRatio' || check.metric === 'orientation') {
      metaEntryChecks.push(check);
    } else {
      promotedFormChecks.push(check);
    }
  }

  const normalized: AnalyzerSpec = {
    version: 1,
    exerciseName: typeof input.exerciseName === 'string' ? input.exerciseName.trim() : 'Exercise',
    cameraSetup: input.cameraSetup === 'side' ? 'side' : 'front',
    cameraInstructions: typeof input.cameraInstructions === 'string' && input.cameraInstructions.trim()
      ? input.cameraInstructions.trim()
      : 'Stand where your full body is visible.',
    startPhase: input.startPhase === 'up' || input.startPhase === 'down' ? input.startPhase : 'neutral',
    entryChecks: metaEntryChecks,
    formChecks: [
      ...promotedFormChecks,
      ...(Array.isArray(input.formChecks) ? input.formChecks.map(normalizeCheck) : []),
    ],
    phases: Array.isArray(input.phases)
      ? input.phases
          .filter((phase): phase is AnalyzerPhase => !!phase && typeof phase.name === 'string' && Array.isArray(phase.matchAll))
          .map((phase) => ({
            name: phase.name.trim(),
            matchAll: phase.matchAll.map(normalizeCondition),
          }))
          .filter((phase) => phase.name.length > 0 && phase.matchAll.length > 0)
      : [],
    transitions: Array.isArray(input.transitions)
      ? input.transitions
          .filter((transition): transition is AnalyzerTransition => !!transition && Array.isArray(transition.from) && typeof transition.to === 'string')
          .map((transition) => ({
            from: transition.from.filter((phase): phase is string => typeof phase === 'string' && phase.trim().length > 0),
            to: transition.to.trim(),
            incrementRep: transition.incrementRep === true,
            requireValidPosition: transition.requireValidPosition !== false,
          }))
          .filter((transition) => transition.from.length > 0 && transition.to.length > 0)
      : [],
    debugMetrics: Array.isArray(input.debugMetrics)
      ? input.debugMetrics.filter((metric): metric is AnalyzerMetric => typeof metric === 'string').slice(0, 6)
      : ['avgElbow', 'avgShoulder', 'avgKnee', 'spineAngle', 'bodyHeightRatio'],
  };

  if (!normalized.entryChecks.some((check) => check.metric === 'fullBodyVisible')) {
    normalized.entryChecks.unshift({
      metric: 'fullBodyVisible',
      equals: true,
      message: 'Full body must stay visible',
      severity: 'HIGH',
      joint: 'meta',
      invalidatesPosition: true,
    });
  }

  if (!normalized.entryChecks.some((check) => check.metric === 'bodyHeightRatio')) {
    normalized.entryChecks.push({
      metric: 'bodyHeightRatio',
      min: 0.55,
      max: 0.92,
      message: 'Step back until your full body fits in frame',
      severity: 'HIGH',
      joint: 'meta',
      invalidatesPosition: true,
    });
  }

  if (!normalized.entryChecks.some((check) => check.metric === 'orientation')) {
    normalized.entryChecks.push({
      metric: 'orientation',
      oneOf: [normalized.cameraSetup, 'unclear'],
      message: normalized.cameraSetup === 'side'
        ? 'Turn sideways to the camera'
        : 'Face the camera',
      severity: 'HIGH',
      joint: 'meta',
      invalidatesPosition: true,
    });
  }

  normalized.entryChecks = normalized.entryChecks.map((check) => {
    if (check.metric !== 'orientation') {
      return check;
    }

    const allowed = new Set<string>();
    if (Array.isArray(check.oneOf)) {
      check.oneOf.forEach((value) => {
        if (typeof value === 'string') {
          allowed.add(value);
        }
      });
    }

    if (typeof check.equals === 'string') {
      allowed.add(check.equals);
    }

    allowed.add(normalized.cameraSetup);
    allowed.add('unclear');

    return {
      ...check,
      equals: undefined,
      oneOf: Array.from(allowed),
    };
  });

  if (isStandingExercise(normalized.exerciseName)) {
    if (!normalized.formChecks.some((check) => check.metric === 'avgKnee')) {
      normalized.formChecks.unshift({
        metric: 'avgKnee',
        min: 165,
        message: "Please don't bend your legs",
        severity: 'HIGH',
        joint: 'knee',
        invalidatesPosition: true,
      });
    }

    if (!normalized.formChecks.some((check) => check.metric === 'spineAngle')) {
      normalized.formChecks.unshift({
        metric: 'spineAngle',
        min: 170,
        message: 'Please stand straight',
        severity: 'HIGH',
        joint: 'spine',
        invalidatesPosition: true,
      });
    }
  }

  return normalized;
}

function getMetricValue(frame: ExerciseFrame, metric: AnalyzerMetric): string | boolean | number | undefined {
  const derived = {
    avgElbow: (frame.angles.leftElbow + frame.angles.rightElbow) / 2,
    avgShoulder: (frame.angles.leftShoulder + frame.angles.rightShoulder) / 2,
    avgKnee: (frame.angles.leftKnee + frame.angles.rightKnee) / 2,
    avgHip: (frame.angles.leftHip + frame.angles.rightHip) / 2,
  } satisfies Record<'avgElbow' | 'avgShoulder' | 'avgKnee' | 'avgHip', number>;

  if (metric in derived) {
    return derived[metric as keyof typeof derived];
  }

  if (metric in frame.angles) {
    return frame.angles[metric as keyof ExerciseFrame['angles']];
  }

  if (metric in frame.meta) {
    return frame.meta[metric as keyof ExerciseFrame['meta']];
  }

  return undefined;
}

function conditionMatches(frame: ExerciseFrame, condition: AnalyzerCondition): boolean {
  const value = getMetricValue(frame, condition.metric);
  if (value === undefined) return false;

  if (condition.equals !== undefined) {
    return value === condition.equals;
  }

  if (condition.oneOf?.length) {
    return condition.oneOf.includes(value);
  }

  if (typeof value !== 'number') {
    return false;
  }

  if (condition.min !== undefined && value < condition.min) {
    return false;
  }

  if (condition.max !== undefined && value > condition.max) {
    return false;
  }

  return true;
}

function collectCheckFailures(
  frame: ExerciseFrame,
  checks: AnalyzerCheck[],
  phase: string,
): Array<{ severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; joint?: string; invalidatesPosition: boolean }> {
  const failures: Array<{ severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string; joint?: string; invalidatesPosition: boolean }> = [];

  for (const check of checks) {
    if (check.appliesWhenPhase?.length && !check.appliesWhenPhase.includes(phase)) {
      continue;
    }

    if (!conditionMatches(frame, check)) {
      failures.push({
        severity: check.severity,
        message: check.message,
        joint: check.joint,
        invalidatesPosition: check.invalidatesPosition !== false,
      });
    }
  }

  return failures;
}

function findMatchingPhase(spec: AnalyzerSpec, frame: ExerciseFrame): string | null {
  for (const phase of spec.phases) {
    if (phase.matchAll.every((condition) => conditionMatches(frame, condition))) {
      return phase.name;
    }
  }
  return null;
}

export function createAnalyzerFromSpec(specInput: AnalyzerSpec) {
  const spec = normalizeAnalyzerSpec(specInput);

  return (frame: ExerciseFrame, state: AnalysisState): AnalysisResult => {
    const currentPhase = state.phase || spec.startPhase;
    const entryFailures = collectCheckFailures(frame, spec.entryChecks, currentPhase);

    if (entryFailures.length > 0) {
      return {
        reps: state.reps ?? 0,
        phase: currentPhase,
        formIssues: entryFailures.map(({ invalidatesPosition, ...issue }) => issue),
        isValidPosition: false,
        debugInfo: Object.fromEntries(
          (spec.debugMetrics || []).map((metric) => [metric, getMetricValue(frame, metric)]).filter(([, value]) => typeof value === 'number')
        ) as Record<string, number>,
      };
    }

    const matchedPhase = findMatchingPhase(spec, frame);
    const nextPhase = matchedPhase ?? currentPhase;
    const formFailures = collectCheckFailures(frame, spec.formChecks, nextPhase);
    const isValidPosition = !formFailures.some((failure) => failure.invalidatesPosition);

    let reps = state.reps ?? 0;
    let finalPhase = nextPhase;

    for (const transition of spec.transitions) {
      if (transition.to !== nextPhase) continue;
      if (!transition.from.includes(currentPhase)) continue;

      if (transition.incrementRep && (!transition.requireValidPosition || isValidPosition)) {
        reps += 1;
      }
      finalPhase = transition.to;
      break;
    }

    return {
      reps,
      phase: finalPhase,
      formIssues: formFailures.map(({ invalidatesPosition, ...issue }) => issue),
      isValidPosition,
      debugInfo: Object.fromEntries(
        (spec.debugMetrics || []).map((metric) => [metric, getMetricValue(frame, metric)]).filter(([, value]) => typeof value === 'number')
      ) as Record<string, number>,
    };
  };
}
