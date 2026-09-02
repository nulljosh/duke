// The unattended loop. Runs only while localStorage.duoAuto.running is true.
// Per page: solve until the lesson is done, then navigate to the next level.
// Stuck 3x on one level -> skip it (recorded), move on. Wedged page -> reload.
// After every lesson, POST state to serve.py so progress lives on disk.
(async () => {
  if (window.__auto) return;                       // already booted on this page
  const KEY = 'duoAuto';
  const m = location.pathname.match(/unit\/(\d+)\/level\/(\d+)/);
  let st = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!st) st = { running: false, unit: +m[1], level: +m[2], log: [], skipped: [] };
  if (!st.running) return;
  // A stray tab or a manual URL: trust the address bar, not stale state.
  if (m && (+m[1] !== st.unit || +m[2] !== st.level)) { st.unit = +m[1]; st.level = +m[2]; st.stuck = 0; }
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const post = () => fetch('http://127.0.0.1:8777/state', { method: 'POST', mode: 'cors',
    body: JSON.stringify({ at: new Date().toISOString(), href: location.href, auto: st,
      ledger: __duo.ledgerDump ? JSON.parse(__duo.ledgerDump()) : {} }) }).catch(() => {});
  const goto = (u, l) => { st.unit = u; st.level = l; st.stuck = 0; save(); post();
    location.href = '/lesson/unit/' + u + '/level/' + l; };
  const next = () => st.level < 4 ? goto(st.unit, st.level + 1) : goto(st.unit + 1, 1);
  save();
  window.__auto = { running: true, out: [], started: Date.now() };
  const wd = setTimeout(() => { st.log.push('watchdog reload'); save(); location.reload(); }, 12 * 60e3);
  for (let k = 0; k < 40 && __auto.running; k++) {
    let r;
    try { r = await __duo.autoLesson(); } catch (e) { r = { ok: false, done: 0, err: String(e) }; }
    __auto.out.push(r);
    st = JSON.parse(localStorage.getItem(KEY));          // autoLesson advanced unit/level
    if (r.ok) { clearTimeout(wd); post(); location.href = '/lesson/unit/' + st.unit + '/level/' + st.level; return; }
    if (!r.done) break;                                  // nothing solvable on this page
  }
  clearTimeout(wd);
  if ((st.stuck || 0) >= 3) {                            // ponytail: 3 strikes then skip, revisit by hand
    const id = 'u' + st.unit + 'l' + st.level;
    st.skipped = st.skipped || []; if (!st.skipped.includes(id)) st.skipped.push(id);
    st.log.push('skip ' + id); next(); return;
  }
  save(); post(); location.reload();                     // retry the level from the top
})();
