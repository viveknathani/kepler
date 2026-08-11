import { describe, expect, test } from 'bun:test';
import { Analyst, buildAnalystPrompt } from './analyst';

const finding = {
  id: 'finding_1',
  title: 'Learned storage engine',
  summary: 'Reduces read amplification but adds retraining overhead.',
  sourceType: 'paper',
  contentKind: 'read',
  metadata: { categories: ['cs.DB'] },
};

describe('analyst', () => {
  test('builds a bounded prompt with profile and source evidence', () => {
    const prompt = buildAnalystPrompt(
      { preferences: { interests: ['database internals'] } },
      finding,
    );

    expect(prompt).toContain('database internals');
    expect(prompt).toContain('Learned storage engine');
    expect(prompt).toContain('Reduces read amplification');
    expect(prompt).toContain('Evidence entries must identify');
  });

  test('returns structured analyses and aggregates model usage', async () => {
    const prompts: string[] = [];
    const analyst = new Analyst(async (prompt) => {
      prompts.push(prompt);
      return {
        analysis: {
          technicalInsights: ['The design targets read amplification.'],
          tradeOffs: ['Lower reads require model retraining.'],
          practicalRelevance: 'Relevant to database engine work.',
          evidence: ['The summary names both effects.'],
          limitations: ['No benchmark data was supplied.'],
        },
        usage: { inputTokens: 20, outputTokens: 10 },
      };
    });

    const result = await analyst.analyze(
      { goals: [{ description: 'Build a storage engine' }] },
      [finding, { ...finding, id: 'finding_2' }],
    );

    expect(prompts).toHaveLength(2);
    expect(result.analyses).toHaveLength(2);
    expect(result.analyses[0]).toMatchObject({
      findingId: 'finding_1',
      analysis: { tradeOffs: ['Lower reads require model retraining.'] },
    });
    expect(result.tokenUsage).toEqual({ inputTokens: 40, outputTokens: 20 });
  });

  test('propagates model failures so the workflow can retry', async () => {
    const analyst = new Analyst(async () => {
      throw new Error('model temporarily unavailable');
    });

    await expect(analyst.analyze({}, [finding])).rejects.toThrow(
      'model temporarily unavailable',
    );
  });
});
