import { describe, expect, test } from 'bun:test';
import { Curator } from './curator';

const candidate = {
  id: 'finding_1',
  title: 'A',
  summary: 'A',
  sourceType: 'paper',
  contentKind: 'read',
  analysis: {
    technicalInsights: ['x'],
    tradeOffs: ['y'],
    practicalRelevance: 'z',
    evidence: ['e'],
    limitations: [],
  },
  judgment: {
    scores: {
      technicalQuality: 0.8,
      credibility: 0.8,
      learningValue: 0.8,
      relevance: 0.8,
      novelty: 0.8,
      practicality: 0.8,
    },
    concepts: ['queues'],
    prerequisites: [],
    evidence: ['e'],
    concerns: [],
    strongestCounterargument: 'narrow workload',
    difficulty: 'intermediate' as const,
    recommendation: 'advance' as const,
    rationale: 'useful',
    confidence: 0.8,
  },
};

describe('curator', () => {
  test('normalizes order and filters unknown exclusions', async () => {
    const curator = new Curator(async () => ({
      curation: {
        selections: [
          {
            findingId: 'finding_1',
            position: 8,
            lane: 'depth',
            estimatedMinutes: 30,
            reason: 'best lesson',
          },
        ],
        exclusions: [{ findingId: 'invented', reason: 'no' }],
        rationale: 'focused',
      },
    }));
    const result = await curator.curate({}, [candidate], {
      maxItems: 1,
      maxMinutes: 30,
    });
    expect(result.curation.selections[0]?.position).toBe(1);
    expect(result.curation.exclusions).toEqual([]);
  });

  test('rejects duplicate IDs and budget overruns', async () => {
    const curator = new Curator(async () => ({
      curation: {
        selections: [
          {
            findingId: 'finding_1',
            position: 1,
            lane: 'depth',
            estimatedMinutes: 20,
            reason: 'one',
          },
          {
            findingId: 'finding_1',
            position: 2,
            lane: 'practice',
            estimatedMinutes: 20,
            reason: 'two',
          },
        ],
        exclusions: [],
        rationale: 'bad',
      },
    }));
    await expect(
      curator.curate({}, [candidate], { maxItems: 2, maxMinutes: 60 }),
    ).rejects.toThrow('duplicate');
  });
});
