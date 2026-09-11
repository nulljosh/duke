import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimited, isValidTrack, shouldRotateLog, cycleDue, nextInRotation, courseComplete, stallAction } from './guards.mjs';

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

const done = { passed: 100, total: 100, unitsDone: 10, unitsTotal: 10 };

test('courseComplete: a genuinely finished tree counts', () => {
  assert.equal(courseComplete(done, 100), true);
});

test('courseComplete: unfinished tree does not', () => {
  assert.equal(courseComplete({ ...done, passed: 99 }, 100), false);
  assert.equal(courseComplete({ ...done, unitsDone: 9 }, 100), false);
});

test('courseComplete: a SHRUNKEN payload is never a finish', () => {
  // the dangerous case — a partial response where passed === total, but the
  // total came back below the largest we have already seen for this course
  assert.equal(courseComplete({ passed: 40, total: 40, unitsDone: 4, unitsTotal: 4 }, 2243), false);
});

test('courseComplete: empty or malformed payloads are never a finish', () => {
  for (const bad of [null, undefined, {}, { passed: 0, total: 0, unitsDone: 0, unitsTotal: 0 }])
    assert.equal(courseComplete(bad, 0), false, JSON.stringify(bad));
});

test('stallAction escalates: nothing, then reset, then switch', () => {
  assert.equal(stallAction(0), null);
  assert.equal(stallAction(2), null);
  assert.equal(stallAction(3), 'reset');
  assert.equal(stallAction(5), 'reset');
  assert.equal(stallAction(6), 'switch');
});
