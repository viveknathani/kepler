export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  configuration: Record<string, unknown>;
};
export type Profile = {
  id: string;
  name: string;
  description: string | null;
  preferences: Record<string, unknown>;
  goals: unknown[];
  skills: Record<string, unknown>;
  constraints: Record<string, unknown>;
};
export type Schedule = {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
};
export type ScheduleRow = { schedule: Schedule; workflowName: string };
export type Run = {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  completedAt: string | null;
};
export type AgentSummary = {
  slug: string;
  name: string;
  description: string;
  averageDurationMs: number | null;
  averageTokenUsage: number | null;
};
export type AgentRun = {
  id: string;
  workflowRunId: string;
  status: string;
  attempt: number;
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  provider: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};
export type AgentRunDetail = {
  agent: Pick<AgentSummary, 'slug' | 'name' | 'description'>;
  runs: AgentRun[];
};
export type ReportSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
};
export type FindingAnalysis = {
  technicalInsights: string[];
  tradeOffs: string[];
  practicalRelevance: string;
  evidence: string[];
  limitations: string[];
};
export type ReportItem = {
  item: {
    id: string;
    headline: string;
    summary: string;
    reason: string;
    scores: Record<string, number>;
    nextSteps: string[];
    metadata?: {
      report?: {
        systemsPrinciple: string;
        mechanism: string;
        tradeOffsAndFailureModes: string[];
        engineeringChallenge: string;
        priorKnowledgeConnection: string;
        reflectionQuestion: string;
        activity: {
          type: string;
          instruction: string;
          successCriterion: string;
        };
      };
      judgment?: {
        confidence: number;
        difficulty: string;
        concerns: string[];
      };
      selection?: { lane: string; estimatedMinutes: number };
    };
  };
  finding: {
    sourceType: string;
    contentKind: string;
    canonicalUrl: string | null;
  };
  stageData: { analysis?: FindingAnalysis } | null;
};
export type ReportDetail = ReportSummary & { items: ReportItem[] };
