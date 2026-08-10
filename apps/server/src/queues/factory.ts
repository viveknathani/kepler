import { Queue, Worker } from 'bullmq';
import type { Processor, WorkerOptions } from 'bullmq';
import config from '../config';
import { createLogger } from '../utils';

const log = createLogger('queues');
const redisUrl = new URL(config.REDIS_URL);
export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname.length > 1 ? Number(redisUrl.pathname.slice(1)) : 0,
  maxRetriesPerRequest: null,
};

export const createQueue = (name: string) => new Queue(name, { connection: redisConnection });

export const createWorker = (
  name: string,
  processor: Processor,
  options: Partial<WorkerOptions> = {},
) => {
  const worker = new Worker(name, processor, { connection: redisConnection, ...options });
  worker.on('completed', (job) => log.info({ queue: name, jobId: job.id }, 'job completed'));
  worker.on('failed', (job, error) =>
    log.error({ queue: name, jobId: job?.id, error: error.message }, 'job failed'),
  );
  return worker;
};
