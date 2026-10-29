
// Scenario wording decides dependence: "without replacement" (or "then keeps",
// "does not replace") makes events DEPENDENT; "with replacement", separate dice
// or coins keep them INDEPENDENT.
window.__duo.solveScenarioDependence = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
  const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
  const hasDep = words.some(w => w.startsWith('dependent'));
  const hasInd = words.some(w => w.startsWith('independent'));
  if (!hasDep || !hasInd) return null;
  const t = this.promptLatex().map(l => this.ascii(l)).join(' ')
    .replace(/\\[a-z]+/g, ' ').toLowerCase();
  let dep = null;
  if (/without replacement|does not replace|doesn.t replace|keeps? (it|the)|not put back/.test(t)) dep = true;
  else if (/with replacement|puts? (it|them) back|replaces?/.test(t)) dep = false;
  else if (/two dice|both dice|coin|spinner twice|rolls? .*twice/.test(t)) dep = false;
  if (dep === null) return null;
  const i = words.findIndex(w => dep ? w.startsWith('dependent') : w.startsWith('independent'));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveScenarioDependence', /dependent|independent|replacement/i]);
;'__duo ready';

// Unit 193: counting. "How many ways to arrange n items" is n! written as
// n·(n-1)·…·1; picking r from n is the falling product of r terms.
window.__duo.countingTarget = function () {
  const t = this.promptLatex().map(l => this.ascii(l)).join(' ')
    .replace(/\\[a-z]+/g, ' ').replace(/[{}]/g, ' ').toLowerCase();
  const nums = (t.match(/\b\d+\b/g) || []).map(Number);
  if (!nums.length) return null;
  const arrange = /arrange|order|permutation|line up|seat/.test(t);
  const choose = /choose|select|pick|combination/.test(t);
  const n = nums[0];
  const r = nums.length > 1 ? nums[1] : n;
  const fact = k => { let v = 1; for (let i = 2; i <= k; i++) v *= i; return v; };
  if (arrange && nums.length === 1) return { value: fact(n), n, r: n, kind: 'perm' };
  if (arrange) { let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return { value: v, n, r, kind: 'perm' }; }
  if (choose) { let v = 1; for (let i = 0; i < r; i++) v *= (n - i); return { value: v / fact(r), n, r, kind: 'comb' }; }
  return null;
};
window.__duo.solveCountingExpression = function () {
  const C = this.countingTarget(); if (!C) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/cdot|times/g, '*');
    const g = this.compile(t);
    try { return g && Math.abs(g(0) - C.value) < 1e-9; } catch (err) { return false; }
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCountingExpression', /arrange|order|choose|select|ways|select the match/i]);


// Teach the evaluator factorials so "4!" and patterns built from them work.
(function () {
  const fact = k => { let v = 1; for (let i = 2; i <= k; i++) v *= i; return v; };
  const base = window.__duo.evalTrigExpr;
  window.__duo.evalTrigExpr = function (text) {
    let t = String(text);
    if (/!/.test(t)) t = t.replace(/(\d+)\s*!/g, (m0, n) => String(fact(parseInt(n, 10))));
    return base.call(this, t);
  };
  // "Complete the pattern" over factorials: the blank follows its own "n!" line
  const bp = window.__duo.solvePattern;
  window.__duo.solvePattern = function () {
    const r = bp.call(this); if (r) return r;
    if (!/complete the pattern/i.test(this.curInstruction())) return null;
    const L = this.promptLatex();
    let want = null;
    for (let i = 0; i < L.length; i++) {
      if (this.flatLine(L[i]) !== '') continue;
      const prev = this.ascii(L[i - 1] || '');
      const m = prev.match(/(\d+)\s*!/);
      if (m) { want = fact(parseInt(m[1], 10)); break; }
    }
    if (want === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-9; });
    return i < 0 ? null : { i };
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = bo.call(this); if (v !== null && v !== undefined) return v;
    const m = this.curInstruction().replace(/\s/g, '').match(/(\d+)!/);
    if (m) return fact(parseInt(m[1], 10));
    return v;
  };
})();
;'__duo ready';

// "Select the value of the factorial": evaluate the n! shown in the prompt.
window.__duo.solveFactorialValue = function () {
  if (!/factorial/i.test(this.curInstruction() + ' ' + this.promptTitle())) return null;
  const raw = this.promptLatex().map(l => this.ascii(l)).join(' ');
  const m = raw.match(/(\d+)\s*!/);
  if (!m) return null;
  const fact = k => { let v = 1; for (let i = 2; i <= k; i++) v *= i; return v; };
  const want = fact(parseInt(m[1], 10));
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-9; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveFactorialValue', /factorial/i]);
;'__duo ready';

// "Identify the coordinates of the plotted point": read the point straight off
// the grid and match the coordinate-pair choice.
window.__duo.solvePlottedCoords = function () {
  if (!/coordinates of the plotted|coordinates of the point/i.test(this.curInstruction())) return null;
  const P = this.plottedPoints();
  if (P.length !== 1) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const p = this.choicePair(e);
    return p && Math.abs(p[0] - P[0][0]) < 1e-6 && Math.abs(p[1] - P[0][1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePlottedCoords', /coordinates of the/i]);
;'__duo ready';

// "Find the slope of the line": from the drawn line, from two plotted points,
// or from a printed y = mx + b.
(function () {
  const asFraction = v => {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    for (let d = 2; d <= 50; d++) { const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n) + '/' + d; }
    return Math.round(v * 1000) / 1000;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (/slope of the line|find the slope|slope/i.test(this.curInstruction())) {
      const c = this.curvePath();
      if (c && c.slope !== null && isFinite(c.slope)) return asFraction(Math.round(c.slope * 1000) / 1000);
      const P = this.plottedPoints();
      if (P.length === 2 && P[1][0] !== P[0][0])
        return asFraction((P[1][1] - P[0][1]) / (P[1][0] - P[0][0]));
      const F = this.formulaIn('x');
      if (F && F.f) { try { const m = F.f(1) - F.f(0); if (isFinite(m)) return asFraction(m); } catch (e) {} }
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// "Select the point on the line": test each candidate against the drawn line
// (extrapolating beyond the drawn segment) or the printed equation.
window.__duo.solvePointOnLine = function () {
  if (!/point on the line|point that (is )?on/i.test(this.curInstruction())) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  let at = null;
  const F = this.formulaIn('x');
  if (F && F.f) at = x => { try { return F.f(x); } catch (e) { return null; } };
  if (!at) {
    const c = this.curvePath();
    if (c && c.slope !== null) {
      const m = c.slope, b = c.A[1] - m * c.A[0];
      at = x => m * x + b;
    }
  }
  if (!at) {
    const P = this.plottedPoints();
    if (P.length >= 2 && P[1][0] !== P[0][0]) {
      const m = (P[1][1] - P[0][1]) / (P[1][0] - P[0][0]);
      const b = P[0][1] - m * P[0][0];
      at = x => m * x + b;
    }
  }
  if (!at) return null;
  const hits = [];
  ch.forEach((e, i) => { const p = this.choicePair(e); if (!p) return;
    const y = at(p[0]); if (y === null || !isFinite(y)) return;
    if (Math.abs(y - p[1]) < 0.25) hits.push(i); });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solvePointOnLine', /point on the line/i]);
;'__duo ready';

// Point-slope form (y + 8 = -2(x - 7)) is not a "y = ..." formula, so test each
// candidate point by substituting into BOTH sides of the printed equation.
window.__duo.equationSatisfied = function (px, py) {
  for (const l of this.promptLatex()) {
    const t = this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    if (!/=/.test(t) || !/[xy]/.test(t)) continue;
    const [lhs, rhs] = t.split('=');
    if (!lhs || !rhs) continue;
    const sub = s => s.replace(/(\d)\s*([xy(])/g, '$1*$2')
                      .replace(/\)\s*\(/g, ')*(')
                      .replace(/x/g, '(' + px + ')').replace(/y/g, '(' + py + ')');
    try {
      const a = Function('"use strict";return (' + sub(lhs) + ')')();
      const b = Function('"use strict";return (' + sub(rhs) + ')')();
      if (isFinite(a) && isFinite(b)) return Math.abs(a - b) < 1e-6;
    } catch (e) {}
  }
  return null;
};
(function () {
  const base = window.__duo.solvePointOnLine;
  window.__duo.solvePointOnLine = function () {
    const r = base.call(this); if (r) return r;
    if (!/point on the line|point that (is )?on|satisf/i.test(this.curInstruction())) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const hits = [];
    ch.forEach((e, i) => { const p = this.choicePair(e); if (!p) return;
      if (this.equationSatisfied(p[0], p[1]) === true) hits.push(i); });
    return hits.length === 1 ? { i: hits[0] } : null;
  };
})();
;'__duo ready';

// Slope from point-slope form y - k = m(x - h), or from y = mx + b.
window.__duo.slopeFromEquation = function () {
  for (const l of this.promptLatex()) {
    const t = this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    let m = t.match(/^y[+-][\d.]+=(-?[\d.]*)\(x[+-][\d.]+\)$/);
    if (m) return m[1] === '' ? 1 : (m[1] === '-' ? -1 : parseFloat(m[1]));
    m = t.match(/^y=(-?[\d.]*)x(?:[+-][\d.]+)?$/);
    if (m) return m[1] === '' ? 1 : (m[1] === '-' ? -1 : parseFloat(m[1]));
  }
  return null;
};


// "Select the match" where both prompt and choices are equations in x and y:
// keep the choice that is equivalent to the prompt's equation, tested at
// several sample points.
window.__duo.eqTester = function (text) {
  const t = this.ascii(text)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
  if (!/=/.test(t)) return null;
  const parts = t.split('=');
  if (parts.length !== 2) return null;
  const prep = s => s.replace(/(\d)\s*([xy(])/g, '$1*$2').replace(/\)\s*\(/g, ')*(');
  return (px, py) => {
    const sub = s => prep(s).replace(/x/g, '(' + px + ')').replace(/y/g, '(' + py + ')');
    try {
      const a = Function('"use strict";return (' + sub(parts[0]) + ')')();
      const b = Function('"use strict";return (' + sub(parts[1]) + ')')();
      if (!isFinite(a) || !isFinite(b)) return null;
      return Math.abs(a - b) < 1e-6;
    } catch (e) { return null; }
  };
};
window.__duo.solveEquivalentEquation = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  let ref = null;
  for (const l of this.promptLatex().slice().reverse()) {
    const f = this.eqTester(l);
    if (f) { ref = f; break; }
  }
  if (!ref) return null;
  const xs = [-3, -1, 0, 2, 5];
  const hits = [];
  ch.forEach((e, i) => {
    const g = this.eqTester(this.choiceLatex(e)); if (!g) return;
    let ok = true, tested = 0;
    for (const x of xs) for (const y of [-4, 0, 3, 11]) {
      const a = ref(x, y), b = g(x, y);
      if (a === null || b === null) continue;
      tested++;
      if (a !== b) { ok = false; break; }
    }
    if (ok && tested >= 8) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveEquivalentEquation', /select the match|equivalent|which equation/i]);
;'__duo ready';

// "Select the equation in point-slope form" given m = 2 and the point (0, 4):
// the answer is y - 4 = 2(x - 0). Both choices are valid-looking, so build the
// exact form from the stated slope and point.
window.__duo.solvePointSlopeForm = function () {
  if (!/point-?slope form/i.test(this.curInstruction() + ' ' + this.promptTitle())) return null;
  const raw = this.promptLatex().map(l => this.ascii(l)).join(' ')
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/[{}~\\]/g, ' ').replace(/[−–—]/g, '-');
  const mm = raw.match(/m\s*=\s*(-?[\d.]+)/);
  const pp = this.promptPairs();
  if (!mm || !pp.length) return null;
  const m = parseFloat(mm[1]);
  const [h, k] = pp[pp.length - 1];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.ascii(this.choiceLatex(e))
      .replace(/\\(mathbf|textbf|text|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    const q = t.match(/^y([+-])([\d.]+)=(-?[\d.]*)\(x([+-])([\d.]+)\)$/);
    if (!q) return false;
    const yConst = (q[1] === '-' ? 1 : -1) * parseFloat(q[2]);   // y - k  ->  k
    const slope = q[3] === '' ? 1 : (q[3] === '-' ? -1 : parseFloat(q[3]));
    const xConst = (q[4] === '-' ? 1 : -1) * parseFloat(q[5]);   // x - h  ->  h
    return Math.abs(yConst - k) < 1e-9 && Math.abs(xConst - h) < 1e-9 && Math.abs(slope - m) < 1e-9;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePointSlopeForm', /point-?slope/i]);
;'__duo ready';

// Unit 195: circles. Read the centre and radius from the equation
// (x - h)^2 + (y - k)^2 = r^2, or measure the drawn circle.
window.__duo.circleFromEquation = function () {
  for (const l of this.promptLatex()) {
    const t = this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    const m = t.match(/^\(x([+-][\d.]+)?\)\^?2\+\(y([+-][\d.]+)?\)\^?2=([\d.]+)$/);
    if (m) {
      const h = m[1] ? -parseFloat(m[1]) : 0;
      const k = m[2] ? -parseFloat(m[2]) : 0;
      const r2 = parseFloat(m[3]);
      return { h, k, r: Math.sqrt(r2), r2 };
    }
    const n = t.match(/^x\^?2\+y\^?2=([\d.]+)$/);
    if (n) { const r2 = parseFloat(n[1]); return { h: 0, k: 0, r: Math.sqrt(r2), r2 }; }
  }
  return null;
};
window.__duo.solveCircleCentre = function () {
  const ins = this.curInstruction();
  const C = this.circleFromEquation(); if (!C) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (/cent(er|re)/i.test(ins)) {
    const i = ch.findIndex(e => { const p = this.choicePair(e);
      return p && Math.abs(p[0] - C.h) < 1e-9 && Math.abs(p[1] - C.k) < 1e-9; });
    if (i >= 0) return { i };
  }
  if (/radius/i.test(ins)) {
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - C.r) < 1e-6; });
    if (i >= 0) return { i };
  }
  return null;
};
window.__duo.RULES.unshift(['solveCircleCentre', /cent(er|re)|radius|circle/i]);


// No equation printed — measure the drawn circle instead: its bounding box
// gives the centre and radius in grid units.
window.__duo.circleFromDrawing = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, g = d.M.grid;
  const el = [...doc.querySelectorAll('circle,ellipse,path')]
    .filter(e => !/grid|axis|arrow/i.test(e.getAttribute('class') || ''))
    .map(e => ({ e, r: e.getBoundingClientRect() }))
    .filter(o => o.r.width > 40 && Math.abs(o.r.width - o.r.height) < Math.max(6, o.r.width * 0.06))
    .sort((a, b) => b.r.width - a.r.width)[0];
  if (!el) return null;
  const R = el.r;
  const toGrid = (x, y) => { try { return g.pixelToGrid([x, y]); } catch (e) { return null; } };
  const c = toGrid(R.left + R.width / 2, R.top + R.height / 2);
  const edge = toGrid(R.right, R.top + R.height / 2);
  if (!c || !edge) return null;
  const h = Math.round(c[0]), k = Math.round(c[1]);
  const r = Math.round(Math.abs(edge[0] - c[0]));
  return r > 0 ? { h, k, r, r2: r * r } : null;
};


// The circle can be drawn as a "line" path (curvePath finds it). Fit a centre
// and radius from sampled points on that closed curve.
window.__duo.circleFromCurve = function () {
  const c = this.curvePath(); if (!c) return null;
  const P = [];
  for (let i = 0; i < 120; i++) { const p = c.at(i / 120); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); }
  if (P.length < 20) return null;
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const h = (Math.min(...xs) + Math.max(...xs)) / 2;
  const k = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  if (!rx || Math.abs(rx - ry) > Math.max(0.4, rx * 0.12)) return null;   // not a circle
  const r = Math.round((rx + ry) / 2);
  return { h: Math.round(h), k: Math.round(k), r, r2: r * r };
};
(function () {
  const base = window.__duo.solveCircleCentre;
  window.__duo.solveCircleCentre = function () {
    const r = base.call(this); if (r) return r;
    const C = this.circleFromCurve(); if (!C) return null;
    const ins = this.curInstruction();
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (/cent(er|re)/i.test(ins)) {
      const i = ch.findIndex(e => { const p = this.choicePair(e);
        return p && Math.abs(p[0] - C.h) < 1e-9 && Math.abs(p[1] - C.k) < 1e-9; });
      if (i >= 0) return { i };
    }
    if (/radius/i.test(ins)) {
      const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - C.r) < 0.2; });
      if (i >= 0) return { i };
    }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = bo.call(this); if (v !== null && v !== undefined) return v;
    const C = this.circleFromCurve();
    if (C) {
      const ins = this.curInstruction();
      if (/radius/i.test(ins)) return C.r;
      if (/cent(er|re)/i.test(ins)) return '(' + C.h + ', ' + C.k + ')';
    }
    return v;
  };
})();
;'__duo ready';
