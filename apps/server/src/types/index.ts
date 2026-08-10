import type { InferSelectModel } from 'drizzle-orm';
import type * as schema from '../database/schema';

export type User = InferSelectModel<typeof schema.users>;
export type AppEnv = { Variables: { user: User } };

export enum QueueName {
  WorkflowRun = 'WORKFLOW_RUN',
  WorkflowSchedule = 'WORKFLOW_SCHEDULE',
  ProfileLearning = 'PROFILE_LEARNING',
  Maintenance = 'MAINTENANCE',
}

export type WorkflowJobData = { workflowRunId: string };
export type WorkflowScheduleJobData = { scheduleId: string };
