'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { Run } from '@/lib/kepler-types';

export default function RunsPage() {
  const api = useKeplerApi(); const [runs, setRuns] = useState<Run[] | null>(null); const [error, setError] = useState('');
  useEffect(() => { void api<Run[]>('/api/v1/runs').then(setRuns).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load runs')); }, [api]);
  return <><PageHeading title="Runs" description="Execution history across workflows and agents." />{error ? <PageState error message={error} /> : runs === null ? <PageState message="Loading runs…" /> : !runs.length ? <PageState message="No runs yet." /> : <Card><CardContent className="pt-5"><div className="divide-y">{runs.map((run) => <div key={run.id} className="flex items-center justify-between py-4"><div><p className="text-sm">{run.id}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()} · {run.trigger}</p></div><Badge className={run.status === 'completed' ? 'border-primary/40 text-primary' : run.status === 'failed' ? 'border-red-900 text-red-400' : 'border-border text-muted-foreground'}>{run.status}</Badge></div>)}</div></CardContent></Card>}</>;
}
