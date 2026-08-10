import type { JobsOptions } from 'bullmq';
import { eq } from 'drizzle-orm';
import { workflowRuns } from '../../database/schema';
import { KeplerService } from '../../services/KeplerService';
import { state } from '../../state';
import { QueueName } from '../../types';
import type { WorkflowJobData } from '../../types';
import { createQueue, createWorker } from '../factory';

const service = new KeplerService(state);
const name = QueueName.WorkflowRun;
export const queue = createQueue(name);

export const worker = createWorker(
  name,
  async (job) => {
    const { workflowRunId } = job.data as WorkflowJobData;
    try {
      await service.executeMockWorkflow(workflowRunId);
    } catch (error) {
      await state.database
        .update(workflowRuns)
        .set({ status: 'failed', error: error instanceof Error ? error.message : String(error) })
        .where(eq(workflowRuns.id, workflowRunId));
      throw error;
    }
  },
  { concurrency: 2, lockDuration: 15 * 60 * 1000 },
);

export const addToWorkflowRunQueue = (data: WorkflowJobData, options?: JobsOptions) =>
  queue.add(`${name}:${data.workflowRunId}`, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 7 * 24 * 60 * 60 },
    removeOnFail: { age: 30 * 24 * 60 * 60 },
    ...options,
  });
