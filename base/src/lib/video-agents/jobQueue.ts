/**
 * In-memory job queue for the exercise analyzer pipeline.
 * Jobs persist across Next.js hot reloads via globalThis.
 * Server-side only — never import from client components.
 */

import {
  callGemini,
  SPEC_MODEL,
  SIM_MODEL,
  SPEC_SYSTEM,
  SIM_SYSTEM,
  parseAnalyzerResponse,
  parseSimData,
  runTester,
} from './agents';
import type { AnalyzerSpec } from './specEngine';

export type JobStatus = 'queued' | 'running' | 'testing' | 'retrying' | 'done' | 'failed';

export interface Job {
  id: string;
  exercise: string;
  status: JobStatus;
  statusDetail: string;
  log: string[];
  result?: {
    spec: AnalyzerSpec;
    cameraSetup: string;
    cameraInstructions: string;
    testerResult: ReturnType<typeof runTester>;
    attempts: number;
  };
  error?: string;
  createdAt: number;
}

// ─── Global store (survives Next.js HMR in dev) ───────────────────────────────

declare global {
  var _jobQueue: Map<string, Job> | undefined;
}

const jobs: Map<string, Job> = global._jobQueue ?? (global._jobQueue = new Map<string, Job>());

// ─── Public API ───────────────────────────────────────────────────────────────

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function createJob(exercise: string): string {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  jobs.set(id, {
    id,
    exercise,
    status: 'queued',
    statusDetail: 'Queued',
    log: [`Queued: ${exercise}`],
    createdAt: Date.now(),
  });
  return id;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function patch(id: string, updates: Partial<Job>) {
  const j = jobs.get(id);
  if (j) jobs.set(id, { ...j, ...updates });
}

function addLog(id: string, msg: string) {
  const j = jobs.get(id);
  if (j) { j.log.push(msg); console.log(`[Job ${id}]`, msg); }
}

/** Extract min/max of every angle field across all sim frames. */
function getSimAngleStats(frames: any[]): Record<string, { min: number; max: number }> {
  const stats: Record<string, { min: number; max: number }> = {};
  for (const frame of frames) {
    for (const [key, val] of Object.entries(frame.angles || {})) {
      const v = val as number;
      if (!stats[key]) stats[key] = { min: v, max: v };
      else { stats[key].min = Math.min(stats[key].min, v); stats[key].max = Math.max(stats[key].max, v); }
    }
  }
  return stats;
}

function buildStatsLines(simFrames: any[]): string {
  const stats = getSimAngleStats(simFrames);
  return Object.entries(stats)
    .map(([k, v]) => `  ${k}: ${Math.round(v.min)}° – ${Math.round(v.max)}°`)
    .join('\n');
}

/** Build a diagnostic retry prompt with concrete angle ranges from the sim data. */
function buildRetryPrompt(
  exercise: string,
  failureContext: string,
  simFrames: any[],
  attempt: number,
  previousSpec?: AnalyzerSpec,
): string {
  const statsLines = buildStatsLines(simFrames);

  // Diagnose the most common failure patterns
  const diagnoses: string[] = [];
  const stats = getSimAngleStats(simFrames);
  const elbow = stats.leftElbow || stats.rightElbow;
  if (elbow) {
    if (elbow.min > 50) {
      diagnoses.push(`WARNING: elbow never goes below ${Math.round(elbow.min)}°. Any "up" threshold lower than that will never trigger. Use <= ${Math.round(elbow.min + 5)}° instead.`);
    }
    if (elbow.max < 130) {
      diagnoses.push(`WARNING: elbow never goes above ${Math.round(elbow.max)}°. Any "down" threshold higher than that will never trigger. Use >= ${Math.round(elbow.max - 10)}° instead.`);
    }
  }

  return [
    `Create an analyzer spec for: ${exercise}`,
    '',
    `=== TESTER FAILURE attempt ${attempt} ===`,
    failureContext,
    '',
    '=== OBSERVED SIM DATA ANGLE RANGES ===',
    statsLines,
    '',
    previousSpec ? '=== PREVIOUS SPEC ===' : '',
    previousSpec ? JSON.stringify(previousSpec, null, 2) : '',
    previousSpec ? '' : '',
    '=== DIAGNOSIS ===',
    ...diagnoses,
    'Your phase thresholds MUST sit inside these observed ranges.',
    'Use JSON only. Regenerate the full analyzer response.',
    '',
    'Fix ALL threshold and transition issues.',
  ].join('\n');
}

function cleanOldJobs() {
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runJobPipeline(jobId: string): Promise<void> {
  cleanOldJobs();
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    // ── Phase 1: Sim agent ───────────────────────────────────────────────────
    patch(jobId, { status: 'running', statusDetail: 'Generating motion simulation...' });
    addLog(jobId, 'Starting sim agent');

    let simText: string;
    try {
      simText = await callGemini(
        SIM_MODEL,
        SIM_SYSTEM,
        `Generate 30 frames (1 rep) for: ${job.exercise}`,
        16384,
        true
      );
      addLog(jobId, 'Sim agent returned');
    } catch (e: any) {
      patch(jobId, { status: 'failed', error: `Agent error: ${e.message}`, statusDetail: 'Failed' });
      addLog(jobId, `Agent error: ${e.message}`);
      return;
    }

    let simFrames: any[];
    try {
      simFrames = parseSimData(simText);
      addLog(jobId, `Sim data parsed: ${simFrames.length} frames`);
    } catch (e: any) {
      patch(jobId, { status: 'failed', error: `Sim parse error: ${e.message}`, statusDetail: 'Failed' });
      addLog(jobId, `Sim parse error — response was: ${simText.slice(0, 200)}`);
      return;
    }

    addLog(jobId, `Observed angle ranges:\n${buildStatsLines(simFrames)}`);

    // ── Phase 2: Spec agent ──────────────────────────────────────────────────
    patch(jobId, { status: 'running', statusDetail: 'Generating analyzer spec...' });
    addLog(jobId, 'Starting spec agent');

    const specPrompt = [
      `Create an analyzer spec for: ${job.exercise}`,
      '',
      'Use these observed metric ranges from the simulation:',
      buildStatsLines(simFrames),
      '',
      'Make the phase thresholds fit these ranges.',
      'Return JSON only.',
    ].join('\n');

    let specText: string;
    try {
      specText = await callGemini(SPEC_MODEL, SPEC_SYSTEM, specPrompt, 8192, true);
      addLog(jobId, 'Spec agent returned');
    } catch (e: any) {
      patch(jobId, { status: 'failed', error: `Spec agent error: ${e.message}`, statusDetail: 'Failed' });
      addLog(jobId, `Spec agent error: ${e.message}`);
      return;
    }

    let parsed: ReturnType<typeof parseAnalyzerResponse>;
    try {
      parsed = parseAnalyzerResponse(specText);
      addLog(jobId, `Spec parsed OK. Camera: ${parsed.cameraSetup}`);
    } catch (e: any) {
      patch(jobId, { status: 'failed', error: `Spec parse error: ${e.message}`, statusDetail: 'Failed' });
      addLog(jobId, `Spec parse error — response was: ${specText.slice(0, 300)}`);
      return;
    }

    // ── Phase 3: Tester with retry loop ──────────────────────────────────────
    let { spec, cameraSetup, cameraInstructions } = parsed;
    let attempts = 0;
    let testResult: ReturnType<typeof runTester>;

    while (attempts < 3) {
      attempts++;
      patch(jobId, {
        status: attempts === 1 ? 'testing' : 'retrying',
        statusDetail: attempts === 1 ? 'Testing analyzer...' : `Retrying (attempt ${attempts})...`,
      });
      addLog(jobId, `Tester run #${attempts}`);

      testResult = runTester(spec, simFrames);

      if (testResult.passed) {
        addLog(jobId, `Tester PASSED on attempt ${attempts}`);
        break;
      }

      addLog(jobId, `Tester FAILED: ${testResult.failureContext}`);

      // Log sim angle ranges on first failure so they're visible in the UI
      if (attempts === 1) {
        const stats = getSimAngleStats(simFrames);
        const elbow = stats.leftElbow;
        if (elbow) addLog(jobId, `Sim elbow range: ${Math.round(elbow.min)}°–${Math.round(elbow.max)}°`);
      }

      if (attempts < 3) {
        const retryPrompt = buildRetryPrompt(job.exercise, testResult.failureContext, simFrames, attempts, spec);
        try {
          const retryText = await callGemini(SPEC_MODEL, SPEC_SYSTEM, retryPrompt, 8192, true);
          try {
            const retried = parseAnalyzerResponse(retryText);
            spec = retried.spec;
            cameraSetup = retried.cameraSetup;
            cameraInstructions = retried.cameraInstructions;
            addLog(jobId, `Spec regenerated for attempt ${attempts + 1}`);
          } catch (parseErr: any) {
            addLog(jobId, `Parse error on retry ${attempts + 1}: ${parseErr.message} — retrying spec agent`);
          }
        } catch (e: any) {
          patch(jobId, { status: 'failed', error: e.message, statusDetail: 'Failed' });
          addLog(jobId, `Retry spec agent error: ${e.message}`);
          return;
        }
      }
    }

    // Done — pass or max retries hit
    const finalPassed = testResult!.passed;
    addLog(jobId, finalPassed
      ? `Pipeline complete in ${attempts} attempt(s)`
      : `Max retries hit — using best available code`
    );

    patch(jobId, {
      status: 'done',
      statusDetail: finalPassed ? 'Ready' : 'Ready (partial)',
      result: { spec, cameraSetup, cameraInstructions, testerResult: testResult!, attempts },
    });

  } catch (e: any) {
    patch(jobId, { status: 'failed', error: e.message, statusDetail: 'Failed' });
    addLog(jobId, `Unexpected pipeline error: ${e.message}`);
  }
}
