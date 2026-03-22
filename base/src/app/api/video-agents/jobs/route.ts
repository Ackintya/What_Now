import { NextResponse } from 'next/server';

export async function GET() {
  // Access the global job queue directly
  const jobs: Map<string, any> = (global as any)._jobQueue ?? new Map();

  const list = Array.from(jobs.values())
    .sort((a, b) => b.createdAt - a.createdAt) // newest first
    .map(j => ({
      id: j.id,
      exercise: j.exercise,
      status: j.status,
      statusDetail: j.statusDetail,
      log: j.log,
      error: j.error ?? null,
      createdAt: j.createdAt,
      result: j.result
        ? { cameraSetup: j.result.cameraSetup, attempts: j.result.attempts, testerPassed: j.result.testerResult?.passed }
        : null,
    }));

  return NextResponse.json({ jobs: list });
}
