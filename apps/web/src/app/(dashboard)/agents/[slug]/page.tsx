'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { AgentRunDetail } from '@/lib/kepler-types';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function durationMilliseconds(
  startedAt: string | null,
  completedAt: string | null,
) {
  if (!startedAt || !completedAt) return null;
  return new Date(completedAt).getTime() - new Date(startedAt).getTime();
}

function Duration({ milliseconds }: { milliseconds: number | null }) {
  if (milliseconds === null) return <>—</>;
  let value: string;
  let unit: string;
  if (milliseconds < 1_000) {
    value = milliseconds.toString();
    unit = 'ms';
  } else if (milliseconds < 60_000) {
    value = (milliseconds / 1_000).toFixed(1);
    unit = 's';
  } else {
    value = (milliseconds / 60_000).toFixed(1);
    unit = 'min';
  }
  return (
    <>
      <span className="font-medium text-foreground">{value}</span>{' '}
      <span className="text-[0.75em] text-muted-foreground">{unit}</span>
    </>
  );
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const api = useKeplerApi();
  const [detail, setDetail] = useState<AgentRunDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<AgentRunDetail>(`/api/v1/agents/${encodeURIComponent(slug)}/runs`)
      .then(setDetail)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not load agent runs',
        ),
      );
  }, [api, slug]);

  return (
    <>
      <Link
        href="/agents"
        prefetch={false}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to agents
      </Link>
      {error ? (
        <PageState error message={error} />
      ) : detail === null ? (
        <PageState message="Loading agent runs…" />
      ) : (
        <>
          <PageHeading
            title={detail.agent.name}
            description={detail.agent.description}
          />
          {!detail.runs.length ? (
            <PageState message="This agent has not run yet." />
          ) : (
            <div className="overflow-x-auto border bg-card">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead className="bg-muted/45 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    <th className="w-28 border-b px-4 py-3">Status</th>
                    <th className="w-36 border-b px-4 py-3 text-right">
                      Input tokens
                    </th>
                    <th className="w-36 border-b px-4 py-3 text-right">
                      Output tokens
                    </th>
                    <th className="w-44 border-b px-4 py-3">Started at</th>
                    <th className="w-44 border-b px-4 py-3">Completed at</th>
                    <th className="w-28 border-b px-4 py-3 text-right">
                      Duration
                    </th>
                    <th className="w-32 border-b px-4 py-3">Model</th>
                    <th className="w-24 border-b px-4 py-3 text-right">
                      Attempt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detail.runs.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/25">
                      <td className="px-4 py-4">
                        <Badge
                          className={
                            run.status === 'completed'
                              ? 'border-primary/40 text-primary'
                              : run.status === 'failed'
                                ? 'border-red-900 text-red-400'
                                : 'border-border text-muted-foreground'
                          }
                        >
                          {run.status}
                        </Badge>
                        {run.error && (
                          <p
                            className="mt-2 max-w-48 text-xs text-red-400"
                            title={run.error}
                          >
                            {run.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums">
                        {run.inputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums">
                        {run.outputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {formatDate(run.startedAt)}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {formatDate(run.completedAt)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums">
                        <Duration
                          milliseconds={durationMilliseconds(
                            run.startedAt,
                            run.completedAt,
                          )}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {run.model ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums">
                        {run.attempt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
