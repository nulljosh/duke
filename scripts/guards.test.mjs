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

test('leastComplete finishes a nearly-done course before chasing the lowest', () => {
  // English 99.9% with 6 levels left would otherwise never be played again,
  // because pure least-complete only ever picks the furthest behind.
  const pcts = { en: 99.9, pt: 0.1, chess: 70 };
  const remaining = { en: 6, pt: 7729, chess: 673 };
  assert.equal(leastComplete(pcts, 'chess', { ...LATE, remaining }), 'en');
});

test('leastComplete: a big course is never mistaken for nearly-done', () => {
  const pcts = { en: 99.9, pt: 0.1 };
  const remaining = { en: 600, pt: 7729 };   // 600 left is not "within reach"
  assert.equal(leastComplete(pcts, 'chess', { ...LATE, remaining }), 'pt');
});

test('leastComplete: already finishing it, so stay put', () => {
  assert.equal(leastComplete({ en: 99.9, pt: 0.1 }, 'en', { ...LATE, remaining: { en: 6 } }), null);
});

test('leastComplete: a finished course does not re-trigger the finish rule', () => {
  // remaining 0 is done — auto-advance handles that, balance must not loop on it
  assert.equal(leastComplete({ en: 100, pt: 0.1 }, 'chess', { ...LATE, remaining: { en: 0, pt: 7729 } }), 'pt');
});

const { repeatedChallenge } = await import('./guards.mjs');
test('repeated challenge stops retries even with feedback and other questions between', () => {
  const attempts = new Map();
  for (let i = 0; i < 5; i++) {
    assert.equal(repeatedChallenge(attempts, 'stuck'), false);
    assert.equal(repeatedChallenge(attempts, `other-${i}`), false);
  }
  assert.equal(repeatedChallenge(attempts, 'stuck'), true);
  assert.equal(repeatedChallenge(new Map(), 'stuck'), false);
});

const { diskLow } = await import('./guards.mjs');
test('disk guard trips under the floor only', () => {
  assert.equal(diskLow(1 * 1024 ** 3), true);
  assert.equal(diskLow(6.9 * 1024 ** 3), false);
  assert.equal(diskLow(500, 100), false);
});

const { isClaimLabel } = await import('./guards.mjs');
test('claim label matches reward buttons only', () => {
  assert.equal(isClaimLabel('CLAIM'), true);
  assert.equal(isClaimLabel(' Claim 60 gems '), true);
  assert.equal(isClaimLabel('CLAIMED'), false);
  assert.equal(isClaimLabel('START +10 XP'), false);
});

const { streakAtRisk } = await import('./guards.mjs');
test('streak at risk only in the evening with no XP today', () => {
  assert.equal(streakAtRisk(19, 0), true);
  assert.equal(streakAtRisk(10, 0), false);
  assert.equal(streakAtRisk(19, 40), false);
  assert.equal(streakAtRisk(19, null), false);
});

const { isGiftLabel } = await import('./guards.mjs');
test('gift label matches the free friend gift only, never a purchase', () => {
  assert.equal(isGiftLabel('SEND GIFT'), true);
  assert.equal(isGiftLabel(' Send a gift '), true);
  assert.equal(isGiftLabel('GIFT SUPER'), false);
  assert.equal(isGiftLabel('SEND GIFT FOR $9.99'), false);
  assert.equal(isGiftLabel('SEND'), false);
});

const { questKey, questStalled } = await import('./guards.mjs');
test('quests stall only when one is open and nothing moved', () => {
  const qs = [{ done: 40, total: 50 }, { done: 2, total: 5 }];
  assert.equal(questStalled(qs, questKey(qs)), true);
  assert.equal(questStalled(qs, '30/50,2/5'), false);   // moved since last look
  assert.equal(questStalled(qs, null), false);          // first look, nothing to compare
  const done = [{ done: 50, total: 50 }, { done: 5, total: 5 }];
  assert.equal(questStalled(done, questKey(done)), false);
  assert.equal(questStalled([], ''), false);
});

const { crossed, xpRates, fastestTrack } = await import('./guards.mjs');
test('crossed lists every step passed, and nothing otherwise', () => {
  assert.deepEqual(crossed(468000, 471000, 10000), [470000]);
  assert.deepEqual(crossed(470000, 492000, 10000), [480000, 490000]);
  assert.deepEqual(crossed(499990, 500000, 10000), [500000]);
  assert.deepEqual(crossed(470000, 470000, 10000), []);
  assert.deepEqual(crossed(471000, 470000, 10000), []);
  assert.deepEqual(crossed(null, 470000, 10000), []);
  assert.deepEqual(crossed(180, 190, 10), [190]);
});
test('xpRates measures per track and skips gaps, phone XP and thin data', () => {
  const m = 60e3, ev = [];
  for (let i = 0; i <= 40; i++) ev.push({ at: i * m, track: 'pl', xp: 1000 + i * 20 });          // 40 min, 20 xp/min
  ev.push({ at: 41 * m, track: 'chess', xp: 1800 });                                            // track change: no credit
  for (let i = 1; i <= 40; i++) ev.push({ at: (41 + i * 3) * m, track: 'chess', xp: 1800 + i * 25 }); // 120 min, 25 xp per 3 min
  ev.push({ at: 400 * m, track: 'chess', xp: 2900 });                                           // 4h gap: skipped
  ev.push({ at: 401 * m, track: 'chess', xp: 9000 });                                           // phone XP: skipped
  ev.push({ at: 402 * m, track: 'fr', xp: 9000 }, { at: 403 * m, track: 'fr', xp: 9050 });      // 1 min of data: too thin
  const r = xpRates(ev);
  assert.deepEqual(r, { pl: 1200, chess: 500 });
  assert.equal(fastestTrack(r), 'pl');
  assert.equal(fastestTrack(r, t => t !== 'pl'), 'chess');
  assert.equal(fastestTrack(r, () => false), null);
  assert.equal(fastestTrack({}), null);
});
