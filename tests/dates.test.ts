import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, lastMonths } from '../src/dates.ts';

test('month navigation and six-month reports cross year boundaries', () => {
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.deepEqual(lastMonths('2027-02', 3), ['2026-12', '2027-01', '2027-02']);
});
