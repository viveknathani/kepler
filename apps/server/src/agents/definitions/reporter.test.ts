import { describe, expect, test } from 'bun:test';
import { completeSummary, Reporter } from './reporter';

function candidate(id: string, position: number) {
  return {
    id,
    title: id,
    summary: 'summary',
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
      strongestCounterargument: 'scope',
      difficulty: 'intermediate' as const,
      recommendation: 'advance' as const,
      rationale: 'useful',
      confidence: 0.8,
    },
    selection: {
      position,
      lane: 'depth' as const,
      estimatedMinutes: 30,
      reason: 'selected',
    },
  };
}
function item(findingId: string) {
  return {
    findingId,
    headline: findingId,
    executiveSummary: 'What happened.',
    systemsPrinciple: 'Bounded queues apply backpressure.',
    mechanism: 'Capacity limits admission.',
    tradeOffsAndFailureModes: ['Producers may block.'],
    engineeringChallenge: 'Workload assumptions may fail.',
    priorKnowledgeConnection: 'Connects queues and latency.',
    activity: {
      type: 'implement' as const,
      instruction: 'Build a bounded queue.',
      successCriterion: 'Overload is rejected.',
    },
    reflectionQuestion: 'When is dropping work preferable?',
  };
}

describe('reporter', () => {
  test('keeps bounded report summaries complete', () => {
    const first = 'A complete first sentence about the selected lessons. ';
    const summary = completeSummary(`${first}${'More detail '.repeat(50)}`);
    expect(summary).toBe(first.trim());
    expect(summary.endsWith('.')).toBe(true);
  });

  test('preserves curator order even when model output is shuffled', async () => {
    const reporter = new Reporter(async () => ({
      report: {
        title: 'Radar',
        summary: 'Two lessons.',
        items: [item('b'), item('a')],
      },
    }));
    const result = await reporter.report({}, [
      candidate('a', 1),
      candidate('b', 2),
    ]);
    expect(result.report.items.map((entry) => entry.findingId)).toEqual([
      'a',
      'b',
    ]);
  });

  test('rejects invented or missing report items', async () => {
    const reporter = new Reporter(async () => ({
      report: { title: 'Radar', summary: 'Bad.', items: [item('invented')] },
    }));
    await expect(reporter.report({}, [candidate('a', 1)])).rejects.toThrow(
      'does not match',
    );
  });
});
