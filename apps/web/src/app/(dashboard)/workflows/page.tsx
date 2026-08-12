'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { Schedule, ScheduleRow, Workflow } from '@/lib/kepler-types';

const field =
  'h-9 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:border-primary';
const textarea =
  'min-h-24 w-full rounded-sm border bg-background p-3 text-xs outline-none focus:border-primary';

export default function WorkflowsPage() {
  const api = useKeplerApi();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [workflowData, scheduleData] = await Promise.all([
        api<Workflow[]>('/api/v1/workflows'),
        api<ScheduleRow[]>('/api/v1/schedules'),
      ]);
      setWorkflows(workflowData);
      setSchedules(scheduleData);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load workflows',
      );
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(id: string) {
    setBusy(true);
    try {
      await api(`/api/v1/workflows/${id}/runs`, { method: 'POST' });
      router.push('/agents');
    } finally {
      setBusy(false);
    }
  }
  async function save(workflow: Workflow) {
    await api(`/api/v1/workflows/${workflow.id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
    await load();
  }
  async function saveSchedule(
    workflowId: string,
    schedule: Omit<Schedule, 'id' | 'workflowId'> & { id?: string },
  ) {
    await api(
      schedule.id
        ? `/api/v1/schedules/${schedule.id}`
        : `/api/v1/workflows/${workflowId}/schedules`,
      { method: schedule.id ? 'PUT' : 'POST', body: JSON.stringify(schedule) },
    );
    await load();
  }
  async function deleteSchedule(id: string) {
    await api(`/api/v1/schedules/${id}`, { method: 'DELETE' });
    await load();
  }
  return (
    <>
      <PageHeading
        title="Workflows"
        description="Workflow is understanding your job, understanding your tools, and then not thinking about it any more."
      />
      {error ? (
        <PageState error message={error} />
      ) : workflows === null ? (
        <PageState message="Loading workflows…" />
      ) : (
        <div className="grid gap-5">
          {workflows.map((workflow) => (
            <WorkflowEditor
              key={workflow.id}
              workflow={workflow}
              schedules={schedules
                .filter((row) => row.schedule.workflowId === workflow.id)
                .map((row) => row.schedule)}
              busy={busy}
              onRun={run}
              onSave={save}
              onSaveSchedule={saveSchedule}
              onDeleteSchedule={deleteSchedule}
            />
          ))}
        </div>
      )}
    </>
  );
}

function WorkflowEditor({
  workflow,
  schedules,
  busy,
  onRun,
  onSave,
  onSaveSchedule,
  onDeleteSchedule,
}: {
  workflow: Workflow;
  schedules: Schedule[];
  busy: boolean;
  onRun: (id: string) => Promise<void>;
  onSave: (workflow: Workflow) => Promise<void>;
  onSaveSchedule: (
    workflowId: string,
    schedule: Omit<Schedule, 'id' | 'workflowId'> & { id?: string },
  ) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(workflow);
  const [config, setConfig] = useState(
    JSON.stringify(workflow.configuration, null, 2),
  );
  const [cron, setCron] = useState('0 9 * * 1');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [message, setMessage] = useState('');
  async function save() {
    try {
      await onSave({ ...draft, configuration: JSON.parse(config) });
      setMessage('Saved');
    } catch {
      setMessage('Configuration must be valid JSON');
    }
  }
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CardTitle>{workflow.name}</CardTitle>
            <Badge className="border-primary/40 text-primary">
              {workflow.status}
            </Badge>
          </div>
          <CardDescription>{workflow.description}</CardDescription>
        </div>
        <Button
          disabled={busy || workflow.status !== 'active'}
          onClick={() => void onRun(workflow.id)}
        >
          <Play size={15} />
          Run now
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Name
            <input
              className={`${field} mt-2`}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Status
            <select
              className={`${field} mt-2`}
              value={draft.status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status: event.target.value as Workflow['status'],
                })
              }
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground md:col-span-2">
            Description
            <input
              className={`${field} mt-2`}
              value={draft.description ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </label>
          <label className="text-xs text-muted-foreground md:col-span-2">
            Configuration JSON
            <textarea
              className={`${textarea} mt-2`}
              value={config}
              onChange={(event) => setConfig(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={() => void save()}>
            Save workflow
          </Button>
          <span className="text-xs text-muted-foreground">{message}</span>
        </div>
        <div className="mt-7 border-t pt-5">
          <h3 className="text-sm font-medium">Schedules</h3>
          <div className="mt-3 grid gap-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex flex-wrap items-center gap-3 border bg-background/40 p-3"
              >
                <code className="text-xs">{schedule.cronExpression}</code>
                <span className="text-xs text-muted-foreground">
                  {schedule.timezone}
                </span>
                <Badge>{schedule.isActive ? 'active' : 'paused'}</Badge>
                <div className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void onSaveSchedule(workflow.id, {
                        id: schedule.id,
                        cronExpression: schedule.cronExpression,
                        timezone: schedule.timezone,
                        isActive: !schedule.isActive,
                      })
                    }
                  >
                    {schedule.isActive ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void onDeleteSchedule(schedule.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={field}
              aria-label="Cron expression"
              value={cron}
              onChange={(event) => setCron(event.target.value)}
            />
            <input
              className={field}
              aria-label="Timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() =>
                void onSaveSchedule(workflow.id, {
                  cronExpression: cron,
                  timezone,
                  isActive: true,
                })
              }
            >
              Add schedule
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Five-field cron expression. Monday at 9:00: <code>0 9 * * 1</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
