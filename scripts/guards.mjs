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

// A cycle that opened a lesson fine but finished nothing is the failure mode
// idleOpens can't see (that only counts open failures). Escalate: reset the
// in-flight session first, then give up on the track entirely.
export const stallAction = (unproductiveCycles) =>
  unproductiveCycles >= 6 ? "switch" : unproductiveCycles >= 3 ? "reset" : null;
