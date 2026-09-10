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
