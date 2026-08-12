'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { AgentSummary } from '@/lib/kepler-types';

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return null;
  if (milliseconds < 1_000) return [milliseconds.toString(), 'ms'] as const;
  if (milliseconds < 60_000)
    return [(milliseconds / 1_000).toFixed(1), 's'] as const;
  return [(milliseconds / 60_000).toFixed(1), 'min'] as const;
}

function Duration({ milliseconds }: { milliseconds: number | null }) {
  const duration = formatDuration(milliseconds);
  if (!duration) return <>—</>;
  return (
    <>
      <span className="font-medium text-foreground">{duration[0]}</span>{' '}
      <span className="text-[0.75em] text-muted-foreground">{duration[1]}</span>
    </>
  );
}

export default function AgentsPage() {
  const api = useKeplerApi();
  const router = useRouter();
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        await api('/api/v1/bootstrap', { method: 'POST' });
        setAgents(await api<AgentSummary[]>('/api/v1/agents'));
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Could not load agents',
        );
      }
    })();
  }, [api]);

  function openAgent(slug: string) {
    router.push(`/agents/${slug}`);
  }

  return (
    <>
      <PageHeading
        title="Agents"
        description="I'm sorry, Dave. I'm afraid I can't do that."
      />
      {error ? (
        <PageState error message={error} />
      ) : agents === null ? (
        <PageState message="Loading agents…" />
      ) : !agents.length ? (
        <PageState message="No agents installed." />
      ) : (
        <div className="overflow-x-auto border bg-card">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-muted/45 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="w-52 border-b px-4 py-3">Name</th>
                <th className="border-b px-4 py-3">Description</th>
                <th className="w-44 border-b px-4 py-3 text-right">
                  Average duration
                </th>
                <th className="w-48 border-b px-4 py-3 text-right">
                  Average token usage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents.map((agent) => (
                <tr
                  key={agent.slug}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer transition hover:bg-muted/45 focus:bg-muted/45 focus:outline-none"
                  onClick={() => openAgent(agent.slug)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ')
                      openAgent(agent.slug);
                  }}
                >
                  <td className="px-4 py-4 text-sm font-medium">
                    {agent.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {agent.description}
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums">
                    <Duration milliseconds={agent.averageDurationMs} />
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums">
                    {agent.averageTokenUsage?.toLocaleString() ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
