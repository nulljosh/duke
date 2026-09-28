// Stockfish over UCI. One long-lived process; bestMove(fen) resolves to "e2e4" / "e7e8q".
// ponytail: fixed movetime, no depth tuning; bump SF_MS if matches still lose.
import { spawn } from 'node:child_process';
export const makeEngine = (bin = '/opt/homebrew/bin/stockfish', ms = 800) => {
  let p = null, buf = '', waiter = null;
  const start = () => {
    p = spawn(bin, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    p.stdout.on('data', d => {
      buf += d;
      const m = buf.match(/bestmove (\S+)/);
      if (m && waiter) { waiter(m[1]); waiter = null; buf = ''; }
    });
    const dead = () => { p = null; if (waiter) { waiter(null); waiter = null; } };
    p.on('exit', dead); p.on('error', dead);
    p.stdin.write('uci\nucinewgame\n');
  };
  return {
    bestMove: fen => new Promise(res => {
      if (!p) { try { start(); } catch { return res(null); } }
      waiter = res; buf = '';
      p.stdin.write(`position fen ${fen}\ngo movetime ${ms}\n`);
      setTimeout(() => { if (waiter === res) { waiter = null; res(null); } }, ms + 3000);
    }),
    stop: () => p && p.kill(),
  };
};
