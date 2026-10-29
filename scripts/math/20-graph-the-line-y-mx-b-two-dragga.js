
// pairs of the SAME line in two forms: standard "ax + by = c" and slope-intercept
// "y = mx + b". Reduce both to (m, b) and match numerically.
Object.assign(window.__duo, {
  lineMB(s) {
    const t = this.ascii(s).replace(/mathbf|textbf|text|\\|~|\s/g, '');
    // slope-intercept (handles \frac via formulaAB)
    if (/^y=/.test(t.replace(/[{}]/g, ''))) { const ab = this.formulaAB(s); if (ab) return [ab.m, ab.b]; }
    // standard form: ax + by = c
    const m = t.replace(/[{}]/g, '').match(/^(-?\d*)x([+-]\d*)y=(-?\d+)$/);
    if (m) {
      const a = m[1] === '' ? 1 : (m[1] === '-' ? -1 : +m[1]);
      const b = m[2] === '+' ? 1 : (m[2] === '-' ? -1 : +m[2]);
      const c = +m[3];
      if (!b) return null;
      return [-a / b, c / b];
    }
    const ab = this.formulaAB(s);
    return ab ? [ab.m, ab.b] : null;
  },

  async linePairs() {
    const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    if (tk.length < 4) return null;
    const mb = tk.map(e => { const a = e.querySelector('annotation'); return this.lineMB(a ? a.textContent : e.innerText); });
    const done = e => /_2wryV/.test(String(e.className));
    const used = new Set(); let n = 0;
    for (let i = 0; i < tk.length; i++) {
      if (used.has(i) || done(tk[i]) || !mb[i]) continue;
      const j = mb.findIndex((v, k) => k !== i && !used.has(k) && !done(tk[k]) && v
        && Math.abs(v[0] - mb[i][0]) < 1e-9 && Math.abs(v[1] - mb[i][1]) < 1e-9);
      if (j < 0) continue;
      used.add(i); used.add(j); n++;
      this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
    }
    return n ? { pairs: n } : null;
  },
});


// Tap tokens are real <button>s and respond to the NATIVE el.click(), while the
// synthetic pointer+mouse sequence is ignored on some screens. Worse, when both
// register the token toggles twice and nets out — which is what left pairs screens
// looping "p1,p1,p1...". For a button, use the native click alone.
(function () {
  const base = window.__duo.tap;
  window.__duo.tap = function (el) {
    if (!el) return false;
    if (el.tagName === 'BUTTON' && typeof el.click === 'function') { el.click(); return true; }
    return base.call(this, el);
  };
})();
;'__duo ready';

// "Select the slope-intercept form" of a standard-form equation: reduce both the
// prompt and every choice to (m, b) and match.
window.__duo.solveLineForm = function () {
  let src = null;
  for (const s of this.promptLatex().slice().reverse()) {
    if (!/=/.test(this.ascii(s))) continue;
    const v = this.lineMB(s); if (v) { src = v; break; }
  }
  if (!src) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const hits = [];
  S.forEach((s, i) => {
    const v = this.lineMB(s);
    if (v && Math.abs(v[0] - src[0]) < 1e-9 && Math.abs(v[1] - src[1]) < 1e-9) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0], want: src.join(',') } : null;
};
window.__duo.RULES.splice(2, 0,
  ['solveLineForm', /slope-intercept|standard form|equivalent equation|same line/i]);
;'__duo ready';

// Deriving (m, b) with regexes breaks on a fractional intercept
// ("y = -\frac{5}{2}x + \frac{1}{2}" read b as 0). compile() already understands
// \frac, so evaluate instead: m = f(1) - f(0), b = f(0).
(function () {
  const base = window.__duo.formulaAB;
  window.__duo.formulaAB = function (s) {
    const f = this.compile(s);
    if (f) {
      try {
        const b = f(0), m = f(1) - f(0);
        if (isFinite(b) && isFinite(m) && Math.abs((f(2) - f(0)) - 2 * m) < 1e-9) return { m, b };
      } catch (e) {}
    }
    return base.call(this, s);
  };
})();
;'__duo ready';

// typed slope / y-intercept from any line form, standard included


// "Create a slope of 1" is the same task as "create a line with rate of change m"
(function () {
  const base = window.__duo.targetSlope;
  window.__duo.targetSlope = function () {
    const v = base.call(this);
    if (v !== null && v !== undefined) return v;
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ');
    const m = A.match(/create a slope of\s*(-?\d+(?:\.\d+)?)/i)
      || A.match(/slope of\s*(-?\d+(?:\.\d+)?)/i);
    return m ? parseFloat(m[1]) : null;
  };
})();
;'__duo ready';

// "Create a slope of 1" drives a \duodisplay slider too. Here the duodisplay holds
// the whole slope (slope = \frac{1-1}{2} = \duodisplay{..}{..}), not a numerator,
// so the denominator scaling must not apply — it only does when the duodisplay sits
// inside the numerator of a \frac.
(function () {
  const base = window.__duo.duoGoal;
  window.__duo.duoGoal = function () {
    const g = base.call(this);
    if (g) return g;
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ')
      .replace(/\s+/g, ' ').toLowerCase();
    const m = A.match(/create a slope of\s*(-?[\d.]+)/);
    if (m) return { kind: 'eq', v: parseFloat(m[1]) };
    if (/create a negative slope/.test(A)) return { kind: 'neg' };
    if (/create a positive slope/.test(A)) return { kind: 'pos' };
    return null;
  };
})();
;'__duo ready';

// ---- "Graph the line y = mx + b" (two draggable points) ----
// Reuses the closed-loop calibration: drag, read the component's GRID coords back,
// work out pixels-per-unit from what actually moved.
Object.assign(window.__duo, {
  dragComponents() {
    const d = this.diagram(); if (!d || !d.M.components) return [];
    const inner = d.M.components.components;
    const arr = Array.isArray(inner) ? inner
      : (inner && inner.values ? [...inner.values()] : Object.values(inner || {}));
    return arr.filter(c => c && typeof c.x === 'number' && typeof c.y === 'number' && '_targetX' in c)
      .map(P => ({ f: d.f, P, el: P.element }))
      .filter(o => o.el);
  },

  async moveComponent(o, want) {
    let px = 45, py = -45;
    const centre = () => {
      const fr = o.f.getBoundingClientRect(), r = o.el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
    };
    for (let k = 0; k < 8; k++) {
      const cur = [o.P.x, o.P.y];
      if (cur[0] === null || cur[1] === null) return false;
      if (cur[0] === want[0] && cur[1] === want[1]) return true;
      const from = centre(); if (!from) return false;
      const to = [Math.round(from[0] + (want[0] - cur[0]) * px),
                  Math.round(from[1] + (want[1] - cur[1]) * py)];
      await this.dragXY(o.el, o.f, from, to);
      const after = [o.P.x, o.P.y];
      if (after[0] === null || after[1] === null) return false;
      if (after[0] !== cur[0]) px = (to[0] - from[0]) / (after[0] - cur[0]);
      if (after[1] !== cur[1]) py = (to[1] - from[1]) / (after[1] - cur[1]);
      if (after[0] === cur[0] && after[1] === cur[1]) { px *= 1.5; py *= 1.5; }
    }
    return o.P.x === want[0] && o.P.y === want[1];
  },

  async solveGraphLine() {
    const comps = this.dragComponents();
    if (comps.length !== 2) return false;
    let f = null;
    for (const s of this.promptLatex().slice().reverse()) {
      if (!/=/.test(this.ascii(s))) continue;
      const ab = this.formulaAB(s);
      if (ab) { f = x => ab.m * x + ab.b; break; }
    }
    if (!f) return false;
    const R = this.gridRange() || { lo: -5, hi: 5 };
    const pts = [];
    for (let x = R.lo; x <= R.hi && pts.length < 2; x++) {
      const y = f(x);
      if (Number.isInteger(y) && y >= R.lo && y <= R.hi) pts.push([x, y]);
    }
    if (pts.length < 2) return false;
    // move the nearer component to each target so they do not swap places
    comps.sort((a, b) => a.P.x - b.P.x);
    const ok1 = await this.moveComponent(comps[0], pts[0]);
    const ok2 = await this.moveComponent(comps[1], pts[1]);
    return ok1 && ok2;
  },
});
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.dragComponents().length === 2 && /graph the line/i.test(this.tex())) {
      if (await this.solveGraphLine()) return true;
    }
    return await base.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.dragComponents().length === 2 && /graph the line/i.test(this.tex()))
      return { kind: 'graphline', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// ---- "Plot the intersection point" (unit 147: systems) ----
// Two equations in the prompt and one draggable point: solve the system and move
// the point there.
Object.assign(window.__duo, {
  intersection() {
    const lines = [];
    for (const s of this.promptLatex()) {
      if (!/=/.test(this.ascii(s))) continue;
      const mb = this.lineMB(s);
      if (mb) lines.push(mb);
    }
    if (lines.length < 2) return null;
    const [[m1, b1], [m2, b2]] = lines;
    if (Math.abs(m1 - m2) < 1e-9) return null;      // parallel: no intersection
    const x = (b2 - b1) / (m1 - m2);
    return [Math.round(x * 2) / 2, Math.round((m1 * x + b1) * 2) / 2];
  },

  async solveIntersection() {
    const want = this.intersection(); if (!want) return false;
    const comps = this.dragComponents(); if (comps.length !== 1) return false;
    return await this.moveComponent(comps[0], want);
  },
});
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.intersection() && this.dragComponents().length === 1) {
      if (await this.solveIntersection()) return true;
    }
    return await base.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.intersection() && this.dragComponents().length === 1)
      return { kind: 'intersect', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// a system arrives as ONE latex entry with the equations separated by \\ ,
// so scanning entry-by-entry finds no line at all
(function () {
  const base = window.__duo.intersection;
  window.__duo.intersection = function () {
    const r = base.call(this);
    if (r) return r;
    const lines = [];
    for (const s of this.promptLatex()) {
      for (const part of this.ascii(s).split(/\\\\/)) {
        if (!/=/.test(part)) continue;
        const mb = this.lineMB(part);
        if (mb) lines.push(mb);
      }
    }
    if (lines.length < 2) return null;
    const [[m1, b1], [m2, b2]] = lines;
    if (Math.abs(m1 - m2) < 1e-9) return null;
    const x = (b2 - b1) / (m1 - m2);
    return [Math.round(x * 2) / 2, Math.round((m1 * x + b1) * 2) / 2];
  };
})();
;'__duo ready';

// "Select the intersection point" — same solve, ordered-pair choices. Falls back to
// reading the crossing off the drawn lines when the equations are not given.
window.__duo.solveIntersectionChoice = function () {
  let want = this.intersection();
  if (!want) {
    const P = this.gridPoints();
    if (P && P.length === 1) want = P[0];
  }
  if (!want) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const pair = s => {
    const m = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '').match(/\((-?[\d.]+),(-?[\d.]+)\)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  };
  const i = S.findIndex(s => { const q = pair(s); return q && q[0] === want[0] && q[1] === want[1]; });
  return i < 0 ? { miss: want.join(',') } : { i, want: want.join(',') };
};
window.__duo.RULES.splice(2, 0, ['solveIntersectionChoice', /intersection|solution to the system|system of equations/i]);
;'__duo ready';

// "Select the equation to find the intersection point": the answer sets the two
// right-hand sides equal to each other, e.g. 2x+4 = -x-5.
window.__duo.solveSystemSetup = function () {
  const rhs = [];
  for (const s of this.promptLatex()) {
    for (const part of this.ascii(s).split(/\\\\/)) {
      const m = part.replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '').match(/^(?:begin\(?aligned\)?)?y&?=(.+?)(?:end.*)?$/);
      if (m && /x/.test(m[1])) rhs.push(m[1]);
    }
  }
  if (rhs.length < 2) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  // the right choice has an x on BOTH sides and no lone y
  const i = S.findIndex(s => {
    const t = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    if (/^y=/.test(t) || !t.includes('=')) return false;
    const [l, r] = t.split('=');
    return /x/.test(l) && /x/.test(r);
  });
  return i < 0 ? { miss: rhs.join('=') } : { i, want: rhs.join('=') };
};
window.__duo.RULES.splice(2, 0, ['solveSystemSetup', /equation to find the intersection|set.*equal/i]);
;'__duo ready';

// a system is usually wrapped in \begin{aligned} ... \end{aligned} with "&=" as the
// separator, which defeats the plain "y = ..." parse
(function () {
  const base = window.__duo.lineMB;
  window.__duo.lineMB = function (s) {
    const v = base.call(this, s);
    if (v) return v;
    const cleaned = this.ascii(s)
      .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ' ')
      .replace(/&/g, '');
    return cleaned === this.ascii(s) ? null : base.call(this, cleaned);
  };
  const baseInt = window.__duo.intersection;
  window.__duo.intersection = function () {
    const r = baseInt.call(this); if (r) return r;
    const lines = [];
    for (const s of this.promptLatex()) {
      const flat = this.ascii(s).replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ' ').replace(/&/g, '');
      for (const part of flat.split(/\\\\/)) {
        if (!/=/.test(part)) continue;
        const mb = this.lineMB(part);
        if (mb) lines.push(mb);
      }
    }
    if (lines.length < 2) return null;
    const [[m1, b1], [m2, b2]] = lines;
    if (Math.abs(m1 - m2) < 1e-9) return null;
    const x = (b2 - b1) / (m1 - m2);
    return [Math.round(x * 2) / 2, Math.round((m1 * x + b1) * 2) / 2];
  };
})();
;'__duo ready';

// the two lines of a system are often only DRAWN. pieces() already returns each
// line's endpoints in grid coords, so derive (m, b) per line and solve.
(function () {
  const base = window.__duo.intersection;
  window.__duo.intersection = function () {
    const r = base.call(this); if (r) return r;
    const P = this.pieces();
    if (!P || P.length !== 2) return null;
    const mb = P.map(p => {
      if (p.slope === null) return null;
      return [p.slope, p.lo[1] - p.slope * p.lo[0]];
    });
    if (mb.some(v => !v)) return null;
    const [[m1, b1], [m2, b2]] = mb;
    if (Math.abs(m1 - m2) < 1e-6) return null;
    const x = (b2 - b1) / (m1 - m2);
    const y = m1 * x + b1;
    const rx = Math.round(x), ry = Math.round(y);
    // only trust it if the crossing lands on a lattice point
    if (Math.abs(x - rx) > 0.2 || Math.abs(y - ry) > 0.2) return null;
    return [rx, ry];
  };
})();
;'__duo ready';

// typed system answers: "Enter the x-value / y-value of the intersection"


// ---- "Create a system with N intersections" (unit 147) ----
// Two lines built from four draggable points, and the prompt echoes the live count
// as \duodisplay{...}{current}. Rather than model the geometry, nudge one point and
// read the count back — 1 intersection means non-parallel, 0 means parallel with
// different intercepts, infinity means the same line.
Object.assign(window.__duo, {
  countTarget() {
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ')
      .replace(/\s+/g, ' ').toLowerCase();
    if (!/intersection/.test(A)) return null;
    if (/infinite|infty/.test(A.split('intersection')[0].slice(-24))) return Infinity;
    const m = A.match(/with\s*(\d+)\s*intersection/);
    return m ? +m[1] : null;
  },

  countNow() {
    const t = this.duoTarget(); if (!t) return null;
    const c = this.ascii(t.cur).replace(/[\\{}\s]/g, '');
    if (/infty|∞/.test(c)) return Infinity;
    const v = parseFloat(c);
    return isNaN(v) ? null : v;
  },

  async solveIntersectionCount() {
    const want = this.countTarget(); if (want === null) return false;
    if (this.countNow() === want) return true;
    const comps = this.dragComponents(); if (comps.length < 2) return false;
    // try moving each point by a unit or two until the reported count matches
    for (const o of comps) {
      for (const [dx, dy] of [[0, 1], [0, -1], [0, 2], [1, 1], [0, -2]]) {
        const start = [o.P.x, o.P.y];
        const t = [start[0] + dx, start[1] + dy];
        if (!await this.moveComponent(o, t)) continue;
        await this.sleep(300);
        if (this.countNow() === want) return true;
      }
    }
    return this.countNow() === want;
  },
});
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.countTarget() !== null && this.dragComponents().length >= 2) {
      if (await this.solveIntersectionCount()) return true;
    }
    return await base.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.countTarget() !== null && this.dragComponents().length >= 2)
      return { kind: 'intercount', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';
