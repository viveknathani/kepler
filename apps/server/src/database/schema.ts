import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
};

export const users = pgTable('users', {
  id: text().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text().notNull(),
  ...timestamps,
});

export const profiles = pgTable(
  'profiles',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    preferences: jsonb().notNull().default({}),
    goals: jsonb().notNull().default([]),
    skills: jsonb().notNull().default({}),
    constraints: jsonb().notNull().default({}),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('profiles_user_id_idx').on(table.userId)],
);

export const profileObservations = pgTable(
  'profile_observations',
  {
    id: text().primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    kind: text().notNull(),
    subject: text().notNull(),
    value: jsonb().notNull(),
    confidence: real().notNull(),
    evidenceCount: integer('evidence_count').notNull().default(1),
    status: text().notNull().default('active'),
    ...timestamps,
  },
  (table) => [index('profile_observations_profile_idx').on(table.profileId)],
);

export const agentDefinitions = pgTable(
  'agent_definitions',
  {
    id: text().primaryKey(),
    slug: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    version: integer().notNull().default(1),
    systemPrompt: text('system_prompt').notNull(),
    config: jsonb().notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [unique('agent_definitions_slug_key').on(table.slug)],
);

export const agentDefinitionVersions = pgTable(
  'agent_definition_versions',
  {
    id: text().primaryKey(),
    agentDefinitionId: text('agent_definition_id')
      .notNull()
      .references(() => agentDefinitions.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    systemPrompt: text('system_prompt').notNull(),
    config: jsonb().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('agent_definition_versions_agent_version_key').on(
      table.agentDefinitionId,
      table.version,
    ),
  ],
);

export const workflows = pgTable(
  'workflows',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    description: text(),
    status: text().notNull().default('draft'),
    configuration: jsonb().notNull().default({}),
    ...timestamps,
  },
  (table) => [index('workflows_user_id_idx').on(table.userId)],
);

export const workflowSteps = pgTable(
  'workflow_steps',
  {
    id: text().primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    agentDefinitionId: text('agent_definition_id')
      .notNull()
      .references(() => agentDefinitions.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    position: integer().notNull(),
    configuration: jsonb().notNull().default({}),
    ...timestamps,
  },
  (table) => [index('workflow_steps_workflow_idx').on(table.workflowId)],
);

export const schedules = pgTable(
  'schedules',
  {
    id: text().primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    cronExpression: text('cron_expression').notNull(),
    timezone: text().notNull().default('UTC'),
    isActive: boolean('is_active').notNull().default(true),
    lastRunAt: timestamp('last_run_at', { withTimezone: true, mode: 'string' }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (table) => [index('schedules_workflow_idx').on(table.workflowId)],
);

export const workflowRuns = pgTable(
  'workflow_runs',
  {
    id: text().primaryKey(),
    workflowId: text('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id'),
    profileSnapshot: jsonb('profile_snapshot').notNull(),
    workflowSnapshot: jsonb('workflow_snapshot').notNull(),
    status: text().notNull().default('pending'),
    trigger: text().notNull().default('manual'),
    scheduledFor: timestamp('scheduled_for', {
      withTimezone: true,
      mode: 'string',
    }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    error: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('workflow_runs_user_created_idx').on(table.userId, table.createdAt),
    index('workflow_runs_status_idx').on(table.status),
  ],
);

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text().primaryKey(),
    workflowRunId: text('workflow_run_id')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    workflowStepId: text('workflow_step_id')
      .notNull()
      .references(() => workflowSteps.id, { onDelete: 'restrict' }),
    agentDefinitionVersionId: text('agent_definition_version_id').references(
      () => agentDefinitionVersions.id,
      { onDelete: 'restrict' },
    ),
    agentSlug: text('agent_slug').notNull(),
    status: text().notNull().default('pending'),
    attempt: integer().notNull().default(1),
    input: jsonb().notNull().default({}),
    output: jsonb().notNull().default({}),
    tokenUsage: jsonb('token_usage').notNull().default({}),
    model: text(),
    provider: text(),
    langfuseTraceId: text('langfuse_trace_id'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    error: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('agent_runs_workflow_run_idx').on(table.workflowRunId),
    unique('agent_runs_workflow_step_key').on(
      table.workflowRunId,
      table.workflowStepId,
    ),
  ],
);

export const findings = pgTable(
  'findings',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    canonicalUrl: text('canonical_url'),
    sourceType: text('source_type').notNull(),
    externalId: text('external_id'),
    title: text().notNull(),
    summary: text(),
    contentKind: text('content_kind').notNull(),
    rawData: jsonb('raw_data').notNull().default({}),
    metadata: jsonb().notNull().default({}),
    firstDiscoveredAt: timestamp('first_discovered_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow().notNull(),
    lastDiscoveredAt: timestamp('last_discovered_at', {
      withTimezone: true,
      mode: 'string',
    }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    index('findings_user_idx').on(table.userId),
    uniqueIndex('findings_user_url_key').on(table.userId, table.canonicalUrl),
  ],
);

export const workflowRunFindings = pgTable(
  'workflow_run_findings',
  {
    workflowRunId: text('workflow_run_id')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    discoveredByRunId: text('discovered_by_run_id').references(
      () => agentRuns.id,
      { onDelete: 'set null' },
    ),
    stage: text().notNull(),
    stageData: jsonb('stage_data').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('workflow_run_findings_key').on(
      table.workflowRunId,
      table.findingId,
    ),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workflowRunId: text('workflow_run_id')
      .notNull()
      .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    summary: text(),
    status: text().notNull().default('draft'),
    metadata: jsonb().notNull().default({}),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      mode: 'string',
    }),
    ...timestamps,
  },
  (table) => [unique('reports_workflow_run_key').on(table.workflowRunId)],
);

export const reportItems = pgTable(
  'report_items',
  {
    id: text().primaryKey(),
    reportId: text('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'restrict' }),
    position: integer().notNull(),
    headline: text().notNull(),
    summary: text().notNull(),
    reason: text().notNull(),
    nextSteps: jsonb('next_steps').notNull().default([]),
    scores: jsonb().notNull().default({}),
    metadata: jsonb().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('report_items_report_idx').on(table.reportId)],
);

export const feedback = pgTable(
  'feedback',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportItemId: text('report_item_id')
      .notNull()
      .references(() => reportItems.id, { onDelete: 'cascade' }),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    action: text().notNull(),
    reasonCodes: jsonb('reason_codes').notNull().default([]),
    comment: text(),
    ...timestamps,
  },
  (table) => [
    unique('feedback_user_report_item_key').on(table.userId, table.reportItemId),
  ],
);
