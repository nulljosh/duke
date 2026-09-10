import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimited, isValidTrack, shouldRotateLog, cycleDue, nextInRotation } from './guards.mjs';

test('rateLimited allows up to max requests in a window', () => {
  const win = { start: 0, count: 0 };
  for (let i = 0; i < 120; i++) assert.equal(rateLimited(win, 0, 10_000, 120), false);
  assert.equal(rateLimited(win, 0, 10_000, 120), true);
});

test('rateLimited resets once the window elapses', () => {
  const win = { start: 0, count: 0 };
  rateLimited(win, 0, 10_000, 1);
  assert.equal(rateLimited(win, 0, 10_000, 1), true); // still in window, over max
  assert.equal(rateLimited(win, 20_000, 10_000, 1), false); // new window
});

test('isValidTrack accepts language codes and named tracks', () => {
  for (const t of ['es', 'zu', 'math', 'chess', 'music', 'EN'])
    assert.equal(isValidTrack(t), true, t);
});

test('isValidTrack rejects anything else', () => {
  for (const t of [null, undefined, '', 'a', 'toolongcode', 'es;rm -rf', '12'])
    assert.equal(isValidTrack(t), false, String(t));
});

test('shouldRotateLog triggers at the threshold', () => {
  assert.equal(shouldRotateLog(4_999_999, 5_000_000), false);
  assert.equal(shouldRotateLog(5_000_000, 5_000_000), true);
});

test('cycleDue is false when cycling is disabled', () => {
  assert.equal(cycleDue({ enabled: false, mode: 'time', value: 1, lastAt: 0 }, 999_999_999), false);
});

test('cycleDue: time mode fires once value minutes have elapsed', () => {
  const cycle = { enabled: true, mode: 'time', value: 20, lastAt: 0 };
  assert.equal(cycleDue(cycle, 19 * 60_000), false);
  assert.equal(cycleDue(cycle, 20 * 60_000), true);
});

test('cycleDue: count mode fires once sinceCount reaches value', () => {
  const cycle = { enabled: true, mode: 'count', value: 3, sinceCount: 2 };
  assert.equal(cycleDue(cycle, 0), false);
  cycle.sinceCount = 3;
  assert.equal(cycleDue(cycle, 0), true);
});

test('nextInRotation cycles through the list and wraps around', () => {
  const rotation = ['chess', 'math', 'es', 'fr'];
  assert.equal(nextInRotation(rotation, 'chess'), 'math');
  assert.equal(nextInRotation(rotation, 'fr'), 'chess'); // wraps
});

test('nextInRotation falls back to the first entry for an unknown track', () => {
  assert.equal(nextInRotation(['chess', 'math'], 'not-in-list'), 'chess');
});
