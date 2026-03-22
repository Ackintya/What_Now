import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/video-agents/jobQueue';

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  return NextResponse.json({
    jobId: job.id,
    exercise: job.exercise,
    status: job.status,
    statusDetail: job.statusDetail,
    log: job.log,
    result: job.result ?? null,
    error: job.error ?? null,
  });
}
