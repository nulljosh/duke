// Pure logic pulled out of run.mjs's HTTP router so it's testable without a
// live server/browser — same pattern as courseId.mjs. Each function here
// mirrors exactly what run.mjs does inline; if you change the guard here,
// change the call site too.

// ponytail: takes/returns the window state instead of closing over module
// globals, so a test can drive multiple windows without real timers.
export const rateLimited = (win, now, windowMs, max) => {
  if (now - win.start > windowMs) { win.start = now; win.count = 0; }
  win.count += 1;
  return win.count > max;
};

// A track is a short alphanumeric code: a 2-6 letter language code, or
// math/chess/music. Matches the inline regex the /switch route uses.
export const isValidTrack = t => typeof t === 'string' && /^[a-z]{2,6}$/i.test(t);

export const shouldRotateLog = (sizeBytes, thresholdBytes) => sizeBytes >= thresholdBytes;

// Auto-cycle rotation: is it time to switch tracks? Mirrors run.mjs's inline
// cycleDue(). Takes `now` instead of reading Date.now() so it's deterministic.
export const cycleDue = (cycle, now) => {
  if (!cycle.enabled) return false;
  return cycle.mode === 'time'
    ? now - cycle.lastAt >= cycle.value * 60_000
    : cycle.sinceCount >= cycle.value;
};

// Next track in the fixed rotation order (chess, math, then every language).
// Falls back to the first entry for an unknown/off-list current track.
export const nextInRotation = (rotation, t) => rotation[(rotation.indexOf(t) + 1) % rotation.length] || rotation[0];

// Reduce Duolingo's pathSectioned payload to {passed,total,unitsDone,unitsTotal}.
// Pure so it can be tested against real payload shapes — it feeds courseComplete(),
// which is allowed to switch tracks, so a miscount here has real consequences.
// 'legendary' counts as passed; 'locked'/'active'/'unit_test' do not.
export const summarizePath = (sections) => {
  if (!Array.isArray(sections) || !sections.length) return null;
  let passed = 0, total = 0, unitsDone = 0, unitsTotal = 0;
  for (const s of sections) {
    unitsDone += s?.completedUnits || 0;
    unitsTotal += s?.totalUnits || 0;
    for (const unit of (s?.units || [])) {
      for (const lv of (unit?.levels || [])) {
        total++;
        if (lv?.state === "passed" || lv?.state === "legendary") passed++;
      }
    }
  }
  return total ? { passed, total, unitsDone, unitsTotal } : null;
};

// Is a course REALLY finished? Gating auto-advance on `passed >= total` alone is
// not safe: Duolingo's path payload can come back short (an unreleased section
// with units:[] , a partial response), and a shrunken total makes an unfinished
// course look complete — the runner would then mark it done and switch away.
// So: require units to agree with levels, and refuse any payload whose total is
// below the largest total seen for this course. A real tree only ever grows.
export const courseComplete = (cur, peakTotal = 0) => {
  if (!cur || !cur.total || !cur.unitsTotal) return false;
  if (cur.total < peakTotal) return false;          // payload shrank -> partial, not progress
  return cur.passed >= cur.total && cur.unitsDone >= cur.unitsTotal;
};

// Balance mode: play whichever track is furthest behind, so everything levels up
// together instead of one finishing while the rest sit at zero.
//
// Two things this must not do. It must not thrash — two tracks within a hair of
// each other would otherwise swap every poll, and a switch costs a quit, a course
// PATCH and a reload. And it must not switch for a trivial difference, hence the
// margin. `pcts` is a track -> percent map; unknown tracks are simply absent.
export const leastComplete = (pcts, current, opts = {}) => {
  const { margin = 2, now = 0, lastSwitchAt = 0, minDwellMs = 20 * 60e3, remaining = {}, finishWithin = 15 } = opts;
  if (now - lastSwitchAt < minDwellMs) return null;
  // Finish what is within reach first. Pure least-complete never plays the MOST
  // complete course, so a tree sitting 6 levels from done would stay unfinished
  // forever (real case: English at 99.9%). A handful of levels is minutes of
  // work and banks a finished course, so it jumps the queue.
  const nearlyDone = Object.entries(remaining)
    .filter(([, left]) => Number.isFinite(left) && left > 0 && left <= finishWithin)
    .sort((a, b) => a[1] - b[1])[0];
  if (nearlyDone) return nearlyDone[0] === current ? null : nearlyDone[0];
  const ranked = Object.entries(pcts || {})
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a[1] - b[1]);
  if (!ranked.length) return null;
  const [track, pct] = ranked[0];
  if (track === current) return null;
  const cur = pcts[current];
  // Only move if the candidate is MEANINGFULLY behind where we already are.
  if (typeof cur === "number" && pct + margin > cur) return null;
  return track;
};

// Duolingo course id -> our track code. DUOLINGO_ES_EN -> es, and the two
// hyphenated outliers courseIdFor() special-cases in the other direction.
export const trackForCourseId = (id) => {
  if (typeof id !== "string") return null;
  const m = /^DUOLINGO_([A-Z-]+)_EN$/.exec(id);
  if (!m) return null;
  return { "ZH-CN": "zh", "NL-NL": "nl" }[m[1]] ?? m[1].toLowerCase();
};

// A cycle that opened a lesson fine but finished nothing is the failure mode
// idleOpens can't see (that only counts open failures). Escalate: reset the
// in-flight session first, then give up on the track entirely.
export const stallAction = (unproductiveCycles) =>
  unproductiveCycles >= 6 ? "switch" : unproductiveCycles >= 3 ? "reset" : null;

// Count attempts across feedback screens and repeated mistakes, not clicks.
// A per-lesson map also catches a small set of unsolved questions cycling.
export const repeatedChallenge = (attempts, key, maxAttempts = 5) => {
  const count = (attempts.get(key) || 0) + 1;
  attempts.set(key, count);
  return count > maxAttempts;
};

// Disk-full guard: a full disk killed the runner 09-29 and a cleanup then wiped
// the browser cache. Pause under the floor instead of writing into a full disk.
export const diskLow = (freeBytes, floorBytes = 2 * 1024 ** 3) => freeBytes < floorBytes;
