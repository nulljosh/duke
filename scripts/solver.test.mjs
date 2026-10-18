// Unit tests for the pure helpers in solver.js, using a minimal fake DOM —
// no browser. `node --test scripts/solver.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- tile text normalisation (mirrors the txt()/tokText()/strip() helpers in solveLang) ---
const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
const strip = e => txt(e).replace(/^\d+\s+/, '');

test('txt collapses whitespace and lowercases', () => {
  assert.equal(txt({ innerText: '  Hola\n  Mundo ' }), 'hola mundo');
});

test('strip drops a leading shortcut number, never includes()', () => {
  assert.equal(strip({ innerText: '1 ești' }), 'ești');
  assert.equal(strip({ innerText: 'e' }), 'e');
  // "e" must not fuzzy-match "ești" — exact-match only, no substring test here
  assert.notEqual(strip({ innerText: '3 ești' }), 'e');
});

// --- tileKey (mirrors solveLang's characterMatch tile-matching key) ---
// Regression for the bug where match-pairs tiles never matched: innerText is
// "5\n물mul" (index + word + romanization glued with no separator) for the
// target-language side, so scraping displayed text can never equal the plain
// vocab word. The tile's data-test attribute names it "<word>-challenge-tap-token"
// verbatim, so read the key from there instead.
const tileKey = e => (e.dataset.test || '').replace(/-challenge-tap-token$/, '').toLowerCase();

test('tileKey reads the vocab word from data-test, ignoring innerText noise', () => {
  const koreanTile = { dataset: { test: '물-challenge-tap-token' }, innerText: '5\n물mul' };
  const englishTile = { dataset: { test: 'water-challenge-tap-token' }, innerText: '1\nwater' };
  assert.equal(tileKey(koreanTile), '물');
  assert.equal(tileKey(englishTile), 'water');
});

// --- pairsSpeech (mirrors ledgerRow's characterMatch narration fallback) ---
// characterMatch challenges have no sentence prompt/answer at all, so voice
// mode went silent for this entire challenge type until this fallback.
const pairsSpeech = pairs => pairs.map(p => `${p.fromToken} is ${p.learningToken}`).join('. ');

test('pairsSpeech reads out every matched vocab pair', () => {
  const pairs = [{ fromToken: 'tea', learningToken: '차' }, { fromToken: 'bread', learningToken: '빵' }];
  assert.equal(pairsSpeech(pairs), 'tea is 차. bread is 빵');
});

// --- puzzleBest: FEN-keyed lookup against a fake chal() ---
function puzzleBest(chal, liveFen) {
  const c = chal; if (!c || !c.chessPuzzleInfo) return null;
  const fen = liveFen || c.fen; if (!fen) return null;
  const key = fen.split(' ').slice(0, 2).join(' ');
  const ev = c.chessPuzzleInfo.moveEvaluationsForPositions || {};
  const list = ev[key] || ev[Object.keys(ev).find(k => k.split(' ')[0] === key.split(' ')[0])] || [];
  const best = list.find(e => e.moveCorrectness === 'correct') || list.find(e => e.moveCorrectness === 'suboptimal');
  return best ? { move: best.move, fen, known: true } : null;
}

test('puzzleBest finds the correct move for the live FEN', () => {
  const chal = {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    chessPuzzleInfo: {
      moveEvaluationsForPositions: {
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
          { move: 'f3g5', moveCorrectness: 'suboptimal' },
          { move: 'b1c3', moveCorrectness: 'correct' },
        ],
      },
    },
  };
  const r = puzzleBest(chal, chal.fen);
  assert.equal(r.move, 'b1c3');
});

test('puzzleBest falls back to a board-only key match (side omitted)', () => {
  const chal = { fen: 'x', chessPuzzleInfo: { moveEvaluationsForPositions: { 'boardonly w': [{ move: 'e2e4', moveCorrectness: 'correct' }] } } };
  const r = puzzleBest(chal, 'boardonly w 0 1');
  assert.equal(r.move, 'e2e4');
});

test('puzzleBest returns null with no chessPuzzleInfo', () => {
  assert.equal(puzzleBest({ fen: 'x' }, 'x'), null);
});

// --- chess board/promotion geometry (mirrors chessSquares in solver.js) ---
function chessSquares(rect, white, shotW = 1568, innerWidth = 1400) {
  const k = shotW / innerWidth;
  const bx = rect.left + rect.width * 0.0975, by = rect.top + rect.height * 0.1, s = rect.width * 0.8 / 8;
  const sq = q => { let f = q.charCodeAt(0) - 97, rk = +q[1] - 1; if (!white) { f = 7 - f; rk = 7 - rk; }
    return [Math.round((bx + s * (f + 0.5)) * k), Math.round((by + s * (7 - rk + 0.5)) * k)]; };
  const promo = b => { const left = Math.max(bx, Math.min(b[0] / k - 2.25 * s, bx + 8 * s - 4.5 * s)); return [Math.round((left + 0.8 * s) * k), Math.round(b[1] + 2.2 * s * k)]; };
  return { sq, promo };
}

test('chessSquares: a1 for white sits in the bottom-left of the board region', () => {
  const rect = { left: 0, top: 0, width: 800, height: 800 };
  const { sq } = chessSquares(rect, true, 800, 800);   // 1:1 scale for a readable assertion
  const a1 = sq('a1');
  const h8 = sq('h8');
  assert.ok(a1[0] < h8[0] && a1[1] > h8[1], 'a1 should be left-and-below h8 for white, got ' + JSON.stringify({ a1, h8 }));
});

test('chessSquares: board flips for black', () => {
  const rect = { left: 0, top: 0, width: 800, height: 800 };
  const white = chessSquares(rect, true, 800, 800).sq('a1');
  const black = chessSquares(rect, false, 800, 800).sq('a1');
  assert.notDeepEqual(white, black, 'a1 must land at a different pixel when the board is flipped for black');
});

test('promotion picker clamps to the board left edge and offsets down-right of the target square', () => {
  const rect = { left: 0, top: 0, width: 800, height: 800 };
  const { sq, promo } = chessSquares(rect, true, 800, 800);
  const nearRightEdge = sq('h8');   // rightmost file — picker must clamp, not run off the board
  const p = promo(nearRightEdge);
  const s = rect.width * 0.8 / 8;
  const bx = rect.left + rect.width * 0.0975;
  assert.ok(p[0] <= bx + 8 * s - 4.5 * s + 0.8 * s + 1, 'promo x should clamp inside the board, got ' + p[0]);
  assert.ok(p[1] > nearRightEdge[1], 'promo picker should sit below the target square');
});

// --- shotW scaling: computer-tool clicks are in screenshot px, not CSS px ---
test('chessSquares scales by shotW/innerWidth', () => {
  // exact 2x: an even-pixel rect so Math.round on each side lands on the same integer doubled
  const rect = { left: 0, top: 0, width: 800, height: 800 };
  const at1x = chessSquares(rect, true, 800, 800).sq('e4');
  const at2x = chessSquares(rect, true, 1600, 800).sq('e4');
  assert.equal(at2x[0], at1x[0] * 2);
  assert.equal(at2x[1], at1x[1] * 2);
});

// Exercise the real solver against romanized tiles, rather than a mirrored helper.
const { readFileSync } = await import('node:fs');
const { runInNewContext } = await import('node:vm');
test('tapComplete matches Korean words without their displayed romanization', async () => {
  const clicked = [];
  const tiles = ['무거운', '가방'].map(word => ({
    dataset: { test: word + '-challenge-tap-token' },
    innerText: word + 'romanization',
    getAttribute: () => null,
    querySelector: () => null,
    click: () => clicked.push(word),
  }));
  const document = {
    querySelector: selector => selector === '[data-test="word-bank"]'
      ? { querySelectorAll: () => tiles } : null,
    querySelectorAll: () => [],
  };
  const window = {};
  runInNewContext(readFileSync(new URL('./solver.js', import.meta.url), 'utf8'), { window, document });
  window.__duo.chal = () => ({ type: 'tapComplete', choices: ['무거운', '가방'], correctIndices: [0, 1] });
  window.__duo.sleep = async () => {};
  assert.equal(await window.__duo.solveLang(), 'tapIndices');
  assert.deepEqual(clicked, ['무거운', '가방']);
});

test('a single-answer shape whose options are tap tokens, not challenge-choices, is answered', async () => {
  const clicked = [];
  const tiles = ['ka', 'ki', 'ku'].map(word => ({
    dataset: { test: word + '-challenge-tap-token' },
    innerText: word,
    getAttribute: () => null,
    querySelector: () => null,
    click: () => clicked.push(word),
  }));
  const document = {
    querySelector: selector => selector === '[data-test="word-bank"]'
      ? { querySelectorAll: () => tiles } : null,
    querySelectorAll: () => [],
  };
  const window = {};
  runInNewContext(readFileSync(new URL('./solver.js', import.meta.url), 'utf8'), { window, document });
  // transliterationAssist ships correctIndex and nothing else — position is the only key
  window.__duo.chal = () => ({ type: 'transliterationAssist', correctIndex: 1 });
  window.__duo.sleep = async () => {};
  assert.equal(await window.__duo.solveLang(), 'indexTok');
  assert.deepEqual(clicked, ['ki']);
});

test('tapComplete clicks nothing when one of its tiles is missing', async () => {
  const clicked = [];
  const tiles = ['가방'].map(word => ({
    dataset: { test: word + '-challenge-tap-token' },
    innerText: word,
    getAttribute: () => null,
    querySelector: () => null,
    click: () => clicked.push(word),
  }));
  const document = {
    querySelector: selector => selector === '[data-test="word-bank"]'
      ? { querySelectorAll: () => tiles } : null,
    querySelectorAll: () => [],
  };
  const window = {};
  runInNewContext(readFileSync(new URL('./solver.js', import.meta.url), 'utf8'), { window, document });
  window.__duo.chal = () => ({ type: 'tapComplete', choices: ['가방', '없는'], correctIndices: [0, 1] });
  window.__duo.sleep = async () => {};
  assert.equal(await window.__duo.solveLang(), null);
  assert.deepEqual(clicked, []);   // never leave a half-answered challenge on screen
});

// --- ledgerRow: gapFill/match rows must carry a prompt and pairs, or Lexly can't import them ---
test('ledgerRow rebuilds cloze prompt and keeps match pairs', () => {
  const document = { querySelector: () => null, querySelectorAll: () => [] };
  const window = {};
  runInNewContext(readFileSync(new URL('./solver.js', import.meta.url), 'utf8'), { window, document, localStorage: {}, location: { pathname: '/lesson' } });
  window.__duo.chal = () => ({ type: 'gapFill', choices: ['a', 'b'], correctIndex: 1, displayTokens: [{ text: 'I ' }, { text: 'b', isBlank: true }, { text: ' here' }] });
  assert.equal(window.__duo.ledgerRow('index').prompt, 'I ___ here');
  window.__duo.chal = () => ({ type: 'match', pairs: [{ fromToken: 'door', learningToken: 'दरवाज़ा' }] });
  assert.equal(JSON.stringify(window.__duo.ledgerRow('pairs').pairs), JSON.stringify([['door', 'दरवाज़ा']]));
});

// --- translate with no tiles and no input: open keyboard mode and type the solution ---
test('bare translate opens the keyboard and types', async () => {
  let typed = null, kbClicked = false;
  const ta = { tagName: 'TEXTAREA', dispatchEvent: () => {} };
  const kb = { innerText: 'USE KEYBOARD', click: () => { kbClicked = true; } };
  const document = {
    querySelector: sel => (/toggle-keyboard/.test(sel) ? kb : (kbClicked && /textarea/.test(sel) ? ta : null)),
    querySelectorAll: sel => (sel === 'button' ? [kb] : []),
  };
  class HTMLTextAreaElement {} class HTMLInputElement {}
  Object.defineProperty(HTMLTextAreaElement.prototype, 'value', { set(v) { typed = v; } });
  Object.defineProperty(HTMLInputElement.prototype, 'value', { set(v) { typed = v; } });
  const window = {};
  runInNewContext(readFileSync(new URL('./solver.js', import.meta.url), 'utf8'), { window, document, HTMLTextAreaElement, HTMLInputElement, Event: class { constructor(t) { this.type = t; } } });
  window.__duo.chal = () => ({ type: 'translate', correctSolutions: ['私は日本に行きます'], correctTokens: ['私', 'は'] });
  window.__duo.sleep = async () => {};
  assert.equal(await window.__duo.solveLang(), 'type:bare');
  assert.equal(typed, '私は日本に行きます');
});

// Regression: Turkish "to read" / "to drink" tiles carry data-test "read-..." / "drink-...",
// so the pair string only matches the tile's visible label.
test('pair tiles match by data-test key or by visible label', () => {
  const a = ['to read', 'okumak'];
  const hits = [
    { dataset: { test: 'read-challenge-tap-token' }, innerText: 'to read' },
    { dataset: { test: 'okumak-challenge-tap-token' }, innerText: 'okumak' },
    { dataset: { test: 'sadece-challenge-tap-token' }, innerText: 'sadece' },
  ].filter(b => a.includes(tileKey(b)) || a.includes(txt(b).replace(/^\d+\s+/, '')));
  assert.equal(hits.length, 2);
});
