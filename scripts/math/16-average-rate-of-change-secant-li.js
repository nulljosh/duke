
// typed variants of the delta / rate questions ("Enter the change in y ...")


// ---- average rate of change / secant lines (unit 141 L4) ----
// "Identify the points on the secant line": each choice lists two ordered pairs;
// pick the one whose pairs are the points actually plotted.
window.__duo.solveIdentifyPoints = function () {
  const p = this.gridPoints(); if (!p || p.length < 2) return null;
  const key = a => a.map(q => q[0] + ',' + q[1]).sort().join(' ');
  const want = key(p);
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const pairsOf = s => {
    const out = []; let m;
    const re = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
    const t = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    while ((m = re.exec(t))) out.push([+m[1], +m[2]]);
    return out;
  };
  const i = S.findIndex(s => { const q = pairsOf(s); return q.length >= 2 && key(q) === want; });
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveIdentifyPoints', /identify the points|points on the secant/i]);

// "Find the average rate of change": slope between the two plotted points
window.__duo.solveAvgRate = function () {
  const p = this.gridPoints(); if (!p || p.length < 2) return null;
  const a = p[0], b = p[p.length - 1];
  const dx = b[0] - a[0]; if (!dx) return null;
  const want = (b[1] - a[1]) / dx;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const i = S.findIndex(s => { const v = this.numTok(s); return v !== null && Math.abs(v - want) < 1e-9; });
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveAvgRate', /average rate of change/i]);
;'__duo ready';

// Guided secant steps offer full equations ("0 - 4 = -4" vs "2 - 0 = 2"). Match on
// the RESULT of the requested delta, not on the arithmetic.
window.__duo.RULES.splice(2, 0, ['solveDeltaStep', /change in the/i]);
;'__duo ready';

// Matching a delta step on its RESULT is wrong whenever dx and dy coincide: for
// (-1,-2)->(2,1) both "2 - (-1) = 3" and "1 - (-2) = 3" evaluate to 3. Match the
// OPERANDS against the requested axis, and only fall back to the result.
window.__duo.solveDeltaStep = function () {
  const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
  const wantY = /change in the\s*y|change in\s*y/i.test(A);
  const wantX = /change in the\s*x|change in\s*x/i.test(A);
  if (!wantY && !wantX) return null;
  const p = this.gridPoints(); if (!p || p.length < 2) return null;
  const a = p[0], b = p[p.length - 1];
  const k = wantY ? 1 : 0;
  const want = b[k] - a[k];
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const flat = s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
  const ops = s => {
    const m = flat(s).match(/^\(?(-?\d+)\)?-\(?(-?\d+)\)?=/);
    return m ? [+m[1], +m[2]] : null;
  };
  let i = S.findIndex(s => { const o = ops(s); return o && o[0] === b[k] && o[1] === a[k]; });
  if (i < 0) {
    i = S.findIndex(s => { const m = flat(s).match(/=(-?\d+)$/); return m && +m[1] === want; });
  }
  return i < 0 ? { miss: want } : { i, want };
};
;'__duo ready';

// ---- intercepts (unit 142) ----
// The method step: y-intercept means set x = 0; x-intercept means set f(x) = 0.
window.__duo.RULES.splice(2, 0, ['solveInterceptMethod', /how to find the|determine how/i]);

// the intercept values themselves, from f(x) = mx + b
window.__duo.RULES.splice(2, 0, ['solveInterceptValue', /intercept/i]);
;'__duo ready';

// Guided lessons accumulate every step's text, so scanning the whole prompt for
// "y-intercept" matches the PREVIOUS step and answers the wrong question. Use the
// last line that mentions an intercept — that is the live one.
window.__duo.interceptAxis = function () {
  const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' '));
  for (let i = L.length - 1; i >= 0; i--) {
    if (!/intercept/i.test(L[i])) continue;
    if (/y\s*-?\s*intercept/i.test(L[i])) return 'y';
    if (/x\s*-?\s*intercept/i.test(L[i])) return 'x';
  }
  return null;
};
window.__duo.solveInterceptMethod = function () {
  const ax = this.interceptAxis(); if (!ax) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).replace(/\s/g, '').toLowerCase());
  const i = ax === 'y'
    ? S.findIndex(s => /(^|[^(])x=0/.test(s) && !/\(x\)=0/.test(s))
    : S.findIndex(s => /\(x\)=0|y=0/.test(s));
  return i < 0 ? { miss: ax } : { i };
};
window.__duo.solveInterceptValue = function () {
  const ax = this.interceptAxis(); if (!ax) return null;
  let m = null, b = null;
  const L = this.promptLatex();
  for (let i = L.length - 1; i >= 0; i--) {
    if (!/\(x\)\s*=|y\s*=/.test(this.ascii(L[i]))) continue;
    const sl = this.slopeOfFormula(L[i]);
    if (sl === null) continue;
    const t = this.ascii(L[i]).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    const bm = t.match(/x([+-]\d+)/);
    m = sl; b = bm ? +bm[1] : 0; break;
  }
  if (m === null) return null;
  const want = ax === 'y' ? b : (m ? -b / m : null);
  if (want === null) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const i = S.findIndex(s => { const v = this.numTok(s); return v !== null && Math.abs(v - want) < 1e-9; });
  return i < 0 ? { miss: want } : { i, want };
};
;'__duo ready';

// ---- read a drawn line in GRID coordinates ----
// A path's `d` is in SVG user units, not page pixels, so those numbers cannot be
// fed to grid2D directly. Sample the path with getPointAtLength and map through
// getScreenCTM to get real page coordinates.
window.__duo.lineInGrid = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  for (const p of d.querySelectorAll('path,line,polyline')) {
    const c = String(p.getAttribute('class') || '');
    if (/axis|grid/.test(c)) continue;
    if (typeof p.getPointAtLength !== 'function') continue;
    let L = 0; try { L = p.getTotalLength(); } catch (e) { continue; }
    if (!L) continue;
    const m = p.getScreenCTM(); if (!m) continue;
    const at = t => {
      const q = p.getPointAtLength(t * L);
      const x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
      return g.toXY(fr.left + x, fr.top + y);
    };
    const A = at(0), B = at(1);
    const dx = B[0] - A[0], dy = B[1] - A[1];
    if (Math.abs(dx) < 0.05) continue;              // vertical: not a function
    const slope = dy / dx;
    return { a: A, b: B, slope, at0: A[1] - slope * A[0] };
  }
  return null;
};

// "Select the y-intercept / x-intercept" from a graph, as an ordered pair or value


// intercepts can also come from a table of values


// "Select the equation for the x/y-intercept": the setup equation, not its value.
// x-intercept substitutes 0 for f(x) and keeps x ("0 = x - 5");
// y-intercept substitutes 0 for x and keeps f(x) ("f(x) = 1(0) - 5").
window.__duo.solveInterceptEquation = function () {
  const ax = this.interceptAxis(); if (!ax) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  // x-intercept: the side that was replaced by 0 is f(x), and an x survives
  const i = ax === 'x'
    ? S.findIndex(s => /^0=/.test(s) && /x/.test(s.slice(2)))
    : S.findIndex(s => /\(0\)|=.*0/.test(s) && !/^0=/.test(s));
  return i < 0 ? { miss: ax } : { i };
};
window.__duo.RULES.splice(2, 0, ['solveInterceptEquation', /equation for the/i]);
;'__duo ready';

// slopeOfFormula's regexes assume "mx + b" order and miss "6 - x". Reduce the RHS
// with the same linear parser used for inequalities: it handles any ordering,
// brackets, and a bare or negated x.
window.__duo.formulaAB = function (s) {
  const t = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
  const eq = t.indexOf('='); if (eq < 0) return null;
  const rhs = t.slice(eq + 1);
  const v = (rhs.match(/[a-z]/) || [])[0]; if (!v) return null;
  if (/frac/.test(rhs)) {
    const m = this.slopeOfFormula(s);
    if (m === null) return null;
    const bm = rhs.match(/x([+-]\d+)$/);
    return { m, b: bm ? +bm[1] : 0 };
  }
  const r = this.linear(rhs, v);
  return r ? { m: r.a, b: r.b } : null;
};
(function () {
  const base = window.__duo.slopeOfFormula;
  window.__duo.slopeOfFormula = function (s) {
    const r = base.call(this, s);
    if (r !== null && r !== undefined) return r;
    const ab = this.formulaAB(s);
    return ab ? ab.m : null;
  };
})();
(function () {
  const base = window.__duo.solveInterceptValue;
  window.__duo.solveInterceptValue = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const ax = this.interceptAxis(); if (!ax) return r;
    const L = this.promptLatex();
    let ab = null;
    for (let i = L.length - 1; i >= 0; i--) {
      if (!/\(x\)\s*=|y\s*=/.test(this.ascii(L[i]))) continue;
      ab = this.formulaAB(L[i]); if (ab) break;
    }
    if (!ab) return r;
    const want = ax === 'y' ? ab.b : (ab.m ? -ab.b / ab.m : null);
    if (want === null) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const pair = s => {
      const m = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '').match(/\((-?[\d.]+),(-?[\d.]+)\)/);
      return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
    };
    let i = S.findIndex(s => { const q = pair(s); return q && (ax === 'y' ? (q[0] === 0 && q[1] === want) : (q[1] === 0 && q[0] === want)); });
    if (i < 0) i = S.findIndex(s => { const v = this.numTok(s); return v !== null && Math.abs(v - want) < 1e-9; });
    return i < 0 ? { miss: want } : { i, want };
  };
})();
;'__duo ready';

// ---- "Plot the y-intercept / x-intercept" ----
// One movable point plus a 2D thumb. gridPoints() requires two points, so read the
// single point separately, and drag by the measured delta (the widget moves
// relative to the grab point, so an absolute target lands short).
Object.assign(window.__duo, {
  onePoint() {
    const g = this.grid2D(); if (!g) return null;
    const fr = g.f.getBoundingClientRect();
    const p = [...g.f.contentDocument.querySelectorAll('g.point')]
      .find(e => !/hidden/.test(String(e.getAttribute('class') || '')));
    if (!p) return null;
    const r = p.getBoundingClientRect();
    const [x, y] = g.toXY(fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2);
    return { g, el: p, x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
  },

  plotTarget() {
    const ax = this.interceptAxis(); if (!ax) return null;
    const L = this.promptLatex();
    let ab = null;
    for (let i = L.length - 1; i >= 0; i--) {
      if (!/\(x\)\s*=|y\s*=/.test(this.ascii(L[i]))) continue;
      ab = this.formulaAB(L[i]); if (ab) break;
    }
    if (!ab) return null;
    return ax === 'y' ? [0, ab.b] : (ab.m ? [-ab.b / ab.m, 0] : null);
  },

  async solvePlotPoint() {
    const want = this.plotTarget(); if (!want) return false;
    const g = this.grid2D(); if (!g) return false;
    const th = g.f.contentDocument.querySelector('.slider2d-thumb,.slider1d-thumb');
    if (!th) return false;
    for (let k = 0; k < 5; k++) {
      const cur = this.onePoint(); if (!cur) return false;
      if (cur.x === want[0] && cur.y === want[1]) return true;
      const dx = (want[0] - cur.x) * g.ux, dy = (want[1] - cur.y) * g.uy;
      const fr = g.f.getBoundingClientRect(), r = th.getBoundingClientRect();
      const from = [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
      await this.dragXY(th, g.f, from, [Math.round(from[0] + dx), Math.round(from[1] + dy)]);
    }
    const cur = this.onePoint();
    return !!cur && cur.x === want[0] && cur.y === want[1];
  },
});

(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    if (/plot the/i.test(this.prompt()) && this.plotTarget()) return { kind: 'plot', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// The plot widget's control is a HORIZONTAL slider2d-track even when the point it
// moves travels vertically, so mapping grid deltas onto the thumb's axes does not
// work. Move the thumb along its track, see which coordinate responds and by how
// much, then close the loop.
window.__duo.solvePlotPoint = async function () {
  const want = this.plotTarget(); if (!want) return false;
  const g = this.grid2D(); if (!g) return false;
  const d = g.f.contentDocument;
  const th = d.querySelector('.slider2d-thumb,.slider1d-thumb'); if (!th) return false;
  const track = d.querySelector('.slider2d-track,.slider1d-track');
  const horiz = !track || track.getBoundingClientRect().width >= track.getBoundingClientRect().height;

  const at = () => { const p = this.onePoint(); return p && [p.x, p.y]; };
  const pos = () => {
    const fr = g.f.getBoundingClientRect(), r = th.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
  };
  let cur = at(); if (!cur) return false;
  if (cur[0] === want[0] && cur[1] === want[1]) return true;

  // which coordinate does this slider actually drive?
  const axis = cur[0] !== want[0] ? 0 : 1;
  let step = 40;
  for (let k = 0; k < 8; k++) {
    cur = at(); if (!cur) return false;
    if (cur[0] === want[0] && cur[1] === want[1]) return true;
    const need = want[axis] - cur[axis];
    if (!need) return cur[0] === want[0] && cur[1] === want[1];
    const delta = need * step;
    const from = pos();
    const to = horiz ? [Math.round(from[0] + delta), from[1]] : [from[0], Math.round(from[1] + delta)];
    await this.dragXY(th, g.f, from, to);
    const after = at(); if (!after) return false;
    const got = after[axis] - cur[axis];
    if (got) step = Math.abs(delta / got) * Math.sign(delta / got) * Math.sign(need) * (need / Math.abs(need));
    if (got) step = delta / got;          // px per grid unit, sign included
    else step *= 1.6;
  }
  const fin = at();
  return !!fin && fin[0] === want[0] && fin[1] === want[1];
};
;'__duo ready';

// typed intercepts ("Enter the y-intercept value")


// ---- inverses (unit 143) ----
// The inverse of a point swaps its coordinates. The source point may be plotted on
// a grid or written in the prompt.
window.__duo.solveInversePoint = function () {
  let src = null;
  const p = this.onePoint();
  if (p) src = [p.x, p.y];
  if (!src) {
    const t = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    const m = t.match(/\((-?[\d.]+),(-?[\d.]+)\)/);
    if (m) src = [parseFloat(m[1]), parseFloat(m[2])];
  }
  if (!src) return null;
  const want = [src[1], src[0]];
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
window.__duo.RULES.splice(2, 0, ['solveInversePoint', /inverse of the point|inverse point/i]);
;'__duo ready';

// The plotted curve is exactly class="line". Everything else that looks like a path
// is scenery: eight zero-extent math-diagram__arrow--* marker DEFINITIONS (all
// reporting the same point), 19 grid-lines and 2 axis-lines. Selecting "the first
// non-axis path" picks an arrow marker and reads a nonsense slope.
window.__duo.curvePath = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  const p = [...d.querySelectorAll('path,line,polyline')]
    .find(e => String(e.getAttribute('class') || '').split(/\s+/).includes('line'));
  if (!p || typeof p.getTotalLength !== 'function') return null;
  let L = 0; try { L = p.getTotalLength(); } catch (e) { return null; }
  if (!L) return null;
  const m = p.getScreenCTM(); if (!m) return null;
  const at = t => {
    const q = p.getPointAtLength(t * L);
    return g.toXY(fr.left + m.a * q.x + m.c * q.y + m.e, fr.top + m.b * q.x + m.d * q.y + m.f);
  };
  const A = at(0), B = at(1);
  return { g, A, B, at, slope: (B[0] - A[0]) ? (B[1] - A[1]) / (B[0] - A[0]) : null };
};
(function () {
  const base = window.__duo.lineInGrid;
  window.__duo.lineInGrid = function () {
    const c = this.curvePath();
    if (c && c.slope !== null) return { a: c.A, b: c.B, slope: c.slope, at0: c.A[1] - c.slope * c.A[0] };
    return base.call(this);
  };
})();

// domain / range: a curve reaching both edges of the plot is unbounded there
window.__duo.RULES.splice(2, 0, ['solveDomainRange', /domain|range/i]);
;'__duo ready';
