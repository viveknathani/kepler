import { and, asc, desc, eq } from 'drizzle-orm';
import { newId } from '../database';
import { Analyst } from '../agents/definitions/analyst';
import { Curator } from '../agents/definitions/curator';
import { GitHubScanner } from '../agents/definitions/githubScanner';
import { Judge } from '../agents/definitions/judge';
import { PaperScanner } from '../agents/definitions/paperScanner';
import { Reporter } from '../agents/definitions/reporter';
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
import { createLogger } from '../utils';

const log = createLogger('service:kepler-workflow');

const agents = [
  [
    'github-scanner',
    'Search GitHub for relevant repositories, issues, and pull requests.',
  ],
  [
    'paper-scanner',
    'Discover worthwhile research papers, technical blogs, and engineering resources.',
  ],
  [
    'analyst',
    'Extract technical insights, trade-offs, and practical relevance from findings.',
  ],
  [
    'judge',
    'Score evidence, learning value, novelty, relevance, and practicality.',
  ],
  [
    'curator',
    'Select a diverse learning queue under an explicit attention budget.',
  ],
  [
    'reporter',
    'Turn selected findings into durable systems-engineering lessons and exercises.',
  ],
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
          description:
            'Build systems-engineering judgment through evidence and practice.',
          status: 'active',
          configuration: {
            reportSize: 6,
            learningMinutes: 180,
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

  async listAgents(userId: string) {
    const definitions = await this.state.database
      .select()
      .from(agentDefinitions);
    const runs = await this.state.database
      .select({ run: agentRuns })
      .from(agentRuns)
      .innerJoin(workflowRuns, eq(agentRuns.workflowRunId, workflowRuns.id))
      .where(eq(workflowRuns.userId, userId));

    const agentOrder = new Map<string, number>(
      agents.map(([slug], index) => [slug, index]),
    );
    definitions.sort(
      (left, right) =>
        (agentOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
        (agentOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
    );

    return definitions.map((definition) => {
      const completedRuns = runs
        .map(({ run }) => run)
        .filter(
          (run) =>
            run.agentSlug === definition.slug &&
            run.startedAt !== null &&
            run.completedAt !== null,
        );
      const totals = completedRuns.reduce(
        (summary, run) => {
          const usage = run.tokenUsage as {
            inputTokens?: number;
            outputTokens?: number;
          };
          summary.durationMs +=
            new Date(run.completedAt!).getTime() -
            new Date(run.startedAt!).getTime();
          summary.tokens +=
            (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
          return summary;
        },
        { durationMs: 0, tokens: 0 },
      );

      return {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        averageDurationMs: completedRuns.length
          ? Math.round(totals.durationMs / completedRuns.length)
          : null,
        averageTokenUsage: completedRuns.length
          ? Math.round(totals.tokens / completedRuns.length)
          : null,
      };
    });
  }

  async getAgentRuns(userId: string, slug: string) {
    const [definition] = await this.state.database
      .select()
      .from(agentDefinitions)
      .where(eq(agentDefinitions.slug, slug))
      .limit(1);
    if (!definition) throw new Error('agent not found');

    const rows = await this.state.database
      .select({ run: agentRuns })
      .from(agentRuns)
      .innerJoin(workflowRuns, eq(agentRuns.workflowRunId, workflowRuns.id))
      .where(
        and(eq(workflowRuns.userId, userId), eq(agentRuns.agentSlug, slug)),
      )
      .orderBy(desc(agentRuns.createdAt));

    return {
      agent: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
      },
      runs: rows.map(({ run }) => {
        const usage = run.tokenUsage as {
          inputTokens?: number;
          outputTokens?: number;
        };
        return {
          id: run.id,
          workflowRunId: run.workflowRunId,
          status: run.status,
          attempt: run.attempt,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          model: run.model,
          provider: run.provider,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          error: run.error,
        };
      }),
    };
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
      .select({
        item: reportItems,
        finding: findings,
        stageData: workflowRunFindings.stageData,
      })
      .from(reportItems)
      .innerJoin(findings, eq(reportItems.findingId, findings.id))
      .leftJoin(
        workflowRunFindings,
        and(
          eq(workflowRunFindings.findingId, findings.id),
          eq(workflowRunFindings.workflowRunId, report.workflowRunId),
        ),
      )
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
    const workflowStartedAt = Date.now();
    log.info({ workflowRunId }, 'workflow execution started');
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
      if (existing?.status === 'completed') {
        log.info(
          {
            workflowRunId,
            agentSlug: definition.slug,
            agentRunId: existing.id,
          },
          'completed workflow step skipped',
        );
        continue;
      }
      const agentRunId = existing?.id ?? newId('arun');
      const stepStartedAt = Date.now();
      log.info(
        {
          workflowRunId,
          agentSlug: definition.slug,
          agentRunId,
          attempt: existing ? existing.attempt + 1 : 1,
        },
        'workflow step started',
      );
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
        log.info({ workflowRunId, agentRunId }, 'GitHub scan request started');
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
        log.info({ workflowRunId, agentRunId }, 'paper scan request started');
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
      } else if (definition.slug === 'analyst') {
        const discovered = await this.state.database
          .select({
            finding: findings,
            stageData: workflowRunFindings.stageData,
          })
          .from(workflowRunFindings)
          .innerJoin(findings, eq(workflowRunFindings.findingId, findings.id))
          .where(eq(workflowRunFindings.workflowRunId, run.id));
        const candidates = discovered
          .sort(
            (a, b) =>
              Number(this.stageObject(b.stageData).scannerScore ?? 0) -
              Number(this.stageObject(a.stageData).scannerScore ?? 0),
          )
          .slice(0, 10);
        log.info(
          { workflowRunId, agentRunId, findingCount: candidates.length },
          'analyst batch dispatch started',
        );
        const result = await new Analyst().analyze(
          run.profileSnapshot as Parameters<Analyst['analyze']>[0],
          candidates.map(({ finding }) => finding),
        );
        const stageDataById = new Map(
          candidates.map(({ finding, stageData }) => [finding.id, stageData]),
        );
        for (const { findingId, analysis } of result.analyses) {
          const previous = stageDataById.get(findingId);
          await this.state.database
            .update(workflowRunFindings)
            .set({
              stage: 'analyzed',
              stageData: {
                ...(previous && typeof previous === 'object' ? previous : {}),
                analysis,
                analyzedByRunId: agentRunId,
              },
            })
            .where(
              and(
                eq(workflowRunFindings.workflowRunId, run.id),
                eq(workflowRunFindings.findingId, findingId),
              ),
            );
        }
        output = {
          summary: `Analyzed ${result.analyses.length} findings.`,
          findingCount: result.analyses.length,
          tokenUsage: result.tokenUsage,
        };
      } else if (definition.slug === 'judge') {
        const candidates = (await this.loadRunCandidates(run.id)).filter(
          ({ stageData }) => 'analysis' in this.stageObject(stageData),
        );
        const result = await new Judge().judge(
          run.profileSnapshot as Parameters<Judge['judge']>[0],
          candidates.map(({ finding, stageData }) => ({
            ...finding,
            analysis: this.requireStageField(stageData, 'analysis', finding.id),
          })),
        );
        const stageDataById = new Map(
          candidates.map(({ finding, stageData }) => [finding.id, stageData]),
        );
        for (const { findingId, judgment } of result.judgments) {
          await this.updateRunFindingStage(run.id, findingId, 'judged', {
            ...this.stageObject(stageDataById.get(findingId)),
            judgment,
            judgedByRunId: agentRunId,
          });
        }
        output = {
          summary: `Judged ${result.judgments.length} findings.`,
          findingCount: result.judgments.length,
          tokenUsage: result.tokenUsage,
        };
      } else if (definition.slug === 'curator') {
        const candidates = (await this.loadRunCandidates(run.id)).filter(
          ({ stageData }) => 'judgment' in this.stageObject(stageData),
        );
        const workflowConfiguration = this.stageObject(
          (run.workflowSnapshot as { configuration?: unknown }).configuration,
        );
        const budget = {
          maxItems: this.positiveInteger(workflowConfiguration.reportSize, 6),
          maxMinutes: this.positiveInteger(
            workflowConfiguration.learningMinutes,
            180,
          ),
        };
        const result = await new Curator().curate(
          run.profileSnapshot,
          candidates.map(({ finding, stageData }) => ({
            ...finding,
            analysis: this.requireStageField(stageData, 'analysis', finding.id),
            judgment: this.requireStageField(stageData, 'judgment', finding.id),
          })),
          budget,
        );
        const selections = new Map(
          result.curation.selections.map((item) => [item.findingId, item]),
        );
        for (const { finding, stageData } of candidates) {
          const selection = selections.get(finding.id);
          await this.updateRunFindingStage(
            run.id,
            finding.id,
            selection ? 'selected' : 'excluded',
            {
              ...this.stageObject(stageData),
              ...(selection ? { selection } : {}),
              curationReason:
                selection?.reason ??
                result.curation.exclusions.find(
                  (item) => item.findingId === finding.id,
                )?.reason ??
                'Not selected under the current learning budget.',
              curatedByRunId: agentRunId,
            },
          );
        }
        output = {
          summary: `Selected ${result.curation.selections.length} of ${candidates.length} findings.`,
          curation: result.curation,
          tokenUsage: result.tokenUsage,
        };
      } else if (definition.slug === 'reporter') {
        const candidates = (await this.loadRunCandidates(run.id)).filter(
          ({ stageData }) => 'selection' in this.stageObject(stageData),
        );
        if (!candidates.length) throw new Error('curator selected no findings');
        const result = await new Reporter().report(
          run.profileSnapshot,
          candidates.map(({ finding, stageData }) => ({
            ...finding,
            analysis: this.requireStageField(stageData, 'analysis', finding.id),
            judgment: this.requireStageField(stageData, 'judgment', finding.id),
            selection: this.requireStageField(
              stageData,
              'selection',
              finding.id,
            ),
          })),
        );
        const reportById = new Map(
          result.report.items.map((item) => [item.findingId, item]),
        );
        for (const { finding, stageData } of candidates) {
          await this.updateRunFindingStage(run.id, finding.id, 'reported', {
            ...this.stageObject(stageData),
            report: reportById.get(finding.id),
            reportedByRunId: agentRunId,
          });
        }
        output = {
          summary: result.report.summary,
          report: result.report,
          tokenUsage: result.tokenUsage,
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
          tokenUsage:
            'tokenUsage' in output
              ? (output.tokenUsage as {
                  inputTokens: number;
                  outputTokens: number;
                })
              : { inputTokens: 0, outputTokens: 0 },
          completedAt: new Date().toISOString(),
        })
        .where(eq(agentRuns.id, agentRunId));
      log.info(
        {
          workflowRunId,
          agentSlug: definition.slug,
          agentRunId,
          durationMs: Date.now() - stepStartedAt,
        },
        'workflow step completed',
      );
    }

    const savedFindings = (
      await this.state.database
        .select({ finding: findings, stageData: workflowRunFindings.stageData })
        .from(workflowRunFindings)
        .innerJoin(findings, eq(workflowRunFindings.findingId, findings.id))
        .where(eq(workflowRunFindings.workflowRunId, run.id))
    )
      .filter(({ stageData }) => 'report' in this.stageObject(stageData))
      .sort((a, b) => {
        const aSelection = this.stageObject(
          this.stageObject(a.stageData).selection,
        );
        const bSelection = this.stageObject(
          this.stageObject(b.stageData).selection,
        );
        return (
          Number(aSelection.position ?? 0) - Number(bSelection.position ?? 0)
        );
      });

    if (!savedFindings.length)
      throw new Error('reporter produced no reportable findings');
    const reporterRun = await this.state.database
      .select()
      .from(agentRuns)
      .where(
        and(
          eq(agentRuns.workflowRunId, run.id),
          eq(agentRuns.agentSlug, 'reporter'),
        ),
      )
      .limit(1);
    const reporterOutput = this.stageObject(reporterRun[0]?.output);
    const learningReport = this.stageObject(reporterOutput.report);

    const [report] = await this.state.database
      .insert(reports)
      .values({
        id: newId('report'),
        userId: run.userId,
        workflowRunId: run.id,
        title:
          typeof learningReport.title === 'string'
            ? learningReport.title
            : 'Systems engineering learning radar',
        summary:
          typeof learningReport.summary === 'string'
            ? learningReport.summary
            : 'Selected systems-engineering lessons.',
        status: 'published',
        metadata: { itemCount: savedFindings.length, generatedBy: 'reporter' },
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
        savedFindings.map(({ finding, stageData }, index) => {
          const generatedItem = this.requireStageField(
            stageData,
            'report',
            finding.id,
          );
          const judgment = this.requireStageField(
            stageData,
            'judgment',
            finding.id,
          );
          const selection = this.requireStageField(
            stageData,
            'selection',
            finding.id,
          );
          const scores = this.stageObject(judgment.scores);
          const activity = this.stageObject(generatedItem.activity);
          return {
            id: newId('ritem'),
            reportId: report!.id,
            findingId: finding.id,
            position: index + 1,
            headline: String(generatedItem.headline ?? finding.title),
            summary: String(
              generatedItem.executiveSummary ?? finding.summary ?? '',
            ),
            reason: String(selection.reason ?? ''),
            nextSteps: [String(activity.instruction ?? '')].filter(Boolean),
            scores: {
              interest: Number(scores.relevance ?? 0),
              readiness: Number(scores.practicality ?? 0),
              quality: Number(scores.technicalQuality ?? 0),
              credibility: Number(scores.credibility ?? 0),
              learningValue: Number(scores.learningValue ?? 0),
            },
            metadata: { report: generatedItem, judgment, selection },
          };
        }),
      );
    }

    await this.state.database
      .update(workflowRuns)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      .where(eq(workflowRuns.id, run.id));
    log.info(
      { workflowRunId, durationMs: Date.now() - workflowStartedAt },
      'workflow execution completed',
    );
  }

  private loadRunCandidates(runId: string) {
    return this.state.database
      .select({ finding: findings, stageData: workflowRunFindings.stageData })
      .from(workflowRunFindings)
      .innerJoin(findings, eq(workflowRunFindings.findingId, findings.id))
      .where(eq(workflowRunFindings.workflowRunId, runId));
  }

  private updateRunFindingStage(
    runId: string,
    findingId: string,
    stage: string,
    stageData: Record<string, unknown>,
  ) {
    return this.state.database
      .update(workflowRunFindings)
      .set({ stage, stageData })
      .where(
        and(
          eq(workflowRunFindings.workflowRunId, runId),
          eq(workflowRunFindings.findingId, findingId),
        ),
      );
  }

  private stageObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private requireStageField(
    stageData: unknown,
    field: string,
    findingId: string,
  ): any {
    const value = this.stageObject(stageData)[field];
    if (!value || typeof value !== 'object')
      throw new Error(`finding ${findingId} is missing ${field}`);
    return value;
  }

  private positiveInteger(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : fallback;
  }
}
