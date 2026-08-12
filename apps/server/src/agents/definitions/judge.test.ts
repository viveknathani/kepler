import { describe, expect, test } from 'bun:test';
import { buildJudgePrompt, Judge } from './judge';

const candidate = {
  id: 'finding_1',
  title: 'Storage postmortem',
  summary: 'Measured tail latency during compaction.',
  sourceType: 'postmortem',
  contentKind: 'read',
  analysis: {
    technicalInsights: ['Compaction affects p99.'],
    tradeOffs: ['Space versus latency.'],
    practicalRelevance: 'Useful for storage work.',
    evidence: ['p99 is named.'],
    limitations: ['No raw data.'],
  },
};

const judgment = {
  scores: {
    technicalQuality: 0.8,
    credibility: 0.7,
    learningValue: 0.9,
    relevance: 0.9,
    novelty: 0.6,
    practicality: 0.8,
  },
  concepts: ['compaction'],
  prerequisites: ['LSM trees'],
  evidence: ['The source reports tail latency.'],
  concerns: ['Raw data is absent.'],
  strongestCounterargument: 'The workload may not generalize.',
  difficulty: 'intermediate' as const,
  recommendation: 'advance' as const,
  rationale: 'It teaches a reusable measured trade-off.',
  confidence: 0.75,
};

describe('judge', () => {
  test('grounds its bounded prompt in profile, finding, and prior analysis', () => {
    const prompt = buildJudgePrompt(
      { goals: ['storage internals'] },
      candidate,
    );
    expect(prompt).toContain('storage internals');
    expect(prompt).toContain('Compaction affects p99');
    expect(prompt).toContain('Credibility must reflect');
  });

  test('returns independent judgments and token totals', async () => {
    const judge = new Judge(async () => ({
      judgment,
      usage: { inputTokens: 10, outputTokens: 5 },
    }));
    const result = await judge.judge({}, [
      candidate,
      { ...candidate, id: 'finding_2' },
    ]);
    expect(result.judgments.map((item) => item.findingId)).toEqual([
      'finding_1',
      'finding_2',
    ]);
    expect(result.tokenUsage).toEqual({ inputTokens: 20, outputTokens: 10 });
  });
});
