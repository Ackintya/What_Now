"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Job {
  id: string;
  exercise: string;
  status: string;
  statusDetail: string;
  log: string[];
  error: string | null;
  createdAt: number;
  result: { cameraSetup: string; attempts: number; testerPassed: boolean } | null;
}

const STATUS_COLOR: Record<string, string> = {
  queued:    'text-[#555] border-[#222]',
  running:   'text-[#00d4ff] border-[#00d4ff33]',
  testing:   'text-[#ffaa00] border-[#ffaa0033]',
  retrying:  'text-[#ff8800] border-[#ff880033]',
  done:      'text-[#00ff9f] border-[#00ff9f33]',
  failed:    'text-[#ff4444] border-[#ff444433]',
};

const LOG_COLOR = (entry: string) => {
  if (/error|fail/i.test(entry)) return 'text-[#ff4444]';
  if (/pass|ready|complete|parsed ok/i.test(entry)) return 'text-[#00ff9f]';
  if (/retry|attempt [2-9]/i.test(entry)) return 'text-[#ffaa00]';
  return 'text-[#444]';
};

export default function PipelineLogsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/video-agents/jobs');
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs);
      setLastRefresh(new Date());
      // Auto-expand jobs that are actively running
      setExpandedJobs(prev => {
        const next = new Set(prev);
        data.jobs.forEach((j: Job) => {
          if (['running', 'testing', 'retrying', 'queued'].includes(j.status)) {
            next.add(j.id);
          }
        });
        return next;
      });
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleExpand = (id: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeJobs  = jobs.filter(j => ['queued', 'running', 'testing', 'retrying'].includes(j.status));
  const finishedJobs = jobs.filter(j => ['done', 'failed'].includes(j.status));

  return (
    <main className="min-h-screen bg-[#000] text-white font-mono">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#000] border-b border-[#111] px-4 py-3 flex items-center gap-4">
        <Link href="/fitness" className="flex items-center gap-1.5 text-[#444] hover:text-[#888] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Fitness
        </Link>
        <span className="text-[#222]">|</span>
        <span className="text-[#333] text-sm uppercase tracking-widest">Pipeline Logs</span>

        <div className="ml-auto flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[#222] text-xs">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${
              autoRefresh
                ? 'border-[#00ff9f33] text-[#00ff9f] bg-[#00ff9f08]'
                : 'border-[#222] text-[#333]'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchJobs}
            className="text-xs px-2 py-1 rounded border border-[#222] text-[#333] hover:text-[#555] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-4xl mx-auto">

        {jobs.length === 0 && (
          <div className="text-center text-[#222] py-20 text-sm">
            No jobs yet. Go to /fitness and say an exercise name.
          </div>
        )}

        {/* Active jobs */}
        {activeJobs.length > 0 && (
          <section>
            <div className="text-[#333] text-xs uppercase tracking-widest mb-3">
              Active ({activeJobs.length})
            </div>
            <div className="space-y-2">
              {activeJobs.map(job => <JobCard key={job.id} job={job} expanded={expandedJobs.has(job.id)} onToggle={() => toggleExpand(job.id)} />)}
            </div>
          </section>
        )}

        {/* Finished jobs */}
        {finishedJobs.length > 0 && (
          <section>
            <div className="text-[#222] text-xs uppercase tracking-widest mb-3">
              History ({finishedJobs.length})
            </div>
            <div className="space-y-2">
              {finishedJobs.map(job => <JobCard key={job.id} job={job} expanded={expandedJobs.has(job.id)} onToggle={() => toggleExpand(job.id)} />)}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

function JobCard({ job, expanded, onToggle }: { job: Job; expanded: boolean; onToggle: () => void }) {
  const colorClass = STATUS_COLOR[job.status] || 'text-[#555] border-[#222]';
  const age = Math.round((Date.now() - job.createdAt) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`;

  return (
    <div className={`border rounded-lg overflow-hidden ${colorClass}`}>
      {/* Job header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#050505] hover:bg-[#080808] transition-colors text-left"
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          ['running', 'testing', 'retrying', 'queued'].includes(job.status)
            ? 'animate-pulse bg-current'
            : 'bg-current'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white capitalize">{job.exercise}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${colorClass}`}>
              {job.status}
            </span>
            {job.result && (
              <span className={`text-xs ${job.result.testerPassed ? 'text-[#00ff9f]' : 'text-[#ffaa00]'}`}>
                {job.result.testerPassed ? '✓ tester passed' : '⚠ partial'} · {job.result.attempts} attempt{job.result.attempts !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#333] mt-0.5">
            {job.statusDetail} · {ageStr} · {job.log.length} log entries
          </div>
        </div>

        <span className="text-[#222] text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="bg-[#020202] px-4 py-3 space-y-0.5 max-h-64 overflow-y-auto border-t border-[#0a0a0a]">
          {job.error && (
            <div className="text-[#ff4444] text-xs mb-2 pb-2 border-b border-[#ff444422]">
              Error: {job.error}
            </div>
          )}
          {job.log.length === 0 && (
            <div className="text-[#222] text-xs">No log entries yet...</div>
          )}
          {job.log.map((entry, i) => (
            <div key={i} className={`text-[11px] leading-relaxed flex gap-2 ${LOG_COLOR(entry)}`}>
              <span className="text-[#1a1a1a] flex-shrink-0 w-5 text-right">{i + 1}</span>
              <span>{entry}</span>
            </div>
          ))}
          {job.result && (
            <div className="mt-2 pt-2 border-t border-[#111] text-[10px] text-[#333]">
              Camera: {job.result.cameraSetup} · {job.result.testerPassed ? 'Tester PASS' : 'Tester PARTIAL'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
