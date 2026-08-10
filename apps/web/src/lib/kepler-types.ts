export type Workflow = { id: string; name: string; description: string | null; status: 'draft' | 'active' | 'paused' | 'archived'; configuration: Record<string, unknown> };
export type Profile = { id: string; name: string; description: string | null; preferences: Record<string, unknown>; goals: unknown[]; skills: Record<string, unknown>; constraints: Record<string, unknown> };
export type Schedule = { id: string; workflowId: string; cronExpression: string; timezone: string; isActive: boolean };
export type ScheduleRow = { schedule: Schedule; workflowName: string };
export type Run = { id: string; status: string; trigger: string; createdAt: string; completedAt: string | null };
export type ReportSummary = { id: string; title: string; summary: string | null; status: string; publishedAt: string | null; createdAt: string };
export type ReportItem = { item: { id: string; headline: string; summary: string; reason: string; scores: Record<string, number>; nextSteps: string[] }; finding: { sourceType: string; contentKind: string; canonicalUrl: string | null } };
export type ReportDetail = ReportSummary & { items: ReportItem[] };
