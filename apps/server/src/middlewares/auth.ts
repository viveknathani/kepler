import { verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';
import config from '../config';
import { UserService } from '../services/UserService';
import { state } from '../state';
import type { AppEnv } from '../types';
import { createLogger, sendResponse } from '../utils';

const log = createLogger('auth');
const users = new UserService(state);

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  try {
    const header = c.req.header('authorization');
    if (!header && config.ENVIRONMENT === 'dev' && config.BY_PASS_AUTH_CLERK_USER_ID) {
      c.set('user', await users.findOrCreateByClerkId(config.BY_PASS_AUTH_CLERK_USER_ID, 'dev@kepler.local'));
      return next();
    }
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !config.CLERK_SECRET_KEY) {
      return sendResponse(c, 401, { status: 'error', message: 'unauthorized' });
    }
    const payload = await verifyToken(token, { secretKey: config.CLERK_SECRET_KEY });
    c.set('user', await users.findOrCreateByClerkId(payload.sub));
    return next();
  } catch (error) {
    log.error({ error }, 'authentication failed');
    return sendResponse(c, 401, { status: 'error', message: 'unauthorized' });
  }
}
