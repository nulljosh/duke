import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimited, isValidTrack, shouldRotateLog, cycleDue, nextInRotation, courseComplete, stallAction, summarizePath, leastComplete, trackForCourseId } from './guards.mjs';

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

// Shapes taken from the live CHESS_CH payload: sections carry completedUnits/
// totalUnits, levels carry a state. Section 7 shipped with everything locked.
const section = (done, total, states) => ({
  completedUnits: done, totalUnits: total,
  units: [{ levels: states.map((state) => ({ state })) }],
});

test('summarizePath counts passed/legendary levels and sums section units', () => {
  const out = summarizePath([
    section(6, 6, ['passed', 'passed', 'legendary']),
    section(0, 48, ['locked', 'locked', 'unit_test', 'active']),
  ]);
  assert.deepEqual(out, { passed: 3, total: 7, unitsDone: 6, unitsTotal: 54 });
});

test('summarizePath: unit_test and active are NOT passed', () => {
  const out = summarizePath([section(1, 1, ['unit_test', 'active'])]);
  assert.equal(out.passed, 0);
  assert.equal(out.total, 2);
});

test('summarizePath returns null for empty/garbage rather than a fake zero', () => {
  // null matters: a {passed:0,total:0} would divide by zero downstream
  for (const bad of [null, undefined, [], 'nope', [{ units: [] }]])
    assert.equal(summarizePath(bad), null, JSON.stringify(bad));
});

test('summarizePath tolerates missing units/levels keys', () => {
  const out = summarizePath([{ completedUnits: 2, totalUnits: 3 }, section(1, 1, ['passed'])]);
  assert.deepEqual(out, { passed: 1, total: 1, unitsDone: 3, unitsTotal: 4 });
});

test('summarizePath output feeds courseComplete correctly', () => {
  const finished = summarizePath([section(2, 2, ['passed', 'passed'])]);
  assert.equal(courseComplete(finished, finished.total), true);
  const partial = summarizePath([section(2, 2, ['passed', 'passed'])]);
  assert.equal(courseComplete(partial, 9999), false);   // total shrank vs peak
});

// Real numbers off the live account, which is what makes scope matter.
const REAL = { chess: 70.0, math: 75.5, pt: 0.1, es: 2.5, tlh: 0.2 };
const LATE = { now: 1e9, lastSwitchAt: 0 };   // well past the dwell window

test('leastComplete picks the track furthest behind', () => {
  assert.equal(leastComplete({ chess: 70, math: 75.5 }, 'math', LATE), 'chess');
});

test('leastComplete stays put when already on the furthest-behind track', () => {
  assert.equal(leastComplete({ chess: 70, math: 75.5 }, 'chess', LATE), null);
});

test('leastComplete ignores a difference smaller than the margin', () => {
  // 69 vs 70 is noise, and a switch costs a quit + course PATCH + reload
  assert.equal(leastComplete({ chess: 70, math: 69 }, 'chess', LATE), null);
  assert.equal(leastComplete({ chess: 70, math: 60 }, 'chess', LATE), 'math');
});

test('leastComplete will not thrash inside the dwell window', () => {
  const soon = { now: 1000, lastSwitchAt: 900 };   // 100ms ago
  assert.equal(leastComplete({ chess: 70, math: 10 }, 'chess', soon), null);
});

test('leastComplete: scope is what keeps chess/math from being abandoned', () => {
  // across everything, the 0.1% language wins and the near-done tracks starve
  assert.equal(leastComplete(REAL, 'chess', LATE), 'pt');
  // scoped to the two comparable tracks, it does what you actually want
  assert.equal(leastComplete({ chess: REAL.chess, math: REAL.math }, 'math', LATE), 'chess');
});

test('leastComplete survives an empty or half-known map', () => {
  assert.equal(leastComplete({}, 'chess', LATE), null);
  assert.equal(leastComplete({ chess: NaN, math: 5 }, 'chess', LATE), 'math');
  // unknown current track: still willing to move to the known-lowest
  assert.equal(leastComplete({ math: 5 }, 'chess', LATE), 'math');
});

test('trackForCourseId maps course ids back to track codes', () => {
  assert.equal(trackForCourseId('DUOLINGO_ES_EN'), 'es');
  assert.equal(trackForCourseId('DUOLINGO_ZH-CN_EN'), 'zh');
  assert.equal(trackForCourseId('DUOLINGO_NL-NL_EN'), 'nl');
  assert.equal(trackForCourseId('CHESS_CH'), null);   // not a language course
  assert.equal(trackForCourseId(null), null);
});
