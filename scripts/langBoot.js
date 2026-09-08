// Language autopilot (2026-09-08). Unlike boot.js (math levels by URL), a
// language course just needs /lesson over and over: solve, click through the
// end screens, SPA-navigate back to /lesson. Posts state after every lesson.
// Stop: __lang.running = false, or totalXp >= __lang.target.
(async () => {
  if (window.__lang && __lang.running) return;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const L = window.__lang = { running: true, target: 250000, lessons: 0, xp0: null, xp: null, trail: [], miss: [], started: Date.now() };
  const nav = u => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); };
  const challenge = () => document.querySelector('[data-test^="challenge "], [data-test="stories-player-continue"], [data-test="stories-player-done"], [data-test="stories-element"]');
  const next = () => document.querySelector('[data-test="player-next"]');
  const uid = () => JSON.parse(atob(document.cookie.split('; ').find(c => c.startsWith('jwt_token=')).split('=')[1].split('.')[1])).sub;
  const xp = async () => { try { const u = await (await fetch(`/2017-06-30/users/${uid()}?fields=totalXp,streak`)).json(); return u.totalXp; } catch (e) { return null; } };
  const post = async () => fetch('http://127.0.0.1:8777/lang', { method: 'POST', body: JSON.stringify({
    at: new Date().toISOString(), href: location.href, visible: document.visibilityState, running: L.running,
    lessons: L.lessons, cursor: L.cursor, xp0: L.xp0, xp: L.xp, trail: L.trail.slice(-40), miss: L.miss.slice(-10) }) }).catch(() => {});
  try { const ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain();   // anti-throttle tone
    g.gain.value = 0.001; o.frequency.value = 40; o.connect(g); g.connect(ac.destination); o.start();
    const kick = () => ac.state !== 'running' && ac.resume().catch(() => {}); kick(); setInterval(kick, 60e3); } catch (e) {}
  L.xp0 = L.xp = await xp();
  setInterval(post, 60e3);
  // Walk the tree by URL (/lesson/unit/U/level/L) instead of taking whatever
  // /lesson serves next: duo_radio nodes need audio, so they are skipped.
  // Cursor in localStorage.langCursor = {unit, level, n}; a level is opened up
  // to 6 times (5 lessons + slack) before moving on. ponytail: no completion
  // detection, extra opens are just practice XP.
  const tree = async () => {
    if (!location.pathname.startsWith('/learn')) { nav('/learn'); await sleep(3500); }
    const out = [];
    for (const u of document.querySelectorAll('[data-test^="skill-path-unit-"]')) {
      const unit = +u.dataset.test.replace('skill-path-unit-', '');
      for (const l of u.querySelectorAll('[data-test^="skill-path-level-"]')) {
        const m = l.dataset.test.match(/skill-path-level-(\d+) skill-path-level-(\w+)/); if (!m) continue;
        if (m[2] !== 'duo_radio') out.push({ unit, level: +m[1], type: m[2] });
      }
    }
    return out;
  };
  const open = async () => {
    const list = await tree(); if (!list.length) return false;
    let cur = JSON.parse(localStorage.langCursor || 'null');
    let i = cur ? list.findIndex(e => e.unit === cur.unit && e.level === cur.level) : 0;
    if (i < 0) { i = list.findIndex(e => e.unit > (cur ? cur.unit : -1)); if (i < 0) i = 0; cur = null; }
    if (cur && cur.n >= 6) { i++; cur = null; if (i >= list.length) { nav('/learn'); await sleep(3000); return false; } }
    const e = list[i]; cur = cur || { unit: e.unit, level: e.level, n: 0 }; cur.n++;
    localStorage.langCursor = JSON.stringify(cur); L.cursor = cur;
    nav('/lesson/unit/' + e.unit + '/level/' + e.level);
    for (let i = 0; i < 25 && !challenge(); i++) await sleep(1000);
    return !!challenge();
  };
  let stalls = 0;
  while (L.running) {
    if (L.xp !== null && L.xp >= L.target) { L.trail.push('target'); L.running = false; break; }
    if (!challenge() && !next()) { if (!(await open())) { L.trail.push('open-fail'); if (++stalls > 5) { L.running = false; break; } continue; } }
    stalls = 0;
    const t0 = Date.now(); let ended = false;
    while (L.running && Date.now() - t0 < 10 * 60e3) {              // one lesson
      if (!location.pathname.startsWith('/lesson')) { ended = true; break; }
      const r = __duo.read();
      if (document.querySelector('[data-test="stories-player-continue"], [data-test="stories-player-done"], [data-test="stories-element"]')) {   // story node
        let idle = 0;
        while (L.running && document.querySelector('[data-test="stories-player-continue"], [data-test="stories-player-done"], [data-test="stories-element"]') && Date.now() - t0 < 10 * 60e3) {
          const s = await __duo.storyStep();
          if (s && s !== 'cont') L.trail.push(s);
          if (!s) { if (++idle === 8) { L.miss.push({ story: __duo.storyDump() }); } if (idle > 120) { const q = document.querySelector('[data-test="close-button-stories"], [data-test="quit-button"]'); if (q) q.click(); await sleep(1000); const y = [...document.querySelectorAll('button')].find(b => /END SESSION|QUIT/i.test(b.innerText)); if (y) y.click(); L.trail.push('story-abort'); break; } await sleep(500); } else idle = 0;
        }
        for (let i = 0; i < 8 && next(); i++) { next().click(); await sleep(1200); }
        ended = true; break;
      }
      if (!r.type) {
        if (next()) { const txt = document.body.innerText; next().click(); await sleep(1200); if (/TOTAL XP|Word wizard|Lesson complete|lesson/i.test(txt) && !challenge()) { ended = true; } if (ended) { for (let i = 0; i < 6 && next(); i++) { next().click(); await sleep(1200); } break; } continue; }
        await sleep(1000); continue;
      }
      const c = __duo.chal();
      let via = null; try { via = await __duo.solveLang(); } catch (e) { via = 'ERR:' + e.message; }
      if (!via && c) L.miss.push({ type: c.type, keys: Object.keys(c).filter(k => /correct|solution|token|pair|choice|display/i.test(k)) });
      const res = await __duo.run(15);
      L.trail.push(...(res.trail || []).map(t => typeof t === 'string' ? t : (t.was || t.stop || 'x')));
      if (res.halted && !(res.halted.stop === 'manual' && !res.halted.type)) {
        if (res.halted.stop === 'manual') { const s = document.querySelector('[data-test="player-skip"]'); if (s) { s.click(); await sleep(800); L.trail.push('skip'); continue; } }
        { const sk = document.querySelector('[data-test="player-skip"]'); if (sk) { sk.click(); await sleep(800); L.trail.push('skip:' + res.halted.stop); continue; } }   // ponytail: unknown shape → skip, never stall
        L.trail.push('halt:' + res.halted.stop); await sleep(3000);
        if (res.halted.stop === 'no hearts') { L.running = false; break; }
        if (++stalls > 4) { ended = true; break; }
      }
      await sleep(400);
    }
    L.lessons += ended ? 1 : 0; L.xp = await xp(); await post();
    if (L.trail.length > 400) L.trail = L.trail.slice(-200);
  }
  await post();
})();
