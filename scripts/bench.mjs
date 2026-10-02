// Progress report: where we are against the "finish every course" ladder in roadmap.md.
// Reads log.jsonl only. Rate = course-percent points gained per day over the logged window.
import fs from 'node:fs';
const L = fs.readFileSync(new URL('./log.jsonl', import.meta.url), 'utf8').split('\n').map(l => { try { return JSON.parse(l); } catch {} }).filter(Boolean);
const bal = L.filter(e => e.ev === 'balance-switch');
if (bal.length < 2) { console.log('not enough balance-switch events yet'); process.exit(0); }
const langs = e => Object.entries(e.pcts).filter(([k]) => k !== 'chess' && k !== 'math');
const pts = e => langs(e).reduce((a, [, v]) => a + v, 0);
const first = bal[0], last = bal.at(-1);
const days = (Date.parse(last.at) - Date.parse(first.at)) / 864e5;
const rate = (pts(last) - pts(first)) / days;                 // course-% points per day
const xps = L.filter(e => e.xp != null);
const xpRate = (xps.at(-1).xp - xps.find(e => e.at >= first.at).xp) / days;
const n = langs(last).length, now = pts(last);
console.log(`xp ${xps.at(-1).xp}  (${Math.round(xpRate)}/day)   courses ${n}, 100%: ${langs(last).filter(([, v]) => v >= 100).length}`);
console.log(`avg course ${(now / n).toFixed(1)}%   pace ${rate.toFixed(0)} pts/day over ${days.toFixed(1)}d   chess ${last.pcts.chess}%  math ${last.pcts.math}%`);
for (const pct of [25, 50, 75, 100]) {
  const need = n * pct - now;
  console.log(`avg ${pct}%: ` + (need <= 0 ? 'reached' : `${Math.ceil(need / rate)} days`));
}
