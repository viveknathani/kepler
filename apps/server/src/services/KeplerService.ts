import { and, asc, desc, eq } from 'drizzle-orm';
import { newId } from '../database';
import { GitHubScanner } from '../agents/definitions/githubScanner';
import { PaperScanner } from '../agents/definitions/paperScanner';
import {
  agentDefinitions,
  agentRuns,
  feedback,
  findings,
  profiles,
  reportItems,
  reports,
  schedules,
  workflowRunFindings,
  workflowRuns,
  workflows,
  workflowSteps,
} from '../database/schema';
import type { AppState } from '../state';

const agents = [
  [
    'github-scanner',
    'Search GitHub for relevant repositories, issues, and pull requests.',
  ],
  [
    'paper-scanner',
    'Discover worthwhile research papers, technical blogs, and engineering resources.',
  ],
  ['analyst', 'Normalize and analyze candidate findings.'],
  ['judge', 'Validate quality, credibility, and feasibility.'],
  ['curator', 'Rank findings against the supplied user profile.'],
  ['reporter', 'Explain selected findings and recommend next actions.'],
] as const;

export class KeplerService {
  constructor(private readonly state: AppState) {}

  async bootstrap(userId: string) {
    let [profile] = await this.state.database
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      [profile] = await this.state.database
        .insert(profiles)
        .values({
          id: newId('profile'),
          userId,
          name: 'Systems engineering',
          description:
            'A starter profile. Edit it to teach Kepler what deserves your attention.',
          preferences: { interests: ['systems engineering'], dislikes: [] },
          goals: [{ description: 'Learn deeply and find worthwhile projects' }],
          skills: {},
          constraints: { availableHoursPerWeek: 5 },
          isDefault: true,
        })
        .returning();
    }

    const definitions = [];
    for (const [slug, description] of agents) {
      const [definition] = await this.state.database
        .insert(agentDefinitions)
        .values({
          id: newId('agent'),
          slug,
          name: slug,
          description,
          systemPrompt: description,
        })
        .onConflictDoUpdate({
          target: agentDefinitions.slug,
          set: { description, updatedAt: new Date().toISOString() },
        })
        .returning();
      definitions.push(definition!);
    }

    let [workflow] = await this.state.database
      .select()
      .from(workflows)
      .where(eq(workflows.userId, userId))
      .limit(1);

    if (!workflow) {
      [workflow] = await this.state.database
        .insert(workflows)
        .values({
          id: newId('workflow'),
          userId,
          profileId: profile!.id,
          name: 'Research radar',
          description: 'Find things worth reading and building.',
          status: 'active',
          configuration: {
            reportSize: 6,
            contentMix: { read: 0.5, build: 0.5 },
          },
        })
        .returning();

      await this.state.database.insert(workflowSteps).values(
        definitions.map((definition, index) => ({
          id: newId('step'),
          workflowId: workflow!.id,
          agentDefinitionId: definition.id,
          name: definition.slug,
          position: index < 2 ? 10 : index * 10,
        })),
      );
    }

    return { profile, workflow };
  }

  listProfiles(userId: string) {
    return this.state.database
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
  }

  async updateProfile(
    userId: string,
    profileId: string,
    changes: {
      name: string;
      description?: string;
      preferences: unknown;
      goals: unknown;
      skills: unknown;
      constraints: unknown;
    },
  ) {
    const [profile] = await this.state.database
      .update(profiles)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
      .returning();
    if (!profile) throw new Error('profile not found');
    return profile;
  }

  listWorkflows(userId: string) {
    return this.state.database
      .select()
      .from(workflows)
      .where(eq(workflows.userId, userId));
  }

  async updateWorkflow(
    userId: string,
    workflowId: string,
    changes: {
      name: string;
      description?: string;
      status: 'draft' | 'active' | 'paused' | 'archived';
      configuration: unknown;
    },
  ) {
    const [workflow] = await this.state.database
      .update(workflows)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .returning();
    if (!workflow) throw new Error('workflow not found');
    return workflow;
  }

  async listSchedules(userId: string) {
    return this.state.database
      .select({ schedule: schedules, workflowName: workflows.name })
      .from(schedules)
      .innerJoin(workflows, eq(schedules.workflowId, workflows.id))
      .where(eq(workflows.userId, userId))
      .orderBy(asc(schedules.createdAt));
  }

  async getSchedule(scheduleId: string) {
    const [schedule] = await this.state.database
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);
    return schedule;
  }

  async createRunForSchedule(scheduleId: string) {
    const [row] = await this.state.database
      .select({ schedule: schedules, workflow: workflows })
      .from(schedules)
      .innerJoin(workflows, eq(schedules.workflowId, workflows.id))
      .where(eq(schedules.id, scheduleId))
      .limit(1);
    if (!row?.schedule.isActive || row.workflow.status !== 'active') {
      throw new Error('schedule or workflow is inactive');
    }
    const run = await this.createRun(
      row.workflow.userId,
      row.workflow.id,
      'scheduled',
    );
    await this.state.database
      .update(schedules)
      .set({ lastRunAt: new Date().toISOString() })
      .where(eq(schedules.id, scheduleId));
    return run;
  }

  async createSchedule(
    userId: string,
    workflowId: string,
    input: { cronExpression: string; timezone: string; isActive: boolean },
  ) {
    const [workflow] = await this.state.database
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .limit(1);
    if (!workflow) throw new Error('workflow not found');
    const [schedule] = await this.state.database
      .insert(schedules)
      .values({ id: newId('schedule'), workflowId, ...input })
      .returning();
    return schedule!;
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    input: { cronExpression: string; timezone: string; isActive: boolean },
  ) {
    const [owned] = await this.state.database
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(workflows, eq(schedules.workflowId, workflows.id))
      .where(and(eq(schedules.id, scheduleId), eq(workflows.userId, userId)))
      .limit(1);
    if (!owned) throw new Error('schedule not found');
    const [schedule] = await this.state.database
      .update(schedules)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(schedules.id, scheduleId))
      .returning();
    return schedule!;
  }

  async deleteSchedule(userId: string, scheduleId: string) {
    const [owned] = await this.state.database
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(workflows, eq(schedules.workflowId, workflows.id))
      .where(and(eq(schedules.id, scheduleId), eq(workflows.userId, userId)))
      .limit(1);
    if (!owned) throw new Error('schedule not found');
    await this.state.database
      .delete(schedules)
      .where(eq(schedules.id, scheduleId));
  }

  async createRun(userId: string, workflowId: string, trigger = 'manual') {
    const [workflow] = await this.state.database
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
      .limit(1);
    if (!workflow) throw new Error('workflow not found');
    const [profile] = await this.state.database
      .select()
      .from(profiles)
      .where(eq(profiles.id, workflow.profileId))
      .limit(1);
    const [run] = await this.state.database
      .insert(workflowRuns)
      .values({
        id: newId('wrun'),
        workflowId,
        userId,
        profileSnapshot: profile ?? {},
        workflowSnapshot: workflow,
        trigger,
      })
      .returning();
    if (!run) throw new Error('failed to create workflow run');
    return run;
  }

  async setRunJobId(runId: string, jobId: string) {
    await this.state.database
      .update(workflowRuns)
      .set({ jobId })
      .where(eq(workflowRuns.id, runId));
  }

  listRuns(userId: string) {
    return this.state.database
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.userId, userId))
      .orderBy(desc(workflowRuns.createdAt));
  }

  async listReports(userId: string) {
    return this.state.database
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async getReport(userId: string, reportId: string) {
    const [report] = await this.state.database
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
      .limit(1);
    if (!report) throw new Error('report not found');
    const items = await this.state.database
      .select({ item: reportItems, finding: findings })
      .from(reportItems)
      .innerJoin(findings, eq(reportItems.findingId, findings.id))
      .where(eq(reportItems.reportId, report.id))
      .orderBy(asc(reportItems.position));
    return { ...report, items };
  }

  async saveFeedback(userId: string, reportItemId: string, action: string) {
    const [item] = await this.state.database
      .select({ item: reportItems, report: reports })
      .from(reportItems)
      .innerJoin(reports, eq(reportItems.reportId, reports.id))
      .where(and(eq(reportItems.id, reportItemId), eq(reports.userId, userId)))
      .limit(1);
    if (!item) throw new Error('report item not found');
    const [saved] = await this.state.database
      .insert(feedback)
      .values({
        id: newId('feedback'),
        userId,
        reportItemId,
        findingId: item.item.findingId,
        action,
      })
      .onConflictDoUpdate({
        target: [feedback.userId, feedback.reportItemId],
        set: { action, updatedAt: new Date().toISOString() },
      })
      .returning();
    return saved;
  }

  private async persistRunFinding(
    run: { id: string; userId: string },
    agentRunId: string,
    candidate: {
      canonicalUrl: string;
      externalId?: string;
      sourceType: string;
      contentKind: string;
      title: string;
      summary: string;
      rawData?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      score?: number;
    },
  ) {
    const [finding] = await this.state.database
      .insert(findings)
      .values({
        id: newId('finding'),
        userId: run.userId,
        canonicalUrl: candidate.canonicalUrl,
        externalId: candidate.externalId,
        sourceType: candidate.sourceType,
        contentKind: candidate.contentKind,
        title: candidate.title,
        summary: candidate.summary,
        rawData: candidate.rawData ?? {},
        metadata: candidate.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [findings.userId, findings.canonicalUrl],
        set: {
          title: candidate.title,
          summary: candidate.summary,
          rawData: candidate.rawData ?? {},
          metadata: candidate.metadata ?? {},
          lastDiscoveredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    await this.state.database
      .insert(workflowRunFindings)
      .values({
        workflowRunId: run.id,
        findingId: finding!.id,
        discoveredByRunId: agentRunId,
        stage: 'discovered',
        stageData: { scannerScore: candidate.score ?? null },
      })
      .onConflictDoNothing();
    return finding!;
  }

  async executeMockWorkflow(workflowRunId: string) {
    const [run] = await this.state.database
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, workflowRunId))
      .limit(1);
    if (!run) throw new Error('workflow run not found');

    await this.state.database
      .update(workflowRuns)
      .set({
        status: 'running',
        startedAt: new Date().toISOString(),
        error: null,
      })
      .where(eq(workflowRuns.id, run.id));

    const steps = await this.state.database
      .select({ step: workflowSteps, definition: agentDefinitions })
      .from(workflowSteps)
      .innerJoin(
        agentDefinitions,
        eq(workflowSteps.agentDefinitionId, agentDefinitions.id),
      )
      .where(eq(workflowSteps.workflowId, run.workflowId))
      .orderBy(asc(workflowSteps.position));

    for (const { step, definition } of steps) {
      const [existing] = await this.state.database
        .select()
        .from(agentRuns)
        .where(
          and(
            eq(agentRuns.workflowRunId, run.id),
            eq(agentRuns.workflowStepId, step.id),
          ),
        )
        .limit(1);
      if (existing?.status === 'completed') continue;
      const agentRunId = existing?.id ?? newId('arun');
      if (!existing) {
        await this.state.database.insert(agentRuns).values({
          id: agentRunId,
          workflowRunId: run.id,
          workflowStepId: step.id,
          agentSlug: definition.slug,
          status: 'running',
          input: { profile: run.profileSnapshot },
          langfuseTraceId: agentRunId,
          startedAt: new Date().toISOString(),
        });
      } else {
        await this.state.database
          .update(agentRuns)
          .set({
            status: 'running',
            attempt: existing.attempt + 1,
            startedAt: new Date().toISOString(),
          })
          .where(eq(agentRuns.id, agentRunId));
      }
      let output: Record<string, unknown>;
      if (definition.slug === 'github-scanner') {
        const result = await new GitHubScanner().scan(
          run.profileSnapshot as Parameters<GitHubScanner['scan']>[0],
          12,
        );
        for (const candidate of result.findings) {
          await this.persistRunFinding(run, agentRunId, candidate);
        }
        output = {
          summary: `Discovered ${result.findings.length} GitHub candidates.`,
          queries: result.queries,
          findingCount: result.findings.length,
          rateLimit: result.rateLimit,
        };
      } else if (definition.slug === 'paper-scanner') {
        const result = await new PaperScanner().scan(
          run.profileSnapshot as Parameters<PaperScanner['scan']>[0],
          12,
        );
        for (const candidate of result.findings) {
          await this.persistRunFinding(run, agentRunId, candidate);
        }
        output = {
          summary: `Discovered ${result.findings.length} arXiv papers.`,
          queries: result.queries,
          findingCount: result.findings.length,
          provider: 'arxiv',
        };
      } else {
        await Bun.sleep(120);
        output = { summary: `${definition.name} completed its mock pass.` };
      }
      await this.state.database
        .update(agentRuns)
        .set({
          status: 'completed',
          output,
          tokenUsage: { inputTokens: 0, outputTokens: 0 },
          completedAt: new Date().toISOString(),
        })
        .where(eq(agentRuns.id, agentRunId));
    }

    const savedFindings = await this.state.database
      .select({ finding: findings, stageData: workflowRunFindings.stageData })
      .from(workflowRunFindings)
      .innerJoin(findings, eq(workflowRunFindings.findingId, findings.id))
      .where(eq(workflowRunFindings.workflowRunId, run.id));

    const [report] = await this.state.database
      .insert(reports)
      .values({
        id: newId('report'),
        userId: run.userId,
        workflowRunId: run.id,
        title: 'Research radar',
        summary: 'All findings discovered during this run.',
        status: 'published',
        publishedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: reports.workflowRunId,
        set: { updatedAt: new Date().toISOString() },
      })
      .returning();

    const existingItems = await this.state.database
      .select()
      .from(reportItems)
      .where(eq(reportItems.reportId, report!.id));
    if (!existingItems.length) {
      await this.state.database.insert(reportItems).values(
        savedFindings.map(({ finding, stageData }, index) => ({
          id: newId('ritem'),
          reportId: report!.id,
          findingId: finding.id,
          position: index + 1,
          headline: finding.title,
          summary: finding.summary ?? '',
          reason: finding.sourceType.startsWith('github_')
            ? 'Fresh GitHub activity matching the explicit profile interests.'
            : 'A potentially useful reading direction matching the profile.',
          nextSteps:
            finding.contentKind === 'build'
              ? [
                  'Read the issue discussion',
                  'Inspect the surrounding code path',
                ]
              : ['Open the source', 'Decide whether it merits a deeper pass'],
          scores: {
            interest: Math.max(0.5, 0.92 - index * 0.04),
            readiness: finding.contentKind === 'build' ? 0.7 : 0.8,
            quality:
              (stageData as { scannerScore?: number } | null)?.scannerScore ??
              0.7,
          },
        })),
      );
    }

    await this.state.database
      .update(workflowRuns)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      .where(eq(workflowRuns.id, run.id));
  }
}
