import { expect, test } from 'bun:test';
import { aggregateTeamUsage } from '../src/features/teamUsage/aggregate';

test('aggregates Team usage by configured label without exposing API keys', () => {
  const summary = aggregateTeamUsage(
    [
      {
        api_key: 'key-a',
        model: 'claude-sonnet-4-6',
        requests: 2,
        failed: 1,
        input_tokens: 10,
        output_tokens: 20,
        reasoning_tokens: 2,
        cached_tokens: 1,
        total_tokens: 30,
      },
      {
        api_key: 'key-a',
        model: 'claude-opus-4-6',
        requests: 1,
        failed: 0,
        input_tokens: 5,
        output_tokens: 5,
        reasoning_tokens: 0,
        cached_tokens: 0,
        total_tokens: 10,
      },
    ],
    [{ key: 'key-a', label: 'Engineering' }]
  );

  expect(summary.totalTokens).toBe(40);
  expect(summary.requests).toBe(3);
  expect(summary.labels).toEqual([
    expect.objectContaining({ label: 'Engineering', totalTokens: 40, requests: 3, failed: 1 }),
  ]);
  expect(JSON.stringify(summary)).not.toContain('key-a');
});
