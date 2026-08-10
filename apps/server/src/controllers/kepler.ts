import type { Context } from 'hono';
import { z } from 'zod';
import { addToWorkflowRunQueue } from '../queues/workers/workflowRun';
import { removeSchedule, syncSchedule } from '../queues/workers/workflowSchedule';
import { KeplerService } from '../services/KeplerService';
import { state } from '../state';
import type { AppEnv } from '../types';
import { sendResponse } from '../utils';

const service = new KeplerService(state);

export async function bootstrap(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.bootstrap(c.var.user.id) });
}

export async function getProfiles(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.listProfiles(c.var.user.id) });
}

const profileInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  preferences: z.record(z.string(), z.unknown()),
  goals: z.array(z.unknown()),
  skills: z.record(z.string(), z.unknown()),
  constraints: z.record(z.string(), z.unknown()),
});

export async function updateProfile(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) return sendResponse(c, 400, { status: 'error', message: 'profile id is required' });
  const parsed = profileInput.safeParse(await c.req.json());
  if (!parsed.success) return sendResponse(c, 400, { status: 'error', message: 'invalid profile' });
  try {
    return sendResponse(c, 200, {
      status: 'success',
      data: await service.updateProfile(c.var.user.id, id, parsed.data),
    });
  } catch {
    return sendResponse(c, 404, { status: 'error', message: 'profile not found' });
  }
}

export async function getWorkflows(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.listWorkflows(c.var.user.id) });
}

const workflowInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  configuration: z.record(z.string(), z.unknown()),
});

export async function updateWorkflow(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) return sendResponse(c, 400, { status: 'error', message: 'workflow id is required' });
  const parsed = workflowInput.safeParse(await c.req.json());
  if (!parsed.success) return sendResponse(c, 400, { status: 'error', message: 'invalid workflow' });
  try {
    return sendResponse(c, 200, {
      status: 'success',
      data: await service.updateWorkflow(c.var.user.id, id, parsed.data),
    });
  } catch {
    return sendResponse(c, 404, { status: 'error', message: 'workflow not found' });
  }
}

const scheduleInput = z.object({
  cronExpression: z.string().trim().regex(/^(\S+\s+){4}\S+$/, 'use a five-field cron expression'),
  timezone: z.string().trim().min(1),
  isActive: z.boolean(),
});

function validTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export async function getSchedules(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.listSchedules(c.var.user.id) });
}

export async function createSchedule(c: Context<AppEnv>) {
  const workflowId = c.req.param('id');
  if (!workflowId) return sendResponse(c, 400, { status: 'error', message: 'workflow id is required' });
  const parsed = scheduleInput.safeParse(await c.req.json());
  if (!parsed.success || !validTimezone(parsed.data.timezone)) {
    return sendResponse(c, 400, { status: 'error', message: 'invalid schedule' });
  }
  try {
    const schedule = await service.createSchedule(c.var.user.id, workflowId, parsed.data);
    await syncSchedule(schedule);
    return sendResponse(c, 201, { status: 'success', data: schedule });
  } catch (error) {
    return sendResponse(c, 400, { status: 'error', message: error instanceof Error ? error.message : 'invalid schedule' });
  }
}

export async function updateSchedule(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) return sendResponse(c, 400, { status: 'error', message: 'schedule id is required' });
  const parsed = scheduleInput.safeParse(await c.req.json());
  if (!parsed.success || !validTimezone(parsed.data.timezone)) {
    return sendResponse(c, 400, { status: 'error', message: 'invalid schedule' });
  }
  try {
    const schedule = await service.updateSchedule(c.var.user.id, id, parsed.data);
    await syncSchedule(schedule);
    return sendResponse(c, 200, { status: 'success', data: schedule });
  } catch (error) {
    return sendResponse(c, 400, { status: 'error', message: error instanceof Error ? error.message : 'invalid schedule' });
  }
}

export async function deleteSchedule(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) return sendResponse(c, 400, { status: 'error', message: 'schedule id is required' });
  try {
    await service.deleteSchedule(c.var.user.id, id);
    await removeSchedule(id);
    return sendResponse(c, 200, { status: 'success' });
  } catch {
    return sendResponse(c, 404, { status: 'error', message: 'schedule not found' });
  }
}

export async function startWorkflow(c: Context<AppEnv>) {
  const workflowId = c.req.param('id');
  if (!workflowId) return sendResponse(c, 400, { status: 'error', message: 'workflow id is required' });
  try {
    const run = await service.createRun(c.var.user.id, workflowId);
    const job = await addToWorkflowRunQueue({ workflowRunId: run.id });
    if (job.id) await service.setRunJobId(run.id, String(job.id));
    return sendResponse(c, 201, { status: 'success', data: run });
  } catch (error) {
    return sendResponse(c, 404, {
      status: 'error',
      message: error instanceof Error ? error.message : 'workflow not found',
    });
  }
}

export async function getRuns(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.listRuns(c.var.user.id) });
}

export async function getReports(c: Context<AppEnv>) {
  return sendResponse(c, 200, { status: 'success', data: await service.listReports(c.var.user.id) });
}

export async function getReport(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) return sendResponse(c, 400, { status: 'error', message: 'report id is required' });
  try {
    return sendResponse(c, 200, { status: 'success', data: await service.getReport(c.var.user.id, id) });
  } catch {
    return sendResponse(c, 404, { status: 'error', message: 'report not found' });
  }
}

export async function createFeedback(c: Context<AppEnv>) {
  const reportItemId = c.req.param('id');
  if (!reportItemId) return sendResponse(c, 400, { status: 'error', message: 'report item id is required' });
  const parsed = z.object({ action: z.enum(['like', 'dislike', 'save', 'dismiss', 'pursue', 'completed']) })
    .safeParse(await c.req.json());
  if (!parsed.success) return sendResponse(c, 400, { status: 'error', message: 'invalid feedback' });
  try {
    const data = await service.saveFeedback(c.var.user.id, reportItemId, parsed.data.action);
    return sendResponse(c, 201, { status: 'success', data });
  } catch (error) {
    return sendResponse(c, 404, { status: 'error', message: 'report item not found' });
  }
}
