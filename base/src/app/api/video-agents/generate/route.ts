import { NextRequest, NextResponse } from 'next/server';
import { createJob, runJobPipeline } from '@/lib/video-agents/jobQueue';

export async function POST(req: NextRequest) {
  const { exerciseName } = await req.json();
  if (!exerciseName) return NextResponse.json({ error: 'exerciseName required' }, { status: 400 });

  const jobId = createJob(exerciseName);
  runJobPipeline(jobId); // fire-and-forget — pipeline runs async while client polls

  return NextResponse.json({ jobId });
}
