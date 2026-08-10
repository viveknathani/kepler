import './instrumentation';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import config from './config';
import { dashboard } from './queues/dashboard';
import { router } from './routes';
import { createLogger } from './utils';

const log = createLogger('http');
const app = new Hono();
app.use('*', cors());
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  log.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start });
});
app.route('/', router);
app.route('/', dashboard);

export default { port: config.PORT, fetch: app.fetch };
