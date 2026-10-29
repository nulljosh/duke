
// ---- unit 156 fixes, both found by the fail-capture ----
// 1. "linear vs quadratic": classify by the highest power in the formula.
window.__duo.solveLinearQuadratic = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).toLowerCase());
  if (!S.some(s => /linear/.test(s)) || !S.some(s => /quadratic/.test(s))) return null;
  let deg = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    if (!/=/.test(t)) continue;
    const powers = [...t.matchAll(/\^(\d+)/g)].map(m => +m[1]);
    if (powers.length) { deg = Math.max(...powers); break; }
    if (/[a-z]/.test(t.split('=')[1] || '')) { deg = 1; break; }
  }
  if (deg === null) {
    // fall back to the table: a constant second difference means quadratic
    const T = this.fnTable();
    if (T && T.length >= 3) {
      const ys = T.map(r => r[1]);
      const d1 = ys.slice(1).map((v, i) => v - ys[i]);
      const d2 = d1.slice(1).map((v, i) => v - d1[i]);
      deg = d2.every(v => Math.abs(v) < 1e-9) ? 1 : 2;
    }
  }
  if (deg === null) return null;
  const want = deg >= 2 ? 'quadratic' : 'linear';
  const i = S.findIndex(s => s.includes(want));
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveLinearQuadratic', null]);

// 2. typed differences ("Enter the constant first/second difference")


// "Create f(2) = 6" where the slider IS a coefficient inside the expression:
// f(2) = \duodisplay{..}{cur} \cdot 2^2 + 2. Solve for the value that makes the
// expression hit the target — evaluate with the slider at 0 and 1 (it enters
// linearly) and interpolate.
(function () {
  const base = window.__duo.duoGoal;
  window.__duo.duoGoal = function () {
    const g = base.call(this);
    if (g) return g;
    const lines = this.promptLatex();
    const A = this.ascii(lines.join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ').replace(/\s+/g, ' ');
    const tm = A.match(/create\s*f\(\s*-?\d+\s*\)\s*=\s*(-?[\d.]+)/i);
    if (!tm) return null;
    const target = parseFloat(tm[1]);
    let expr = null;
    for (const line of lines.slice().reverse()) {
      if (/duodisplay/.test(this.ascii(line))) { expr = this.ascii(line); break; }
    }
    if (expr === null) return null;
    const withVal = v => expr
      .replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/, '(' + v + ')')
      .replace(/^[^=]*=/, '');
    const f0 = this.evalExpr(withVal(0)), f1 = this.evalExpr(withVal(1));
    if (f0 === null || f1 === null) return null;
    const slope = f1 - f0;
    if (!slope) return null;
    const v = (target - f0) / slope;
    return isFinite(v) ? { kind: 'eq', v: Math.round(v * 1000) / 1000 } : null;
  };
})();
;'__duo ready';

// "Select the x-value for f(x) = 4" — inverse lookup against the table, the drawn
// curve, or a formula. (solveTableInverse only handled the table form.)
window.__duo.solveXForValue = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, '').replace(/\s+/g, '');
  const m = A.match(/f\(x\)&?=(-?[\d.]+)/); if (!m) return null;
  const y = parseFloat(m[1]);
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const xs = ch.map(e => parseFloat(half(this.ascii(e.innerText))));

  const T = this.fnTable();
  if (T) { const hit = T.find(r => r[1] === y); if (hit) { const i = xs.indexOf(hit[0]); if (i >= 0) return { i, want: hit[0] }; } }

  // formula: test each candidate x
  for (const line of this.promptLatex().slice().reverse()) {
    if (!/\(x\)\s*=|y\s*=/.test(this.ascii(line))) continue;
    if (/f\(x\)\s*=\s*-?[\d.]+\s*$/.test(this.ascii(line).replace(/[{}\\]|mathbf|textbf|text/g, ''))) continue;
    const f = this.compile(line); if (!f) continue;
    const hits = [];
    xs.forEach((x, i) => { if (!isNaN(x)) { try { if (Math.abs(f(x) - y) < 1e-9) hits.push(i); } catch (e) {} } });
    if (hits.length === 1) return { i: hits[0], want: xs[hits[0]] };
  }
  // drawn piecewise
  if (this.pieces()) {
    const hits = [];
    xs.forEach((x, i) => { const v = this.pieceAt(x); if (v !== null && Math.abs(v - y) < 0.15) hits.push(i); });
    if (hits.length === 1) return { i: hits[0], want: xs[hits[0]] };
  }
  return null;
};
window.__duo.RULES.splice(2, 0, ['solveXForValue', /x\s*-?\s*value/i]);
;'__duo ready';

// ---- parabolas (unit 157) ----
// Axis of symmetry / vertex, read from the drawn curve by sampling it and finding
// the turning point.
Object.assign(window.__duo, {
  vertexOf() {
    const c = this.curvePath(); if (!c) return null;
    const P = [];
    for (let i = 0; i <= 40; i++) P.push(c.at(i / 40));
    if (P.length < 5) return null;
    let lo = P[0], hi = P[0];
    for (const p of P) { if (p[1] < lo[1]) lo = p; if (p[1] > hi[1]) hi = p; }
    // the turning point is whichever extreme is not at an end of the drawn arc
    const ends = [P[0], P[P.length - 1]];
    const isEnd = p => ends.some(e => Math.abs(e[0] - p[0]) < 0.2 && Math.abs(e[1] - p[1]) < 0.2);
    const v = !isEnd(lo) ? lo : (!isEnd(hi) ? hi : null);
    if (!v) return null;
    return [Math.round(v[0] * 2) / 2, Math.round(v[1] * 2) / 2];
  },

  solveAxisOfSymmetry() {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    if (!/axis of symmetry|vertex/.test(A)) return null;
    let v = this.vertexOf();
    if (!v) {
      // from a formula: x = -b/2a
      for (const line of this.promptLatex().slice().reverse()) {
        const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
        const m = t.match(/=(-?\d*)x\^2([+-]\d*)x?([+-]\d+)?/);
        if (!m) continue;
        const a = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : +m[1]);
        const b = m[2] === '+' ? 1 : (m[2] === '-' ? -1 : +m[2]);
        if (a) { v = [-b / (2 * a), null]; break; }
      }
    }
    if (!v) return null;
    const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const wantVertex = /vertex/.test(A) && !/axis/.test(A);
    const i = ch.findIndex(e => {
      const s = half(this.ascii(e.innerText));
      if (wantVertex) {
        const m = s.match(/\((-?[\d.]+),(-?[\d.]+)\)/);
        return m && parseFloat(m[1]) === v[0] && (v[1] === null || parseFloat(m[2]) === v[1]);
      }
      const m = s.match(/^x=(-?[\d.]+)$/);
      return m && parseFloat(m[1]) === v[0];
    });
    return i < 0 ? { miss: v.join(',') } : { i, want: v.join(',') };
  },
});
window.__duo.RULES.splice(2, 0, ['solveAxisOfSymmetry', /axis of symmetry|vertex/i]);
;'__duo ready';

// A parabola is drawn as SEVERAL class="line" paths (one per branch), so sampling
// only the first gives half the curve and no turning point. Sample them all.
;'__duo ready';

// The drawn arc is CLIPPED, so its lowest sampled point is usually just the edge,
// not the vertex. Fit y = ax^2 + bx + c to the samples and take x = -b/2a.
window.__duo.vertexOf = function () {
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
  // least-squares quadratic fit
  let S = [0, 0, 0, 0, 0], T = [0, 0, 0];
  for (const [x, y] of pts) {
    S[0] += 1; S[1] += x; S[2] += x * x; S[3] += x * x * x; S[4] += x * x * x * x;
    T[0] += y; T[1] += x * y; T[2] += x * x * y;
  }
  const M = [[S[4], S[3], S[2]], [S[3], S[2], S[1]], [S[2], S[1], S[0]]];
  const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M); if (!D || !isFinite(D)) return null;
  const sub = (col, v) => M.map((row, r) => row.map((val, c) => (c === col ? v[r] : val)));
  const a = det3(sub(0, [T[2], T[1], T[0]])) / D;
  const b = det3(sub(1, [T[2], T[1], T[0]])) / D;
  const c = det3(sub(2, [T[2], T[1], T[0]])) / D;
  if (!isFinite(a) || Math.abs(a) < 1e-6) return null;
  const vx = -b / (2 * a), vy = a * vx * vx + b * vx + c;
  if (!isFinite(vx) || !isFinite(vy)) return null;
  return [Math.round(vx * 2) / 2, Math.round(vy * 2) / 2];
};
;'__duo ready';

// typed parabola answers: minimum / maximum value (the vertex's y), and the axis or
// vertex x when asked for


// Range of a parabola given by FORMULA: y = a(x-h)^2 + k has range [k, inf) when
// a > 0 and (-inf, k] when a < 0. Closed bracket, since the vertex is attained.
window.__duo.solveParabolaRange = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/range|domain/.test(A)) return null;
  let f = null;
  for (const line of this.promptLatex().slice().reverse()) {
    if (!/\(x\)\s*=|y\s*=/.test(this.ascii(line))) continue;
    const g = this.compile(line); if (!g) continue;
    try { if (isFinite(g(0)) && isFinite(g(1)) && isFinite(g(-1))) { f = g; break; } } catch (e) {}
  }
  if (!f) return null;
  // sample to find the extreme and confirm it is a parabola-like curve
  let best = null, opensUp = true;
  for (let x = -50; x <= 50; x += 0.5) {
    let v; try { v = f(x); } catch (e) { continue; }
    if (!isFinite(v)) continue;
    if (!best || v < best[1]) best = [x, v];
  }
  let worst = null;
  for (let x = -50; x <= 50; x += 0.5) {
    let v; try { v = f(x); } catch (e) { continue; }
    if (!isFinite(v)) continue;
    if (!worst || v > worst[1]) worst = [x, v];
  }
  if (!best || !worst) return null;
  opensUp = Math.abs(best[0]) < 49;               // a finite minimum means it opens up
  const k = Math.round((opensUp ? best[1] : worst[1]) * 1000) / 1000;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const isDomain = /domain/.test(A) && !/range/.test(A);
  const i = ch.findIndex(e => {
    const s = half(this.ascii(e.innerText)).replace(/\s/g, '');
    if (isDomain) return /^\(-?[∞infty]+,[∞infty]+\)$/.test(s.replace(/-infty|infty|∞/g, '∞').replace('(-∞','(-∞'));
    return opensUp ? new RegExp('^\\[' + k + ',(∞|infty)\\)$').test(s)
                   : new RegExp('^\\((-∞|-infty),' + k + '\\]$').test(s);
  });
  return i < 0 ? { miss: k } : { i, want: k };
};
window.__duo.RULES.splice(2, 0, ['solveParabolaRange', /range|domain/i]);
;'__duo ready';

// "Select the match" for a constraint like f(0) = 11: evaluate each candidate
// FORMULA at the given input and keep the one that satisfies it. Generic — works
// for any f(a)=b constraint, not just parabolas.
window.__duo.solveFormulaForConstraint = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, '').replace(/\s+/g, '');
  const m = A.match(/f\((-?[\d.]+)\)=(-?[\d.]+)/); if (!m) return null;
  const x = parseFloat(m[1]), y = parseFloat(m[2]);
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const S = ann.length === ch.length ? ann : ch.map(e => half(this.ascii(e.innerText)));
  const hits = [];
  S.forEach((s, i) => {
    if (!/=/.test(s)) return;
    const f = this.compile(s); if (!f) return;
    try { if (Math.abs(f(x) - y) < 1e-9) hits.push(i); } catch (e) {}
  });
  return hits.length === 1 ? { i: hits[0], want: y } : null;
};
window.__duo.RULES.splice(2, 0, ['solveFormulaForConstraint', null]);
;'__duo ready';

// "Place the point at the vertex" — one draggable point, target from the parabola
// fit (or from the formula when no curve is drawn).
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    if (/vertex|minimum|maximum/.test(A)) {
      const comps = this.dragComponents();
      if (comps.length === 1) {
        let v = this.vertexOf();
        if (!v) {
          for (const line of this.promptLatex().slice().reverse()) {
            const f = this.compile(line); if (!f) continue;
            let best = null;
            for (let x = -20; x <= 20; x += 0.5) {
              let y; try { y = f(x); } catch (e) { continue; }
              if (isFinite(y) && (!best || y < best[1])) best = [x, y];
            }
            if (best && Math.abs(best[0]) < 19) { v = [Math.round(best[0] * 2) / 2, Math.round(best[1] * 2) / 2]; break; }
          }
        }
        if (v && await this.moveComponent(comps[0], v)) return true;
      }
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    if (/vertex|minimum|maximum/.test(A) && this.dragComponents().length === 1)
      return { kind: 'vertexpoint', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// "Enter the leading / linear / constant coefficient" of a quadratic


// "Graph a function with zeros at -2, 2" where the slider fills a factor:
// y = (x+2)(x - \duodisplay{..}{cur}). Pick the slider value that makes the stated
// zeros true — test candidates by substituting into the factored form.
(function () {
  const base = window.__duo.duoGoal;
  window.__duo.duoGoal = function () {
    const g = base.call(this); if (g) return g;
    const lines = this.promptLatex();
    const A = this.ascii(lines.join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ').replace(/\s+/g, ' ');
    // a LaTeX \, thin space between the zeros leaves a stray comma: "-2, ,2"
    // "Graph a function with zeros at" and "Graph zeros at" are both used
    // phrasings seen: "zeros at -2, 2", "with zeros -3, 2", "Graph zeros at ..."
    const zm = A.match(/zeros?\s*(?:at\s*)?(-?[\d.]+)\s*,[\s,]*(-?[\d.]+)/i);
    if (!zm) return null;
    const zeros = [parseFloat(zm[1]), parseFloat(zm[2])];
    let expr = null;
    for (const line of lines.slice().reverse()) {
      if (/duodisplay/.test(this.ascii(line))) { expr = this.ascii(line); break; }
    }
    if (!expr) return null;
    for (let v = -10; v <= 10; v += 0.5) {
      const src = expr.replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/, '(' + v + ')');
      const f = this.compile(src); if (!f) continue;
      let ok = true;
      for (const z of zeros) { try { if (Math.abs(f(z)) > 1e-9) { ok = false; break; } } catch (e) { ok = false; break; } }
      if (ok) return { kind: 'eq', v };
    }
    return null;
  };
})();
;'__duo ready';

// "Graph the function through (-4,0), (5,0)" — the prompt names the exact points,
// so place each draggable point on one of them (left-to-right).
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const pts = [...A.matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)]
      .map(m => [parseFloat(m[1]), parseFloat(m[2])]);
    const comps = this.dragComponents();
    if (/through|passes/i.test(A) && pts.length >= 2 && comps.length === pts.length) {
      const want = pts.slice().sort((a, b) => a[0] - b[0]);
      const cs = comps.slice().sort((a, b) => a.P.x - b.P.x);
      let ok = true;
      for (let i = 0; i < cs.length; i++) ok = (await this.moveComponent(cs[i], want[i])) && ok;
      if (ok) return true;
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const n = [...A.matchAll(/\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)/g)].length;
    if (/through|passes/i.test(A) && n >= 2 && this.dragComponents().length === n)
      return { kind: 'through', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';
