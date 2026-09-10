// `node --test scripts/courseId.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseIdFor } from './courseId.mjs';

test('math/chess/music map to their fixed course ids', () => {
  assert.equal(courseIdFor('math'), 'MATH_BT');
  assert.equal(courseIdFor('chess'), 'CHESS_CH');
  assert.equal(courseIdFor('music'), 'MUSIC_MU');
});

test('zh and nl use their special-cased locale, not the generic formula', () => {
  assert.equal(courseIdFor('zh'), 'DUOLINGO_ZH-CN_EN');
  assert.equal(courseIdFor('nl'), 'DUOLINGO_NL-NL_EN');
});

test('any other language code falls back to the generic formula', () => {
  assert.equal(courseIdFor('es'), 'DUOLINGO_ES_EN');
  assert.equal(courseIdFor('fr'), 'DUOLINGO_FR_EN');
  assert.equal(courseIdFor('kl'), 'DUOLINGO_KL_EN'); // Klingon, from the app's language list
});
