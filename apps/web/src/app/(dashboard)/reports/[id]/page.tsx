'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { ReportDetail } from '@/lib/kepler-types';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const api = useKeplerApi();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void api<ReportDetail>(`/api/v1/reports/${id}`).then(setReport).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load report')); }, [api, id]);
  async function react(itemId: string, action: string) { await api(`/api/v1/report-items/${itemId}/feedback`, { method: 'POST', body: JSON.stringify({ action }) }); }

  if (error) return <PageState error message={error} />;
  if (!report) return <PageState message="Loading report…" />;
  return <><Link href="/reports" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft size={14} />All reports</Link>
    <div className="mb-5 border-b pb-4"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{report.title}</h1><Badge className="border-primary/40 text-primary">{report.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{report.summary}</p><p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{report.items.length} findings</p></div>
    <div className="overflow-x-auto border bg-card"><table className="w-full min-w-[980px] border-collapse text-left"><thead className="bg-muted/70 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="w-12 border-b px-3 py-3">#</th><th className="w-24 border-b px-3 py-3">Class</th><th className="border-b px-3 py-3">Finding</th><th className="w-40 border-b px-3 py-3">Source</th><th className="w-32 border-b px-3 py-3">Signals</th><th className="w-20 border-b px-3 py-3 text-right">Match</th><th className="w-52 border-b px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{report.items.map(({ item, finding }, index) => <tr key={item.id} className="group align-top hover:bg-muted/40"><td className="px-3 py-3 text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</td><td className="px-3 py-3"><Badge className={finding.contentKind === 'build' ? 'border-primary/40 text-primary' : 'border-border text-muted-foreground'}>{finding.contentKind}</Badge></td><td className="px-3 py-3"><details><summary className="cursor-pointer list-none text-xs font-semibold group-hover:text-primary">{item.headline}</summary><div className="mt-2 max-w-2xl border-l border-primary/50 pl-3"><p className="text-xs leading-5 text-muted-foreground">{item.summary}</p><p className="mt-2 text-[10px] uppercase tracking-wide text-foreground/70">Assessment / {item.reason}</p>{item.nextSteps?.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Next: {item.nextSteps.join(' · ')}</p>}</div></details></td><td className="px-3 py-3 text-[10px] uppercase text-muted-foreground">{finding.sourceType.replaceAll('_', ' ')}</td><td className="px-3 py-3 text-[10px] text-muted-foreground">Q {Math.round((item.scores.quality ?? 0) * 100)} / R {Math.round((item.scores.readiness ?? 0) * 100)}</td><td className="px-3 py-3 text-right text-xs font-semibold text-primary">{Math.round((item.scores.interest ?? 0) * 100)}%</td><td className="px-3 py-2"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Like" onClick={() => void react(item.id, 'like')}><ThumbsUp size={13} /></Button><Button size="icon" variant="ghost" title="Dislike" onClick={() => void react(item.id, 'dislike')}><ThumbsDown size={13} /></Button><Button size="icon" variant="ghost" title="Save" onClick={() => void react(item.id, 'save')}><Heart size={13} /></Button>{finding.canonicalUrl && <Button size="sm" variant="outline" asChild><a href={finding.canonicalUrl} target="_blank" rel="noreferrer">Open</a></Button>}</div></td></tr>)}</tbody></table></div>
  </>;
}
