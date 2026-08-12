'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { ReportSummary } from '@/lib/kepler-types';

export default function ReportsPage() {
  const api = useKeplerApi();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        await api('/api/v1/bootstrap', { method: 'POST' });
        setReports(await api('/api/v1/reports'));
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Could not load reports',
        );
      }
    })();
  }, [api]);

  return (
    <>
      <PageHeading
        title="Reports"
        description="Sir, I’ve compiled a comprehensive report on the anomaly, but your vitals suggest you aren't listening."
      />
      {error ? (
        <PageState error message={error} />
      ) : reports === null ? (
        <PageState message="Loading reports…" />
      ) : !reports.length ? (
        <PageState message="No reports yet. Run a workflow to generate one." />
      ) : (
        <div className="overflow-x-auto border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-muted/45 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="border-b px-4 py-3">Report</th>
                <th className="w-48 border-b px-4 py-3">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id} className="transition hover:bg-muted/45">
                  <td className="px-4 py-4">
                    <Link
                      href={`/reports/${report.id}`}
                      prefetch={false}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {report.title}
                    </Link>
                    <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                      {report.summary ?? 'No summary'}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {report.publishedAt
                      ? new Date(report.publishedAt).toLocaleString()
                      : 'Not published'}
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
