import type { JobsOptions } from 'bullmq';
import { eq } from 'drizzle-orm';
import { workflowRuns } from '../../database/schema';
import { KeplerService } from '../../services/KeplerService';
import { state } from '../../state';
import { QueueName } from '../../types';
import type { WorkflowJobData } from '../../types';
import { createLogger } from '../../utils';
import { createQueue, createWorker } from '../factory';

const service = new KeplerService(state);
const name = QueueName.WorkflowRun;
const log = createLogger('worker:workflow-run');
export const queue = createQueue(name);

export const worker = createWorker(
  name,
  async (job) => {
    const { workflowRunId } = job.data as WorkflowJobData;
    const startedAt = Date.now();
    log.info(
      {
        workflowRunId,
        jobId: job.id,
        attempt: job.attemptsStarted,
        maxAttempts: job.opts.attempts,
      },
      'workflow job execution started',
    );
    try {
      await service.executeMockWorkflow(workflowRunId);
      log.info(
        { workflowRunId, jobId: job.id, durationMs: Date.now() - startedAt },
        'workflow job execution completed',
      );
    } catch (error) {
      log.error(
        {
          workflowRunId,
          jobId: job.id,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
        'workflow job execution failed',
      );
      await state.database
        .update(workflowRuns)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(workflowRuns.id, workflowRunId));
      throw error;
    }
  },
  { concurrency: 2, lockDuration: 15 * 60 * 1000 },
);

export const addToWorkflowRunQueue = (
  data: WorkflowJobData,
  options?: JobsOptions,
) =>
  queue.add(`${name}:${data.workflowRunId}`, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 7 * 24 * 60 * 60 },
    removeOnFail: { age: 30 * 24 * 60 * 60 },
    ...options,
  });
