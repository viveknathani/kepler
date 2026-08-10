import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import { serveStatic } from 'hono/bun';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import config from '../config';
import { queue as workflowRunQueue } from './workers/workflowRun';
import { queue as workflowScheduleQueue } from './workers/workflowSchedule';

const basePath = '/admin/queues';
const adapter = new HonoAdapter(serveStatic);
adapter.setBasePath(basePath);
createBullBoard({
  queues: [new BullMQAdapter(workflowRunQueue), new BullMQAdapter(workflowScheduleQueue)],
  serverAdapter: adapter,
});

export const dashboard = new Hono();
dashboard.use(`${basePath}/*`, basicAuth({
  username: config.ADMIN_USERNAME,
  password: config.ADMIN_PASSWORD,
}));
dashboard.route(basePath, adapter.registerPlugin());
