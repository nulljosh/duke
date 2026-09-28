import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine } from './stockfish.mjs';
test('stockfish answers a legal uci move', async () => {
  const e = makeEngine(undefined, 200);
  const mv = await e.bestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
  e.stop();
  assert.match(mv, /^[a-h][1-8][a-h][1-8][qrbn]?$/);
});
test('missing binary resolves null, never throws', async () => {
  const e = makeEngine('/nonexistent/stockfish', 100);
  assert.equal(await e.bestMove('8/8/8/8/8/8/8/K6k w - - 0 1'), null);
});
