import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHundred, parsePercent, percentsFromAmounts, splitByPercent } from '../src/percent.ts';

test('percentages accepted as 100% split a large total with no cent lost or added', () => {
  const total = 1_000_000_000;
  const cases = [
    [33.3333333, 33.3333333, 33.3333333], // sums just under 100
    [33.3333336, 33.3333336, 33.3333336], // sums just over 100
  ];
  for (const percents of cases) {
    assert.ok(isHundred(percents.reduce((a, b) => a + b, 0)));
    assert.equal(splitByPercent(total, percents).reduce((a, b) => a + b, 0), total, `percents ${percents}`);
  }
});

test('switching an even three-way split to percent gives percentages that total 100%', () => {
  const texts = percentsFromAmounts([100, 100, 100]);
  assert.ok(isHundred(texts.map(parsePercent).reduce((a, b) => a + b, 0)));
});
