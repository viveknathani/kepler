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
  useEffect(() => {
    void api<ReportDetail>(`/api/v1/reports/${id}`)
      .then(setReport)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not load report',
        ),
      );
  }, [api, id]);
  async function react(itemId: string, action: string) {
    await api(`/api/v1/report-items/${itemId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  if (error) return <PageState error message={error} />;
  if (!report) return <PageState message="Loading report…" />;
  return (
    <>
      <Link
        href="/reports"
        prefetch={false}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} />
        All reports
      </Link>
      <div className="mb-5 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{report.title}</h1>
          <Badge className="border-primary/40 text-primary">
            {report.status}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{report.summary}</p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {report.items.length} findings
        </p>
      </div>
      <div className="overflow-x-auto border bg-card">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-muted/45 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="w-12 border-b px-3 py-3">#</th>
              <th className="w-24 border-b px-3 py-3">Class</th>
              <th className="border-b px-3 py-3">Finding</th>
              <th className="w-40 border-b px-3 py-3">Source</th>
              <th className="w-32 border-b px-3 py-3">Signals</th>
              <th className="w-20 border-b px-3 py-3 text-right">Match</th>
              <th className="w-52 border-b px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.items.map(({ item, finding, stageData }, index) => {
              const analysis = stageData?.analysis;
              const lesson = item.metadata?.report;
              const judgment = item.metadata?.judgment;
              const selection = item.metadata?.selection;
              return (
                <tr key={item.id} className="group align-top hover:bg-muted/40">
                  <td className="px-3 py-3 text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      className={
                        finding.contentKind === 'build'
                          ? 'border-primary/40 text-primary'
                          : 'border-border text-muted-foreground'
                      }
                    >
                      {finding.contentKind}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <details>
                      <summary className="cursor-pointer list-none text-xs font-semibold group-hover:text-primary">
                        {item.headline}
                      </summary>
                      <div className="mt-2 max-w-2xl border-l border-primary/50 pl-3">
                        <p className="text-xs leading-5 text-muted-foreground">
                          {item.summary}
                        </p>
                        {lesson && (
                          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                            <ReportSection title="Systems principle">
                              {lesson.systemsPrinciple}
                            </ReportSection>
                            <ReportSection title="How it works">
                              {lesson.mechanism}
                            </ReportSection>
                            <AnalysisList
                              title="Trade-offs & failure modes"
                              items={lesson.tradeOffsAndFailureModes}
                            />
                            <ReportSection title="Engineering challenge">
                              {lesson.engineeringChallenge}
                            </ReportSection>
                            <ReportSection title="Prior knowledge">
                              {lesson.priorKnowledgeConnection}
                            </ReportSection>
                            <ReportSection title="Reflection question">
                              {lesson.reflectionQuestion}
                            </ReportSection>
                            <div className="sm:col-span-2 border border-primary/20 bg-primary/5 p-3">
                              <AnalysisHeading>
                                {lesson.activity.type} activity
                              </AnalysisHeading>
                              <p className="mt-1 leading-5 text-muted-foreground">
                                {lesson.activity.instruction}
                              </p>
                              <p className="mt-2 leading-5 text-foreground/80">
                                Done when: {lesson.activity.successCriterion}
                              </p>
                            </div>
                          </div>
                        )}
                        {analysis ? (
                          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                            <AnalysisList
                              title="Technical insights"
                              items={analysis.technicalInsights}
                            />
                            <AnalysisList
                              title="Trade-offs"
                              items={analysis.tradeOffs}
                            />
                            <div className="sm:col-span-2">
                              <AnalysisHeading>
                                Practical relevance
                              </AnalysisHeading>
                              <p className="mt-1 leading-5 text-muted-foreground">
                                {analysis.practicalRelevance}
                              </p>
                            </div>
                            <AnalysisList
                              title="Evidence"
                              items={analysis.evidence}
                            />
                            <AnalysisList
                              title="Limitations"
                              items={analysis.limitations}
                            />
                          </div>
                        ) : (
                          <p className="mt-3 text-[11px] text-muted-foreground">
                            Analysis unavailable for this finding.
                          </p>
                        )}
                        <p className="mt-4 text-[10px] uppercase tracking-wide text-foreground/70">
                          Assessment / {item.reason}
                        </p>
                        {item.nextSteps?.length > 0 && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Next: {item.nextSteps.join(' · ')}
                          </p>
                        )}
                      </div>
                    </details>
                  </td>
                  <td className="px-3 py-3 text-[10px] uppercase text-muted-foreground">
                    {finding.sourceType.replaceAll('_', ' ')}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-muted-foreground">
                    Q {Math.round((item.scores.quality ?? 0) * 100)} / R{' '}
                    {Math.round((item.scores.readiness ?? 0) * 100)}
                    {selection && (
                      <span className="mt-1 block">
                        {selection.lane} · {selection.estimatedMinutes}m
                      </span>
                    )}
                    {judgment && (
                      <span className="mt-1 block">
                        {judgment.difficulty} ·{' '}
                        {Math.round(judgment.confidence * 100)}% conf.
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-semibold text-primary">
                    {Math.round((item.scores.interest ?? 0) * 100)}%
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Like"
                        onClick={() => void react(item.id, 'like')}
                      >
                        <ThumbsUp size={13} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Dislike"
                        onClick={() => void react(item.id, 'dislike')}
                      >
                        <ThumbsDown size={13} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Save"
                        onClick={() => void react(item.id, 'save')}
                      >
                        <Heart size={13} />
                      </Button>
                      {finding.canonicalUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={finding.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AnalysisHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
      {children}
    </h3>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <AnalysisHeading>{title}</AnalysisHeading>
      <ul className="mt-1 space-y-1 text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 leading-5">
            <span className="text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <AnalysisHeading>{title}</AnalysisHeading>
      <p className="mt-1 leading-5 text-muted-foreground">{children}</p>
    </div>
  );
}
