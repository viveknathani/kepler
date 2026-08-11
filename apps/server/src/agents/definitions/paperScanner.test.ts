import { describe, expect, test } from 'bun:test';
import { buildPaperQueries, PaperScanner } from './paperScanner';

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>https://arxiv.org/abs/2608.01234v2</id>
    <updated>2026-08-10T12:00:00Z</updated>
    <published>2026-08-08T12:00:00Z</published>
    <title> Learned Storage &amp; Query Optimization </title>
    <summary> We study practical trade-offs in learned storage systems. </summary>
    <author><name>Ada Example</name></author>
    <author><name>Grace Example</name></author>
    <category term="cs.DB" scheme="http://arxiv.org/schemas/atom"/>
    <link href="https://arxiv.org/abs/2608.01234v2" rel="alternate" type="text/html"/>
    <link href="https://arxiv.org/pdf/2608.01234v2" rel="related" type="application/pdf"/>
  </entry>
</feed>`;

describe('paper-scanner', () => {
  test('derives deduplicated searches from interests and goals', () => {
    expect(
      buildPaperQueries({
        preferences: {
          interests: ['database internals', 'distributed systems'],
        },
        goals: [
          { description: 'database internals' },
          { description: 'learn query optimization' },
        ],
      }),
    ).toEqual([
      'database internals',
      'distributed systems',
      'learn query optimization',
    ]);
  });

  test('queries arXiv and normalizes Atom entries', async () => {
    let requestedUrl = '';
    const fetcher = async (input: string | URL | Request) => {
      requestedUrl = input instanceof Request ? input.url : input.toString();
      return new Response(feed, {
        headers: { 'content-type': 'application/atom+xml' },
      });
    };

    const result = await new PaperScanner(
      fetcher as unknown as typeof fetch,
    ).scan({
      preferences: { interests: ['learned databases'] },
    });

    expect(new URL(requestedUrl).searchParams.get('search_query')).toBe(
      'all:"learned databases"',
    );
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      externalId: '2608.01234',
      canonicalUrl: 'https://arxiv.org/abs/2608.01234v2',
      sourceType: 'paper',
      contentKind: 'read',
      title: 'Learned Storage & Query Optimization',
      metadata: {
        authors: ['Ada Example', 'Grace Example'],
        categories: ['cs.DB'],
        pdfUrl: 'https://arxiv.org/pdf/2608.01234v2',
      },
    });
  });

  test('classifies throttling as a retryable workflow failure', async () => {
    const fetcher = async () =>
      new Response('', { status: 429, headers: { 'retry-after': '30' } });
    await expect(
      new PaperScanner(fetcher as unknown as typeof fetch).scan({
        preferences: { interests: ['databases'] },
      }),
    ).rejects.toThrow('arXiv temporarily unavailable; retry after 30s');
  });
});
