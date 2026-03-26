import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBusinessSourceHash, buildTaskIdempotencyKey, computeBackoffSeconds } from '../worker/lib/idempotency';

test('buildTaskIdempotencyKey is deterministic', async () => {
  const one = await buildTaskIdempotencyKey({ agent_id: 'Agent-01', city: 'Baghdad', category: 'Restaurants' });
  const two = await buildTaskIdempotencyKey({ agent_id: 'agent-01', city: 'baghdad', category: 'restaurants' });
  assert.equal(one, two);
});

test('buildBusinessSourceHash changes when source changes', async () => {
  const base = {
    externalId: 'abc',
    name: 'Cafe X',
    category: 'cafes',
    city: 'Basra',
    sourceUrl: 'https://example.com/a',
    rawPayload: {},
  };

  const one = await buildBusinessSourceHash('Agent-01', base);
  const two = await buildBusinessSourceHash('Agent-01', { ...base, sourceUrl: 'https://example.com/b' });
  assert.notEqual(one, two);
});

test('computeBackoffSeconds respects max bound', () => {
  const original = Math.random;
  Math.random = () => 0.5;
  const result = computeBackoffSeconds(10, 30, 1800);
  Math.random = original;
  assert.ok(result <= 1800);
});
