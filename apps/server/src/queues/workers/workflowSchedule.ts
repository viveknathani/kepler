import { KeplerService } from '../../services/KeplerService';
import { state } from '../../state';
import { QueueName } from '../../types';
import type { WorkflowScheduleJobData } from '../../types';
import { createQueue, createWorker } from '../factory';
import { addToWorkflowRunQueue } from './workflowRun';

const service = new KeplerService(state);
const name = QueueName.WorkflowSchedule;
export const queue = createQueue(name);

export const worker = createWorker(name, async (job) => {
  const { scheduleId } = job.data as WorkflowScheduleJobData;
  const schedule = await service.getSchedule(scheduleId);
  if (!schedule?.isActive) return;
  const run = await service.createRunForSchedule(scheduleId);
  const queued = await addToWorkflowRunQueue({ workflowRunId: run.id });
  if (queued.id) await service.setRunJobId(run.id, String(queued.id));
});

export async function syncSchedule(schedule: {
  id: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
}) {
  if (!schedule.isActive) {
    await queue.removeJobScheduler(schedule.id);
    return;
  }
  await queue.upsertJobScheduler(
    schedule.id,
    { pattern: schedule.cronExpression, tz: schedule.timezone },
    { name, data: { scheduleId: schedule.id } },
  );
}

export async function removeSchedule(scheduleId: string) {
  await queue.removeJobScheduler(scheduleId);
}
