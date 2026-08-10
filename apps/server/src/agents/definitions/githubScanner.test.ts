import { describe, expect, test } from 'bun:test';
import { buildGitHubQueries, GitHubScanner } from './githubScanner';

describe('github-scanner', () => {
  test('derives searches from profile interests and languages', () => {
    expect(buildGitHubQueries({
      preferences: {
        interests: ['database internals', 'distributed systems'],
      },
      constraints: { preferredLanguages: ['Rust'] },
    })).toEqual([
      'database internals language:Rust',
      'distributed systems language:Rust',
    ]);
  });

  test('normalizes repository, issue, and pull request results', async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      const query = url.searchParams.get('q') ?? '';
      const headers = { 'x-ratelimit-remaining': '27', 'x-ratelimit-reset': '1800000000' };
      if (url.pathname.endsWith('/repositories')) {
        return Response.json({ items: [{
          id: 1,
          full_name: 'acme/storage',
          html_url: 'https://github.com/acme/storage',
          description: 'A storage engine',
          language: 'Rust',
          stargazers_count: 120,
          forks_count: 12,
          open_issues_count: 4,
          topics: ['database'],
          updated_at: new Date().toISOString(),
          archived: false,
        }], total_count: 1, incomplete_results: false }, { headers });
      }
      const pullRequest = query.includes('is:pr');
      return Response.json({ items: [{
        id: pullRequest ? 3 : 2,
        number: pullRequest ? 8 : 7,
        title: pullRequest ? 'Improve recovery' : 'Write path stalls',
        html_url: `https://github.com/acme/storage/${pullRequest ? 'pull' : 'issues'}/${pullRequest ? 8 : 7}`,
        body: 'Technical context and reproduction details.',
        comments: 4,
        labels: [{ name: 'performance' }],
        repository_url: 'https://api.github.com/repos/acme/storage',
        updated_at: new Date().toISOString(),
        ...(pullRequest ? { pull_request: {} } : {}),
      }], total_count: 1, incomplete_results: false }, { headers });
    };

    const result = await new GitHubScanner(fetcher as unknown as typeof fetch, '').scan({
      preferences: { interests: ['storage engine'] },
    }, 6);

    expect(result.findings).toHaveLength(3);
    expect(result.findings.map((finding) => finding.sourceType).sort()).toEqual([
      'github_issue',
      'github_pull_request',
      'github_repository',
    ]);
    expect(result.rateLimit.remaining).toBe(27);
  });

  test('classifies rate limits as retryable workflow failures', async () => {
    const fetcher = async () => new Response('{}', { status: 403, headers: { 'retry-after': '60' } });
    await expect(new GitHubScanner(fetcher as unknown as typeof fetch, '').scan({
      preferences: { interests: ['databases'] },
    })).rejects.toThrow('GitHub rate limit reached; retry after 60s');
  });
});
