
// "Select the x-intercepts" of a parabola: fit the curve and solve a x^2+bx+c = 0,
// or read the roots from a factored formula. Choices are pairs of ordered pairs.
window.__duo.parabolaFit = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  const pts = [];
  for (const p of d.querySelectorAll('path,line,polyline')) {
    if (!String(p.getAttribute('class') || '').split(/\s+/).includes('line')) continue;
    if (typeof p.getPointAtLength !== 'function') continue;
    let L = 0; try { L = p.getTotalLength(); } catch (e) { continue; }
    const m = p.getScreenCTM(); if (!L || !m) continue;
    for (let i = 0; i <= 30; i++) {
      const q = p.getPointAtLength((i / 30) * L);
      pts.push(g.toXY(fr.left + m.a * q.x + m.c * q.y + m.e, fr.top + m.b * q.x + m.d * q.y + m.f));
    }
  }
  if (pts.length < 8) return null;
  let S = [0, 0, 0, 0, 0], T = [0, 0, 0];
  for (const [x, y] of pts) {
    S[0] += 1; S[1] += x; S[2] += x * x; S[3] += x ** 3; S[4] += x ** 4;
    T[0] += y; T[1] += x * y; T[2] += x * x * y;
  }
  const M = [[S[4], S[3], S[2]], [S[3], S[2], S[1]], [S[2], S[1], S[0]]];
  const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M); if (!D) return null;
  const sub = (col, v) => M.map((row, r) => row.map((val, c) => (c === col ? v[r] : val)));
  const V = [T[2], T[1], T[0]];
  return { a: det3(sub(0, V)) / D, b: det3(sub(1, V)) / D, c: det3(sub(2, V)) / D };
};
window.__duo.solveXIntercepts = function () {
  // strip the LaTeX first: "\mathbf{x}\textbf{-intercepts}" leaves markup between
  // the x and the word, which defeats a naive /x\s*-?\s*intercepts/ test
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!/x\s*-?\s*intercepts|zeros|roots/.test(A)) return null;
  let roots = null;
  const F = this.parabolaFit();
  if (F && Math.abs(F.a) > 1e-6) {
    const disc = F.b * F.b - 4 * F.a * F.c;
    if (disc >= 0) {
      const r1 = (-F.b - Math.sqrt(disc)) / (2 * F.a), r2 = (-F.b + Math.sqrt(disc)) / (2 * F.a);
      roots = [r1, r2].map(v => Math.round(v * 2) / 2).sort((x, y) => x - y);
    }
  }
  if (!roots) {
    for (const line of this.promptLatex().slice().reverse()) {
      const f = this.compile(line); if (!f) continue;
      const rs = [];
      for (let x = -20; x <= 20; x += 0.5) { try { if (Math.abs(f(x)) < 1e-9) rs.push(x); } catch (e) {} }
      if (rs.length === 2) { roots = rs; break; }
    }
  }
  if (!roots) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => {
    const ps = [...half(this.ascii(e.innerText)).matchAll(/\((-?[\d.]+),(-?[\d.]+)\)/g)]
      .map(m => [parseFloat(m[1]), parseFloat(m[2])]);
    if (ps.length !== 2) return false;
    if (!ps.every(p => Math.abs(p[1]) < 1e-9)) return false;   // must be on the x-axis
    const xs = ps.map(p => p[0]).sort((a, b) => a - b);
    return Math.abs(xs[0] - roots[0]) < 0.3 && Math.abs(xs[1] - roots[1]) < 0.3;
  });
  return i < 0 ? { miss: roots.join(',') } : { i, want: roots.join(',') };
};
window.__duo.RULES.splice(2, 0, ['solveXIntercepts', /intercept|zeros|roots/i]);
;'__duo ready';

// "Select the equation for the zeros of f(x)" — the answer is 0 = <the same
// expression>. Compare each choice's right-hand side to f(x) by evaluation.
window.__duo.solveZerosEquation = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!/equation for the zeros|set .* equal to zero/.test(A)) return null;
  let f = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line);
    if (!/\(x\)\s*=/.test(t)) continue;
    const g = this.compile(t); if (!g) continue;
    try { if (isFinite(g(2)) && isFinite(g(3))) { f = g; break; } } catch (e) {}
  }
  if (!f) return null;
  const sig = g => { try { return [g(2), g(3), g(5)].map(v => Math.round(v * 1e6) / 1e6).join('|'); } catch (e) { return null; } };
  const want = sig(f); if (!want) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => half(this.ascii(e.innerText)));
  const hits = [];
  S.forEach((s, i) => {
    // strip \mathbf{...} BEFORE splitting on "=", or the right-hand side keeps the
    // wrapper's closing brace and fails to compile
    const flat = this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/^\{|\}$/g, '');
    const rhs = flat.replace(/^[^=]*=/, '');
    const g = this.compile(rhs); if (!g) return;
    if (sig(g) === want) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.splice(2, 0, ['solveZerosEquation', /zeros|equal to zero/i]);
;'__duo ready';

// ---- zeros of a function (unit 158) ----
// "Select the zeros" / "Enter a zero" for any factored or polynomial f: find the
// roots numerically from the compiled function. Covers (x-4)(x+8), (3x-6)(x-1) and
// the linear case alike.
window.__duo.zerosOf = function () {
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line);
    if (!/\(x\)\s*=|y\s*=/.test(t)) continue;
    const f = this.compile(t); if (!f) continue;
    const roots = [];
    // scan on a fine grid and refine each sign change by bisection
    let prev = null;
    for (let x = -30; x <= 30; x += 0.05) {
      let v; try { v = f(x); } catch (e) { continue; }
      if (!isFinite(v)) { prev = null; continue; }
      if (Math.abs(v) < 1e-9) { const r = Math.round(x * 1000) / 1000; if (!roots.some(q => Math.abs(q - r) < 1e-3)) roots.push(r); }
      else if (prev && prev.v * v < 0) {
        let lo = prev.x, hi = x;
        for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (f(lo) * f(mid) <= 0) ? (hi = mid) : (lo = mid); }
        const r = Math.round(((lo + hi) / 2) * 1000) / 1000;
        if (!roots.some(q => Math.abs(q - r) < 1e-3)) roots.push(r);
      }
      prev = { x, v };
    }
    if (roots.length) return roots.map(r => Math.abs(r - Math.round(r)) < 1e-6 ? Math.round(r) : r).sort((a, b) => a - b);
  }
  return null;
};
window.__duo.solveZeros = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!/zeros?\b|roots?\b/.test(A)) return null;
  const roots = this.zerosOf(); if (!roots) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const key = a => a.slice().sort((x, y) => x - y).join(',');
  const want = key(roots);
  const i = ch.findIndex(e => {
    const ns = (half(this.ascii(e.innerText)).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return ns.length === roots.length && key(ns) === want;
  });
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveZeros', /zeros?|roots?/i]);

// typed: "Enter a zero of the function"


// zeros read off a DRAWN curve (no formula in the prompt): use the parabola fit's
// discriminant, else the x-values where the sampled curve crosses y = 0


// ---- factoring helpers (unit 158) ----
// "Find the factors of 12" with single-number choices — multi-select every divisor.
window.__duo.solveFactorsOf = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const m = A.match(/factors of\s*(-?\d+)/); if (!m) return null;
  const n = Math.abs(+m[1]);
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const vals = ch.map(e => parseFloat(half(this.ascii(e.innerText))));
  if (vals.some(v => isNaN(v))) return null;         // pair-style choices: not this rule
  const idx = [];
  vals.forEach((v, i) => { if (v && n % v === 0) idx.push(i); });
  return idx.length ? { ok: true, idx } : null;
};


// "Identify the sign of the 7x term" in x^2 - 7x + 12 = 0
window.__duo.solveSignOfTerm = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const m = A.match(/sign of the\s*(-?\d*)\s*([a-z](?:\^\d+)?)?\s*term/);
  if (!m) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).toLowerCase());
  if (!S.some(s => /positive/.test(s)) || !S.some(s => /negative/.test(s))) return null;
  const needle = (m[1] || '') + (m[2] || '');
  let sign = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    const at = t.indexOf(needle);
    if (at < 0) continue;
    // walk back to the sign in front of the term
    let j = at - 1;
    while (j >= 0 && /\d/.test(t[j])) j--;
    sign = t[j] === '-' ? 'negative' : 'positive';
    break;
  }
  if (!sign) return null;
  const i = S.findIndex(s => s.includes(sign));
  return i < 0 ? { miss: sign } : { i, want: sign };
};
window.__duo.RULES.splice(2, 0, ['solveSignOfTerm', /sign of/i]);
;'__duo ready';

// Equivalence when both sides are EQUATIONS: "x^2 - 7x + 12 = 0" vs
// "(x-3)(x-4) = 0". Compare the non-trivial side of each.
(function () {
  const sideOf = function (s) {
    const flat = this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/^\{|\}$/g, '');
    if (!flat.includes('=')) return flat;
    const parts = flat.split('=');
    const good = parts.find(p => /[a-z]/.test(p) && !/^\s*0\s*$/.test(p));
    return good !== undefined ? good : parts[0];
  };
  const base = window.__duo.solveAlgEquiv;
  window.__duo.solveAlgEquiv = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (ch.length < 2) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const half = s => { const t = String(s).replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const S = ann.length === ch.length ? ann : ch.map(e => half(this.ascii(e.innerText)));
    const sig = f => { try { return [f(2), f(3), f(5)].map(v => Math.round(v * 1e6) / 1e6).join('|'); } catch (e) { return null; } };
    const fns = S.map(s => this.compile(sideOf.call(this, s)));
    const sigs = fns.map(f => f ? sig(f) : null);
    let want = null;
    for (const line of this.promptLatex().slice().reverse()) {
      const t = this.ascii(line);
      if (!/[a-z]/.test(t) || /select|which|choose|create|match/i.test(t)) continue;
      const f = this.compile(sideOf.call(this, line)); if (!f) continue;
      const sg = sig(f); if (sg) { want = sg; break; }
    }
    if (!want) return null;
    const hits = []; sigs.forEach((s, i) => { if (s && s === want) hits.push(i); });
    return hits.length === 1 ? { i: hits[0], want } : null;
  };
})();
;'__duo ready';

// solveFactorSum matched the STALE "factors of 12 ... add to 7" text and answered a
// later factored-form question with it. Gate on the choices actually being bare
// number pairs like "(3,4)".
(function () {
  const base = window.__duo.solveFactorSum;
  window.__duo.solveFactorSum = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const pairs = ch.length && ch.every(e => {
      const t = this.ascii(e.innerText).replace(/\s/g, '');
      const h = (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t;
      return /^\(?-?\d+(,|and)-?\d+\)?$/.test(h);
    });
    if (!pairs) return null;
    return base.call(this);
  };
})();
;'__duo ready';

// When duoGoal() resolves, the \duodisplay slider path must win over the older
// generic 'slider' planner, which returns v:null and leaves autoDrag with nothing.
(function () {
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    if (this.duoGoal() && this.duoCur() !== null) return { kind: 'duoslider', from: [0, 0], to: [0, 0] };
    return basePlan.call(this);
  };
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.duoGoal() && this.duoCur() !== null) {
      if (await this.solveDuoSlider()) return true;
    }
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// "Graph the function f(x) = x(x+2)" with two draggable points: for a quadratic the
// two points are its zeros (both on the x-axis).
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const comps = this.dragComponents();
    if (comps.length === 2 && /graph the function/i.test(this.tex())) {
      const roots = this.zerosOf();
      if (roots && roots.length === 2) {
        const cs = comps.slice().sort((a, b) => a.P.x - b.P.x);
        const want = roots.slice().sort((a, b) => a - b).map(x => [x, 0]);
        let ok = true;
        for (let i = 0; i < 2; i++) ok = (await this.moveComponent(cs[i], want[i])) && ok;
        if (ok) return true;
      }
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    if (this.dragComponents().length === 2 && /graph the function/i.test(this.tex())) {
      const r = this.zerosOf();
      if (r && r.length === 2) return { kind: 'graphzeros', from: [0, 0], to: [0, 0] };
    }
    return null;
  };
})();
;'__duo ready';

// "Select the vertex type": a parabola opening up has a MINIMUM vertex, opening
// down a MAXIMUM. Read the sign of the leading coefficient from the fit or formula.
window.__duo.solveVertexType = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).toLowerCase());
  if (!S.some(s => /maximum/.test(s)) || !S.some(s => /minimum/.test(s))) return null;
  let a = null;
  const F = this.parabolaFit();
  if (F && Math.abs(F.a) > 1e-6) a = F.a;
  if (a === null) {
    for (const line of this.promptLatex().slice().reverse()) {
      const f = this.compile(line); if (!f) continue;
      try {
        const v = f(0), l = f(-50), r = f(50);
        if (isFinite(v) && isFinite(l) && isFinite(r)) { a = (l + r) / 2 - v; break; }
      } catch (e) {}
    }
  }
  if (a === null) return null;
  const want = a > 0 ? 'minimum' : 'maximum';
  const i = S.findIndex(s => s.includes(want));
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveVertexType', /vertex type|maximum|minimum/i]);
;'__duo ready';

// ---- break the formulaAB <-> slopeOfFormula cycle ----
// formulaAB falls back to slopeOfFormula for \frac coefficients, and a later
// slopeOfFormula wrapper falls back to formulaAB. Together they recurse until the
// stack blows, which took out plan() entirely. Give each a non-recursing core.
(function () {
  const compile = window.__duo.compile;
  // authoritative: derive m and b numerically, no cross-calls
  window.__duo.formulaAB = function (s) {
    const f = compile.call(this, s);
    if (f) {
      try {
        const b = f(0), m = f(1) - f(0);
        if (isFinite(b) && isFinite(m) && Math.abs((f(2) - f(0)) - 2 * m) < 1e-9) return { m, b };
      } catch (e) {}
    }
    const t = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    const c = t.match(/^(?:[a-z]\(x\)|y)=(-?\d+(?:\.\d+)?)$/);
    return c ? { m: 0, b: parseFloat(c[1]) } : null;
  };
  window.__duo.slopeOfFormula = function (s) {
    const ab = this.formulaAB(s);
    return ab ? ab.m : null;
  };
})();
;'__duo ready';

// "Create a graph with vertex (-2,-2)" where the slider fills h in
// f(x) = (x - \duodisplay{..}{cur})^2 + k: pick the value whose resulting parabola
// has the stated vertex.
(function () {
  const base = window.__duo.duoGoal;
  window.__duo.duoGoal = function () {
    const g = base.call(this); if (g) return g;
    const lines = this.promptLatex();
    const A = this.ascii(lines.join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ').replace(/\s+/g, ' ');
    const vm = A.match(/vertex\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/i);
    if (!vm) return null;
    const hx = parseFloat(vm[1]), hy = parseFloat(vm[2]);
    let expr = null;
    for (const line of lines.slice().reverse()) {
      if (/duodisplay/.test(this.ascii(line))) { expr = this.ascii(line); break; }
    }
    if (!expr) return null;
    for (let v = -10; v <= 10; v += 0.5) {
      const src = expr.replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/, '(' + v + ')');
      const f = this.compile(src); if (!f) continue;
      try {
        if (Math.abs(f(hx) - hy) < 1e-9
            && f(hx - 1) > f(hx) - 1e-9 && f(hx + 1) > f(hx) - 1e-9) return { kind: 'eq', v };
      } catch (e) {}
    }
    return null;
  };
})();
;'__duo ready';
