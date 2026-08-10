import pino from 'pino';
import type { Context } from 'hono';
import config from '../config';

const rootLogger = pino({
  level: config.LOG_LEVEL,
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const createLogger = (module: string) => rootLogger.child({ module });

export function sendResponse(
  c: Context,
  statusCode: 200 | 201 | 400 | 401 | 404 | 409 | 500,
  response: {
    status: 'success' | 'error';
    data?: unknown;
    message?: string;
  },
) {
  return c.json(response, statusCode);
}
