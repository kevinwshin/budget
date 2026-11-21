import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney } from '../src/money.ts';

test('typed amounts are stored as the cents the user meant', () => {
  const cases: [string, number | null][] = [
    ['12.34', 1234],
    ['$1,234.56', 123456],
    ['19.99', 1999], // 19.99 * 100 is 1998.999… in floating point
    ['0.29', 29], // 0.29 * 100 is 28.999… in floating point
    ['.5', 50],
    ['7', 700],
    ['', null],
    ['-', null],
    ['abc', null],
  ];
  for (const [text, cents] of cases) assert.equal(parseMoney(text), cents, JSON.stringify(text));
});
