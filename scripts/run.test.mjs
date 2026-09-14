// Unit tests for the pure helpers in run.mjs (mirrored here, same as
// solver.test.mjs does for solver.js — run.mjs launches a browser at import
// time, so it can't be imported directly). `node --test scripts/run.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- speakOut's dash cleanup (mirrors run.mjs's `clean` in speakOut) ---
const cleanSpeech = text => String(text).replace(/[–—]/g, '.').slice(0, 500);

test('cleanSpeech turns em/en dashes into a spoken pause, not a glitch', () => {
  assert.equal(cleanSpeech('tea—please'), 'tea.please');
  assert.equal(cleanSpeech('mind the gap–ish'), 'mind the gap.ish');
});

test('cleanSpeech leaves normal punctuation and hyphens alone', () => {
  assert.equal(cleanSpeech('well-known. It works!'), 'well-known. It works!');
});

test('cleanSpeech caps length so a runaway prompt never hangs `say`', () => {
  assert.equal(cleanSpeech('x'.repeat(1000)).length, 500);
});

// --- persisted voiceOn (mirrors the try/catch boot-read in run.mjs) ---
const loadVoiceOn = raw => { try { return !!JSON.parse(raw).voiceOn; } catch { return false; } };

test('loadVoiceOn restores a saved true across a restart', () => {
  assert.equal(loadVoiceOn('{"voiceOn":true}'), true);
});

test('loadVoiceOn defaults to false on missing/corrupt state.json, never throws', () => {
  assert.equal(loadVoiceOn('not json'), false);
  assert.equal(loadVoiceOn('{}'), false);
  assert.equal(loadVoiceOn(undefined), false);
});
