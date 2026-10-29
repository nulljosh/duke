
// "Select the number of intersections": two drawn lines cross once unless their
// slopes match — same slope and same intercept is the whole line (infinite),
// same slope and different intercept is none.
window.__duo.solveIntersectionCountChoice = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/number of intersection|how many.*intersect|how many solutions/.test(A)) return null;
  let n = null;
  const live = this.countNow();
  if (live !== null) n = live;
  if (n === null) {
    const P = this.pieces();
    if (!P || P.length !== 2) return null;
    const mb = P.map(p => p.slope === null ? null : [p.slope, p.lo[1] - p.slope * p.lo[0]]);
    if (mb.some(v => !v)) return null;
    const sameM = Math.abs(mb[0][0] - mb[1][0]) < 0.05;
    const sameB = Math.abs(mb[0][1] - mb[1][1]) < 0.15;
    n = sameM ? (sameB ? Infinity : 0) : 1;
  }
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).replace(/\s/g, '').toLowerCase());
  const i = S.findIndex(s => n === Infinity ? /infinite|infty|∞/.test(s) : parseFloat(s) === n);
  return i < 0 ? { miss: String(n) } : { i, want: String(n) };
};
window.__duo.RULES.splice(2, 0, ['solveIntersectionCountChoice', /number of intersection|how many/i]);
;'__duo ready';

// Counting intersections from EQUATIONS, including vertical lines (x = 2), which
// lineMB cannot express: a vertical always meets a non-vertical exactly once.
window.__duo.systemCount = function () {
  const eqs = [];
  for (const s of this.promptLatex()) {
    const flat = this.ascii(s).replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ' ').replace(/&/g, '');
    for (const part of flat.split(/\\\\/)) {
      if (!/=/.test(part)) continue;
      const t = part.replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
      const v = t.match(/^x=(-?[\d.]+)$/);
      if (v) { eqs.push({ vert: true, c: parseFloat(v[1]) }); continue; }
      const mb = this.lineMB(part);
      if (mb) eqs.push({ vert: false, m: mb[0], b: mb[1] });
    }
  }
  if (eqs.length !== 2) return null;
  const [a, b] = eqs;
  if (a.vert && b.vert) return Math.abs(a.c - b.c) < 1e-9 ? Infinity : 0;
  if (a.vert || b.vert) return 1;
  if (Math.abs(a.m - b.m) > 1e-9) return 1;
  return Math.abs(a.b - b.b) < 1e-9 ? Infinity : 0;
};


// choice innerText is DOUBLED ("1" comes back as "11"), so parseFloat reads 11
(function () {
  const half = s => {
    const t = String(s).replace(/\s/g, '');
    return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2))
      ? t.slice(0, t.length / 2) : t;
  };
  const base = window.__duo.solveIntersectionCountChoice;
  window.__duo.solveIntersectionCountChoice = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    let n = this.countNow();
    if (n === null) n = this.systemCount();
    if (n === null || n === undefined) return r;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const S = ch.map(e => half(this.ascii(e.innerText)).toLowerCase());
    const i = S.findIndex(s => n === Infinity ? /infinite|infty|∞/.test(s) : parseFloat(s) === n);
    return i < 0 ? { miss: String(n) } : { i, want: String(n) };
  };
})();
;'__duo ready';

window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveIntersectionCountChoice');
window.__duo.RULES.splice(2, 0,
  ['solveIntersectionCountChoice', /number of intersection|number of solutions|how many/i]);
;'__duo ready';

// "Enter the x-/y-COORDINATE of the intersection point" — another phrasing


// "Enter the number of intersections" — typed count. Must sit ABOVE the generic
// typed handlers, which otherwise answer with a coordinate.


// ---- two-variable inequalities (unit 148) ----
// "Select a solution to the inequality y >= -x": test each ordered-pair choice.
Object.assign(window.__duo, {
  ineq2(s) {
    const t = this.ineqNorm(s);
    const m = t.match(/^y(<=|>=|<|>)(.+)$/); if (!m) return null;
    const f = this.compile(m[2]); if (!f) return null;
    const op = m[1];
    return (x, y) => {
      let v; try { v = f(x); } catch (e) { return false; }
      if (!isFinite(v)) return false;
      return op === '<=' ? y <= v : (op === '>=' ? y >= v : (op === '<' ? y < v : y > v));
    };
  },

  solveIneq2Point() {
    let test = null;
    for (const s of this.promptLatex().slice().reverse()) {
      const t = this.ineq2(s); if (t) { test = t; break; }
    }
    if (!test) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const pair = s => {
      const m = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '').match(/\((-?[\d.]+),(-?[\d.]+)\)/);
      return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
    };
    const hits = [];
    S.forEach((s, i) => { const q = pair(s); if (q && test(q[0], q[1])) hits.push(i); });
    return hits.length === 1 ? { i: hits[0] } : (hits.length ? { i: hits[0] } : { miss: 'none' });
  },
});
window.__duo.RULES.splice(2, 0, ['solveIneq2Point', /solution to the inequality|satisfies the inequality/i]);
;'__duo ready';

// "Graph the inequality" in two variables: place the two points on the BOUNDARY
// line (y = mx + b from the inequality), same as graphing the line.


// "Select the solution" given an inequality and a value for x: substitute and
// compare against the choices, which are themselves inequalities in y.
window.__duo.solveIneq2Substitute = function () {
  let op = null, f = null, xv = null;
  // the inequality and the x value usually share ONE latex entry, separated by \\
  const parts = [];
  for (const s of this.promptLatex()) for (const p of this.ascii(s).split(/\\\\/)) parts.push(p);
  for (const s of parts) {
    const t = this.ineqNorm(s);
    const m = t.match(/^y(<=|>=|<|>)(.+)$/);
    if (m) { const g = this.compile(m[2]); if (g) { op = m[1]; f = g; continue; } }
    const v = t.match(/^x=(-?[\d.]+)$/);
    if (v) xv = parseFloat(v[1]);
  }
  if (!f || xv === null) return null;
  let want; try { want = f(xv); } catch (e) { return null; }
  if (!isFinite(want)) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const i = S.findIndex(s => {
    const m = this.ineqNorm(s).match(/^y(<=|>=|<|>)(-?[\d.]+)$/);
    return m && m[1] === op && Math.abs(parseFloat(m[2]) - want) < 1e-9;
  });
  return i < 0 ? { miss: op + want } : { i, want: op + want };
};
window.__duo.RULES.splice(2, 0, ['solveIneq2Substitute', /select the solution/i]);
;'__duo ready';

// "Graph the inequalities" (plural): FOUR draggable points forming two boundary
// lines. Pair the points into two lines by their current grouping, then place each
// pair on its own boundary.
(function () {
  const base = window.__duo.solveGraphLine;
  window.__duo.solveGraphLine = async function () {
    const comps = this.dragComponents();
    if (comps.length !== 4) return base.call(this);
    const mbs = [];
    for (const s of this.promptLatex()) {
      for (const part of this.ascii(s).split(/\\\\/)) {
        const t = this.ineqNorm(part);
        const m = t.match(/^y(?:<=|>=|<|>)(.+)$/);
        if (!m) continue;
        const v = this.lineMB('y=' + m[1]);
        if (v) mbs.push(v);
      }
    }
    if (mbs.length !== 2) return base.call(this);
    const R = this.gridRange() || { lo: -5, hi: 5 };
    const ptsFor = mb => {
      const out = [];
      for (let x = R.lo; x <= R.hi && out.length < 2; x++) {
        const y = mb[0] * x + mb[1];
        if (Number.isInteger(y) && y >= R.lo && y <= R.hi) out.push([x, y]);
      }
      return out;
    };
    // the components arrive in LINE order (line 1's two points, then line 2's), so
    // do not re-sort them — regrouping by position mixes the two boundaries and the
    // widget still tracks which point belongs to which line
    const groups = [[comps[0], comps[1]], [comps[2], comps[3]]];
    let ok = true;
    for (let g = 0; g < 2; g++) {
      const pts = ptsFor(mbs[g]);
      if (pts.length < 2) return false;
      const pair = groups[g].slice().sort((a, b) => a.P.x - b.P.x);
      ok = (await this.moveComponent(pair[0], pts[0])) && ok;
      ok = (await this.moveComponent(pair[1], pts[1])) && ok;
    }
    return ok;
  };
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.dragComponents().length === 4 && /inequalit/i.test(this.tex())) {
      if (await this.solveGraphLine()) return true;
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.dragComponents().length === 4 && /inequalit/i.test(this.tex()))
      return { kind: 'graphineq2', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// the plot gate used prompt(), which returns the FORMULA line rather than the
// "Plot the y-intercept" header — gate on the widget plus a computable target
(function () {
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.plotTarget() && (this.onePoint() || this.dragComponents().length === 1))
      return { kind: 'plot', from: [0, 0], to: [0, 0] };
    return null;
  };
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.plotTarget()) {
      const comps = this.dragComponents();
      if (comps.length === 1) { if (await this.moveComponent(comps[0], this.plotTarget())) return true; }
      if (await this.solvePlotPoint()) return true;
    }
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// ---- exponent-law pairs (unit 149) ----
// "x^2 \cdot x^5" <-> "x^{2+5}". Evaluate both at a couple of sample bases rather
// than modelling the law, so product/quotient/power forms all work.
Object.assign(window.__duo, {
  powVal(s) {
    let t = this.ascii(s)
      .replace(/\\(mathbf|textbf|text)\s*/g, '')
      .replace(/\\cdot|\\times/g, '*')
      // "16\pi" vs "\pi r^2": pi cancels on both sides, so drop it.
      .replace(/\\pi/g, '(3.141592653589793)')
      .replace(/\\left|\\right/g, '')
      .replace(/[~\s]/g, '');
    for (let i = 0; i < 4; i++) {
      const m = t.match(/^\{(.*)\}$/); if (!m) break; t = m[1];
    }
    t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
         .replace(/\^\{([^{}]*)\}/g, '**($1)')
         .replace(/\^(-?\d+)/g, '**($1)');
    if (/\\|\{|\}/.test(t)) return null;
    if (!/^[-+*/().0-9x]|\*\*/.test(t)) return null;
    if (!/^[-+*/().0-9x]*$/.test(t.replace(/\*\*/g, '*'))) return null;
    try {
      const f = Function('x', '"use strict";return (' + t + ')');
      const a = f(2), b = f(3);
      return (isFinite(a) && isFinite(b)) ? a + '|' + b : null;
    } catch (e) { return null; }
  },

  async powPairs() {
    const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    if (tk.length < 4) return null;
    const val = tk.map(e => { const a = e.querySelector('annotation'); return this.powVal(a ? a.textContent : e.innerText); });
    const done = e => /_2wryV/.test(String(e.className));
    const used = new Set(); let n = 0;
    for (let i = 0; i < tk.length; i++) {
      if (used.has(i) || done(tk[i]) || !val[i]) continue;
      const j = val.findIndex((v, k) => k !== i && !used.has(k) && !done(tk[k]) && v === val[i]);
      if (j < 0) continue;
      used.add(i); used.add(j); n++;
      this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
    }
    return n ? { pairs: n } : null;
  },
});


// ---- brute-force pairs fallback ----
// Every new unit brings a new pairing rule, and each one used to stall the loop
// until a solver was written. Match-the-pairs has no penalty for a wrong guess —
// the tokens simply do not stick — so just try combinations until they all latch.
// This removes the whole class of pairs stalls.
window.__duo.bruteForcePairs = async function () {
  const all = () => [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
  const done = e => /_2wryV/.test(String(e.className));
  if (all().length < 4) return null;
  let matched = 0;
  for (let pass = 0; pass < 3; pass++) {
    const tk = all();
    const open = tk.map((e, i) => done(e) ? -1 : i).filter(i => i >= 0);
    if (!open.length) break;
    let progressed = false;
    for (let a = 0; a < open.length; a++) {
      for (let b = a + 1; b < open.length; b++) {
        const cur = all();
        if (done(cur[open[a]]) || done(cur[open[b]])) continue;
        const before = all().filter(done).length;
        this.tap(cur[open[a]]); await this.sleep(120);
        this.tap(cur[open[b]]); await this.sleep(300);
        const after = all().filter(done).length;
        if (after > before) { matched++; progressed = true; }
        else {
          // clear any lingering selection so the next try starts clean
          this.tap(all()[open[a]]); await this.sleep(90);
        }
      }
    }
    if (!progressed) break;
  }
  return matched ? { pairs: matched } : null;
};
(function () {
  const base = window.__duo.ineqPairs;
  window.__duo.ineqPairs = async function () {
    const solved = () => [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')]
      .filter(e => /_2wryV/.test(String(e.className))).length;
    const before = solved();
    let r = await base.call(this);
    if (solved() === before) r = await this.bruteForcePairs();
    await this.sleep(300);
    return solved() > before ? (r || { pairs: 1 }) : null;
  };
})();
;'__duo ready';

// \duoblank{...} holds the answer verbatim, but a lazy [^}]* capture truncates it
// at the first closing brace of a nested \frac. Extract with balanced braces, then
// match a choice by normalised text — this covers a lot of screens for free.
Object.assign(window.__duo, {
  blankRaw() {
    const src = this.promptLatex().join(' ');
    const key = '\\duoblank{';
    const at = src.lastIndexOf(key);
    if (at < 0) return null;
    let i = at + key.length, depth = 1, out = '';
    while (i < src.length && depth) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) break; }
      out += c; i++;
    }
    return depth === 0 ? out : null;
  },

  solveBlankChoice() {
    const raw = this.blankRaw(); if (!raw) return null;
    const norm = s => this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '')
      .replace(/[~\s{}]/g, '').replace(/\\cdot/g, '*');
    const want = norm(raw);
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    let i = S.findIndex(s => norm(s) === want);
    if (i < 0) {
      // fall back to numeric equality, so 1/10+7/10 also matches 8/10
      const v = this.evalExpr(raw.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))'));
      if (v !== null) i = S.findIndex(s => {
        const w = this.evalExpr(this.ascii(s).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))'));
        return w !== null && Math.abs(w - v) < 1e-9;
      });
    }
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solveBlankChoice', null]);
;'__duo ready';

// ---- never let an unsolved DRAG screen stall the lesson ----
// Choice screens guess and typed screens type "0"; drag screens still logged
// 'needdrag' and broke out, which is the last remaining hard stall. Pressing CHECK
// anyway gets the answer graded and replaced — same trade as the other fallbacks,
// bounded by run2's 2-wrong halt.
(function () {
  let src = String(window.__duo.run2);
  const patched = src.replace(/this\.S\.log\.push\('needdrag'\);\s*break;/,
    `this.S.log.push('needdrag');
     this.S.dragGuesses = (this.S.dragGuesses || 0) + 1;
     if (this.S.dragGuesses > 2) break;
     this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1500);
     const bg = await this.blame(); this.S.log.push(bg || 'noblame');
     if (bg === 'incorrect' && ++miss >= 2) { this.S.log.push('halt:2wrong'); break; }
     const cg = document.querySelector('[data-test="player-next"]');
     if (cg && /CONTINUE/i.test(cg.innerText)) { this.tap(cg); await this.sleep(1400); }
     info = 0; continue;`);
  if (patched !== src) window.__duo.run2 = eval('(' + patched + ')');
  else console.warn('[duo] needdrag fallback did not apply');
})();
(function () {
  const base = window.__duo.autoLesson;
  window.__duo.autoLesson = async function () {
    this.S.dragGuesses = 0;
    return base.call(this);
  };
})();
;'__duo ready';
