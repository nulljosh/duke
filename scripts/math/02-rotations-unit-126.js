
// ---- rotations (unit 126) ----
Object.assign(window.__duo, {
  // \, is a thin space: strip it BEFORE dropping backslashes, or "(6,\,0)"
  // becomes "(6,,0)" and every coordinate regex misses it.
  tex() {
    return this.ascii(this.read().latex.join(' '))
      .replace(/\\[,;!:]/g, ' ').replace(/[{}\\]|mathbf|textbf/g, '').replace(/,\s*,/g, ',');
  },

  // degrees from the prompt; plain "clockwise" is the negative direction
  deg(L) {
    const m = L.match(/(\d+)\s*degree/); if (!m) return null;
    const a = +m[1];
    return (/clockwise/.test(L) && !/counterclockwise/.test(L)) ? 360 - a : a;
  },

  centre(L) {
    const i = L.search(/around|about/); if (i < 0) return [0, 0];
    const m = [...L.slice(i).matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)];
    return m.length ? [+m[0][1], +m[0][2]] : [0, 0];
  },

  // where a point must END UP — reflection or rotation, one entry point
  target(src) {
    const L = this.tex();
    if (!/rotat/i.test(L)) return this.reflectPt(src, L);
    const a = this.deg(L); if (a === null) return null;
    const rad = a * Math.PI / 180, cs = Math.round(Math.cos(rad)), sn = Math.round(Math.sin(rad));
    const c = this.centre(L), dx = src[0] - c[0], dy = src[1] - c[1];
    return [Math.round(c[0] + dx * cs - dy * sn), Math.round(c[1] + dx * sn + dy * cs)];
  },

  // valuemax 360 => the slider is an ANGLE, not a count of notches
  rot() {
    const sl = this.sliderPx(0); if (!sl || sl.hi < 180) return null;
    const t = this.duoTarget();
    if (t) { const P = s => s.replace(/[()\s]/g, '').split(',').map(Number);
      const c = P(t.cur), w = P(t.want);
      let a = (Math.atan2(w[1], w[0]) - Math.atan2(c[1], c[0])) * 180 / Math.PI;
      a = Math.round(((a % 360) + 360) % 360);
      return { deg: a, from: sl.from, to: this.sliderPx(a).to }; }
    const a = this.deg(this.tex()); if (a === null) return null;
    return { deg: a, from: sl.from, to: this.sliderPx(a).to };
  },

  plan() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), s = this.scale();
    const dp = d.querySelector('.draggable-point');
    if (dp && s) {
      const p = this.pts(); if (!p || !p.length) return null;
      const src = (p.find(q => /draggable/.test(q[0])) || p[0])[1];
      const t = this.target(src); if (!t) return null;
      const r = dp.getBoundingClientRect();
      return { kind: 'point', src, tgt: t,
        from: [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)],
        to: s.px(t[0], t[1]) };
    }
    const rt = this.rot(); if (rt) return { kind: 'rot', v: rt.deg, from: rt.from, to: rt.to };
    const n = this.notch(); if (!n) return null;
    return { kind: 'slider', v: n.v, from: n.sl.from, to: this.sliderPx(n.v).to };
  },

  // \duoblank{X} carries the answer, exactly like \phantom{X}
  solveDuoblank() {
    const m = this.read().latex.join(' ').match(/\\duoblank\{([^}]*)\}/); if (!m) return null;
    const want = this.clean(m[1]);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === want);
    if (i >= 0) return { i, want };
    if (this.read().input) { this.type(want); return { ok: true, idx: [], want: [want] }; }
    return { miss: want };
  },

  // ghost is the PRE-image; test each candidate centre rather than inverting (I-R)
  solveCenterChoice() {
    const L = this.tex(), a = this.deg(L); if (a === null) return null;
    const rad = a * Math.PI / 180, cs = Math.round(Math.cos(rad)), sn = Math.round(Math.sin(rad));
    const src = this.shapes().concat(this.pts());
    const gh = src.find(s => /ghost/.test(s[0])), so = src.find(s => !/ghost/.test(s[0]));
    if (!gh || !so) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const cand = c.map(e => { const t = this.norm(this.ascii(e.innerText)).match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
      return t ? [+t[1], +t[2]] : null; });
    const hit = (o, g) => cand.findIndex(p => { if (!p) return false;
      const dx = o[0] - p[0], dy = o[1] - p[1];
      return Math.round(p[0] + dx * cs - dy * sn) === g[0] && Math.round(p[1] + dx * sn + dy * cs) === g[1]; });
    let i = hit(gh[1], so[1]); if (i < 0) i = hit(so[1], gh[1]);
    return i < 0 ? { miss: a } : { i, want: cand[i] };
  },

  solveRotChoice() {
    const p = this.pts(); if (!p || p.length < 2) return null;
    const g = p.find(q => /ghost/.test(q[0])), o = p.find(q => !/ghost/.test(q[0]));
    if (!g || !o) return null;
    let a = (Math.atan2(g[1][1], g[1][0]) - Math.atan2(o[1][1], o[1][0])) * 180 / Math.PI;
    a = Math.round(((a % 360) + 360) % 360);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)));
    const i = txt.findIndex(t => t.startsWith(String(a)));
    return i < 0 ? { miss: a } : { i, want: a };
  },

  solveRotPointChoice() {
    const L = this.tex(); if (!/rotat/i.test(L)) return null;
    const a = this.deg(L); if (a === null) return null;
    const rad = a * Math.PI / 180, cs = Math.round(Math.cos(rad)), sn = Math.round(Math.sin(rad));
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const ctext = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    const ctr = this.centre(L), eq = (p, q) => p[0] === q[0] && p[1] === q[1];
    const nums = [...L.matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)].map(x => [+x[1], +x[2]]);
    // the latex also holds the CHOICE labels — those are never the source
    let src = nums.find(n => !eq(n, ctr) && !ctext.includes('(' + n[0] + ',' + n[1] + ')'));
    if (!src) { const p = this.pts(); if (p && p.length) src = (p.find(q => !/ghost/.test(q[0])) || p[0])[1]; }
    if (!src) return null;
    const dx = src[0] - ctr[0], dy = src[1] - ctr[1];
    const want = '(' + Math.round(ctr[0] + dx * cs - dy * sn) + ',' + Math.round(ctr[1] + dx * sn + dy * cs) + ')';
    const i = ctext.indexOf(want);
    return i < 0 ? { miss: want } : { i, want };
  },
});

// Gate every solver on the prompt that owns it: an ungated eager solver answers
// another type's question and gets it wrong. Look them up BY NAME so later
// patches take effect — closures capture the old version.
window.__duo.RULES = [
  ['solveChoicesOrig',      null],
  ['solveDuoblank',         null],
  ['solvePhantomChoice',    /fill in the blank/i],
  ['solveCenterChoice',     /center of the/i],
  ['solveRotChoice',        /transformation of/i],
  ['solveRotPointChoice',   /rotat/i],
  ['solveLineOfReflection', /line of reflection/i],
  ['solveReflectChoice',    /reflect/i],
];
window.__duo.solveChoices = function () {
  const L = this.tex();
  for (const [name, gate] of this.RULES) {
    if (gate && !gate.test(L)) continue;
    let r = null; try { r = this[name] && this[name](); } catch (e) { continue; }
    if (!r) continue;
    if (r.ok) return r;
    if (r.i >= 0) return { want: [String(r.want)], idx: [r.i], ok: true, via: name };
  }
  return null;
};

;'__duo ready';

// "Create the point ..." — no graph, two drop targets and a tile bank.
// Tiles need REAL drags (bank ignores synthetic clicks); re-read the bank
// between each one, the placed tile leaves it and every position shifts.

;'__duo ready';

// The angle slider counts CLOCKWISE degrees, while target() is CCW-positive.
// Two conventions in one question — keep them apart.
// The widget turns in the direction the prompt states; the slider is only how
// far. 270 on a "90 counterclockwise" question was marked incorrect.
window.__duo.sliderDeg = function () {
  const m = this.tex().match(/(\d+)\s*degree/); return m ? +m[1] : null;
};

// duodisplay's first arg is NOT the answer (verified wrong on a 90 CW question),
// so the angle always comes from the prompt.
window.__duo.rot = function () {
  const sl = this.sliderPx(0); if (!sl || sl.hi < 180) return null;
  const a = this.sliderDeg(); if (a === null) return null;
  return { deg: a, from: sl.from, to: this.sliderPx(a).to };
};

// verify the widget actually landed before submitting — windows get resized
window.__duo.after = async function (want) {
  const f = document.querySelector('iframe'), d = f.contentDocument;
  // the POINT is ground truth; the slider's own number has twice meant
  // something other than it looked like
  const p = this.pts(), pt = p && p.length ? (p.find(q => /draggable/.test(q[0])) || p[0])[1] : null;
  const w = Array.isArray(want) ? want.join(',') : String(want);
  let got = pt ? pt.join(',') : null;
  if (!Array.isArray(want)) { const th = d.querySelector('.slider2d-thumb');
    got = th ? String(+th.getAttribute('aria-valuenow')) : got; }
  if (got !== w) return { miss: got, want: w };
  this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1700);
  const bl = ((document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test || '').replace('blame blame-', '');
  const n = document.querySelector('[data-test="player-next"]');
  if (n && /CONTINUE/i.test(n.innerText)) { this.tap(n); await this.sleep(1500); }
  this.run2(18);
  return { bl };
};

;'__duo ready';

// text inputs were going straight to the grader, skipping the latex answers

;'__duo ready';

// ---- translations + composite transforms (unit 127) ----
Object.assign(window.__duo, {
  // "over the y-axis" is the line x=0 — easy to get backwards
  reflectPt(p, L) {
    if (/y\s*-?\s*axis/i.test(L)) return [-p[0], p[1]];
    if (/x\s*-?\s*axis/i.test(L)) return [p[0], -p[1]];
    if (/y\s*=\s*-\s*x/.test(L)) return [-p[1], -p[0]];
    if (/y\s*=\s*x/.test(L)) return [p[1], p[0]];
    const m = L.match(/([xy])\s*=\s*(-?\d+)/); if (!m) return null;
    return m[1] === 'y' ? [p[0], 2 * (+m[2]) - p[1]] : [2 * (+m[2]) - p[0], p[1]];
  },

  // A question can chain steps ("2 units up" THEN "reflect over y-axis").
  // Apply them in the order they appear, not just the first match.
  steps(L) {
    const out = [], push = (i, fn) => out.push({ i, fn });
    for (const m of L.matchAll(/(\d+)\s*units?\s*(up|down|left|right)/gi)) {
      const D = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] }[m[2].toLowerCase()], n = +m[1];
      push(m.index, p => [p[0] + D[0] * n, p[1] + D[1] * n]);
    }
    for (const m of L.matchAll(/reflect[^.]*?((?:[xy]\s*-?\s*axis)|(?:y\s*=\s*-?\s*x)|(?:[xy]\s*=\s*-?\d+))/gi)) {
      const spec = m[1]; push(m.index, p => this.reflectPt(p, spec));
    }
    for (const m of L.matchAll(/(\d+)\s*degree/gi)) {
      const a = +m[1], cw = /clockwise/.test(L) && !/counterclockwise/.test(L);
      const rad = (cw ? -a : a) * Math.PI / 180, cs = Math.round(Math.cos(rad)), sn = Math.round(Math.sin(rad));
      const c = this.centre(L);
      push(m.index, p => { const dx = p[0] - c[0], dy = p[1] - c[1];
        return [Math.round(c[0] + dx * cs - dy * sn), Math.round(c[1] + dx * sn + dy * cs)]; });
    }
    return out.sort((a, b) => a.i - b.i);
  },

  target(src) {
    const st = this.steps(this.tex()); if (!st.length) return null;
    let p = src; for (const s of st) { p = s.fn(p); if (!p) return null; }
    return p;
  },

  // The subject is the prompt's own value (latex[1]) — it may ALSO appear as a
  // distractor choice, so "the coordinate that isn't a choice" is not safe.
  subject() {
    const L = this.read().latex;
    for (let i = 1; i < L.length; i++) {
      const s = this.ascii(L[i]).replace(/\\[,;!:]/g, ' ').replace(/[{}\\]|mathbf|textbf/g, '').replace(/,\s*,/g, ',');
      const m = s.match(/^\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*$/); if (m) return [+m[1], +m[2]];
    }
    const p = this.pts(); if (p && p.length) return (p.find(q => !/ghost/.test(q[0])) || p[0])[1];
    return null;
  },

  solveReflectChoice() {
    const L = this.tex();
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const ctext = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    const p = this.pts();
    const src = (p && p.length) ? (p.find(q => !/ghost/.test(q[0])) || p[0])[1] : this.subject();
    if (!src) return null;
    const t = this.reflectPt(src, L); if (!t) return null;
    const want = '(' + t[0] + ',' + t[1] + ')';
    const i = ctext.indexOf(want);
    return i < 0 ? { miss: want, src } : { i, want };
  },

  solveTransChoice() {
    const L = this.tex(); const st = this.steps(L); if (!st.length) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const ctext = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    const p = this.pts();
    const src = (p && p.length) ? (p.find(q => !/ghost/.test(q[0])) || p[0])[1] : this.subject();
    if (!src) return null;
    const t = this.target(src); if (!t) return null;
    const want = '(' + t[0] + ',' + t[1] + ')';
    const i = ctext.indexOf(want);
    return i < 0 ? { miss: want, src } : { i, want };
  },

  // tile builds: no steps left means both slots are filled
  async afterBuild() {
    const b = this.buildPlan(); if (b && b.steps.length) return { left: b.steps };
    this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1800);
    const bl = ((document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test || '').replace('blame blame-', '');
    const n = document.querySelector('[data-test="player-next"]');
    if (n && /CONTINUE/i.test(n.innerText)) { this.tap(n); await this.sleep(1500); }
    this.run2(20); return { bl };
  },
});

window.__duo.RULES.splice(2, 0, ['solveTransChoice', /translat|units? (up|down|left|right)/i]);

;'__duo ready';

// The subject may sit inside the prompt line rather than its own annotation.
// Skip any coordinate after "about"/"around" — that one is the centre.
(function () {
  const prev = window.__duo.subject;
  window.__duo.subject = function () {
    const s = prev.call(this); if (s) return s;
    const L = this.tex(), ci = L.search(/around|about/);
    for (const m of L.matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)) {
      if (ci >= 0 && m.index > ci) continue;
      return [+m[1], +m[2]];
    }
    return null;
  };
})();

window.__duo.buildPlan = function () {
  const p = this.pts();
  const src = (p && p.length) ? (p.find(q => !/ghost/.test(q[0])) || p[0])[1] : this.subject();
  if (!src) return null;
  const t = this.target(src); if (!t) return null;
  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const d = f.contentDocument, fr = f.getBoundingClientRect();
  const box = e => { const r = e.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  const slots = [...d.querySelectorAll('.drop-target-border')].map(box);
  if (slots.length < 2) return null;
  const bank = [...d.querySelectorAll('.token-bank .token')].map(e => ({ v: this.ascii(e.textContent.trim()), xy: box(e) }));
  const used = [], steps = [];
  t.forEach((val, i) => { const tk = bank.find(b => b.v === String(val) && !used.includes(b));
    if (tk) { used.push(tk); steps.push({ from: tk.xy, to: slots[i], val }); } });
  return { src, tgt: t, steps, ok: steps.length === 2 };
};

;'__duo ready';
