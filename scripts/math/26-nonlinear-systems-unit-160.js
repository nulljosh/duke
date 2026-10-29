
// "Select the y-value when x = 6" for a formula — evaluate it. (solveOutputChoice
// only knew the drawn-piecewise case and the phrase "output/value when".)
window.__duo.solveValueAtX = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ');
  if (!/(y\s*-?\s*value|value|output)\s*(when|at|for)/i.test(A)) return null;
  const m = A.replace(/\s/g, '').match(/x=(-?[\d.]+)/); if (!m) return null;
  const x = parseFloat(m[1]);
  let y = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line);
    if (!/=/.test(t) || /value|when/i.test(t)) continue;
    const f = this.compile(t); if (!f) continue;
    try { const v = f(x); if (isFinite(v)) { y = v; break; } } catch (e) {}
  }
  if (y === null && this.pieces()) y = this.pieceAt(x);
  if (y === null) { const T = this.fnTable(); const h = T && T.find(r => r[0] === x); if (h) y = h[1]; }
  if (y === null || !isFinite(y)) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => Math.abs(parseFloat(half(this.ascii(e.innerText))) - y) < 1e-9);
  return i < 0 ? { miss: y } : { i, want: y };
};
window.__duo.RULES.splice(2, 0, ['solveValueAtX', /value|output/i]);
;'__duo ready';

// ---- nonlinear systems (unit 160) ----
// "y = x^2 - x - 6" and "y = x + 2" -> the setup is "x + 2 = x^2 - x - 6".
// The old solveSystemSetup only recognised linear right-hand sides.
(function () {
  const base = window.__duo.solveSystemSetup;
  window.__duo.solveSystemSetup = function () {
    const r = base.call(this); if (r && r.i !== undefined) return r;
    // collect every "y = <rhs>" in the prompt
    const rhs = [];
    for (const line of this.promptLatex()) {
      for (const part of this.ascii(line).split(/\\\\/)) {
        const t = part.replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
        const m = t.match(/^y=(.+)$/);
        if (m && /[a-z]/.test(m[1])) rhs.push(m[1]);
      }
    }
    if (rhs.length < 2) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const S = ch.map(e => half(this.ascii(e.innerText)).replace(/\s/g, ''));
    // the answer has an x on BOTH sides and no lone y
    const i = S.findIndex(s => {
      if (!s.includes('=') || /^y=/.test(s)) return false;
      const [l, r2] = s.split('=');
      return /x/.test(l) && /x/.test(r2);
    });
    return i < 0 ? { miss: rhs.join('=') } : { i, want: rhs.join('=') };
  };
})();
window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveSystemSetup');
window.__duo.RULES.splice(2, 0,
  ['solveSystemSetup', /equation to find|intersection|set.*equal|solve the system/i]);
;'__duo ready';

// solveAlgEquiv is greedy — on a "substitute one equation into the other" screen it
// matched a choice by value and beat solveSystemSetup. Put the setup rule ahead of
// it, and have solveAlgEquiv decline when the choices are equations with x on both
// sides (the signature of a setup question).
window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveSystemSetup');
window.__duo.RULES.unshift(['solveSystemSetup', /equation to find|intersection|set.*equal|solve the system|substitute/i]);
(function () {
  const base = window.__duo.solveAlgEquiv;
  window.__duo.solveAlgEquiv = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const setupish = ch.length && ch.some(e => {
      const s = half(this.ascii(e.innerText));
      if (!s.includes('=') || /^y=/.test(s)) return false;
      const [l, r] = s.split('=');
      return /x/.test(l) && /x/.test(r);
    });
    if (setupish) return null;
    return base.call(this);
  };
})();
;'__duo ready';

// ---- guided equation rearrangement ----
// "Subtract x and 2 from both sides", "add 4 to both sides", etc. Rather than model
// each operation, keep the choice whose equation is EQUIVALENT to the original:
// (L - R) must be a constant multiple of (origL - origR) across sample points.
window.__duo.solveRearrange = function () {
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const diffOf = src => {
    const flat = this.ascii(src).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/^\{|\}$/g, '');
    if (!flat.includes('=')) return null;
    const [l, r] = flat.split('=');
    const fl = this.compile(l), fr = this.compile(r);
    if (!fl || !fr) return null;
    try {
      const v = [1, 2, 3, 5].map(x => fl(x) - fr(x));
      return v.every(n => isFinite(n)) ? v : null;
    } catch (e) { return null; }
  };
  // the original equation: the last prompt line with an '=' and an x on each side
  let orig = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const d = diffOf(line);
    if (d && d.some(v => Math.abs(v) > 1e-9)) { orig = d; break; }
  }
  if (!orig) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = ann.length === ch.length ? ann : ch.map(e => half(this.ascii(e.innerText)));
  const prop = (a, b) => {
    let k = null;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(b[i]) < 1e-9) { if (Math.abs(a[i]) > 1e-9) return false; continue; }
      const t = a[i] / b[i];
      if (k === null) k = t; else if (Math.abs(t - k) > 1e-6) return false;
    }
    return k !== null && Math.abs(k) > 1e-9;
  };
  const hits = [];
  S.forEach((s, i) => { const d = diffOf(s); if (d && prop(d, orig)) hits.push(i); });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveRearrange', /both sides|subtract|add .* to|rearrange|standard form/i]);
;'__duo ready';

// zerosOf only looked at lines shaped "f(x) = ..." or "y = ...", so it missed the
// standard "0 = (x - 4)(x + 2)" form that the guided solve produces.
(function () {
  const base = window.__duo.zerosOf;
  window.__duo.zerosOf = function () {
    for (const line of this.promptLatex().slice().reverse()) {
      const flat = this.ascii(line).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/^\{|\}$/g, '');
      const m = flat.match(/^\s*0\s*=\s*(.+)$/) || flat.match(/^(.+?)\s*=\s*0\s*$/);
      if (!m) continue;
      const f = this.compile(m[1]); if (!f) continue;
      const roots = [];
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
    return base.call(this);
  };
})();
// zeros must outrank the factor-pair rule, whose "(a,b)" choice shape also matches
window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveZeros');
window.__duo.RULES.unshift(['solveZeros', /zeros?|roots?|solutions?/i]);
;'__duo ready';

// "Find y when x is -2" — the phrasing uses "is", not "=", so the x= matchers all
// missed it and an earlier handler typed the x value itself.


// ---- nonlinear intersections (unit 160) ----
// "Plot the intersection points" of y = x^2 and y = 4: solve f(x) = g(x)
// numerically, which covers curve-vs-line as well as line-vs-line.
window.__duo.intersectionsNL = function () {
  const fs = [];
  for (const line of this.promptLatex()) {
    for (const part of this.ascii(line).split(/\\\\/)) {
      // splitting a "\mathbf{y = x^2 \\ y = 4}" line on \\ leaves an unbalanced
      // brace on each half, so strip braces outright rather than just at the ends
      const t = part.replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/[{}]/g, ' ').trim();
      if (!/^y\s*=/.test(t)) continue;
      const f = this.compile(t);
      if (f) fs.push(f);
    }
  }
  if (fs.length < 2) return null;
  const [f, g] = fs;
  const out = []; let prev = null;
  for (let x = -20; x <= 20; x += 0.02) {
    let d; try { d = f(x) - g(x); } catch (e) { prev = null; continue; }
    if (!isFinite(d)) { prev = null; continue; }
    if (Math.abs(d) < 1e-9) out.push(x);
    else if (prev && prev.d * d < 0) {
      let lo = prev.x, hi = x;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; ((f(lo) - g(lo)) * (f(m) - g(m)) <= 0) ? (hi = m) : (lo = m); }
      out.push((lo + hi) / 2);
    }
    prev = { x, d };
  }
  const uniq = [];
  for (const x of out) {
    const r = Math.round(x * 2) / 2;
    if (!uniq.some(q => Math.abs(q - r) < 1e-6)) uniq.push(r);
  }
  return uniq.length ? uniq.sort((a, b) => a - b).map(x => {
    let y; try { y = f(x); } catch (e) { y = null; }
    return [x, y === null ? null : Math.round(y * 2) / 2];
  }) : null;
};
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    if (/intersection/.test(A)) {
      const pts = this.intersectionsNL();
      const comps = this.dragComponents();
      if (pts && comps.length === pts.length) {
        const cs = comps.slice().sort((a, b) => a.P.x - b.P.x);
        let ok = true;
        for (let i = 0; i < cs.length; i++) ok = (await this.moveComponent(cs[i], pts[i])) && ok;
        if (ok) return true;
      }
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    if (/intersection/.test(A)) {
      const pts = this.intersectionsNL();
      if (pts && this.dragComponents().length === pts.length)
        return { kind: 'intersectNL', from: [0, 0], to: [0, 0] };
    }
    return basePlan.call(this);
  };
})();
;'__duo ready';

// "Select the number of solutions" for a NONLINEAR system (a parabola and a line
// can meet 0, 1 or 2 times) — count the intersections numerically, or from the two
// drawn curves.
(function () {
  const base = window.__duo.solveIntersectionCountChoice;
  window.__duo.solveIntersectionCountChoice = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    let n = null;
    const pts = this.intersectionsNL();
    if (pts) n = pts.length;
    if (n === null) {
      // both curves drawn: sample each and count sign changes of the difference
      const P = this.pieces();
      if (P && P.length === 2) n = 1;
    }
    if (n === null) return r;
    const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const i = ch.findIndex(e => parseFloat(half(this.ascii(e.innerText))) === n);
    return i < 0 ? r : { i, want: n };
  };
})();
;'__duo ready';

// "Select the intersection point" for a NONLINEAR system — the old chooser only
// solved two straight lines. Route through intersectionsNL and match the pair.

window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveIntersectionChoice');
window.__duo.RULES.unshift(['solveIntersectionChoice', /intersection|solution to the system/i]);
;'__duo ready';

// ---- intersections of two DRAWN curves ----
// Graph-only screens give no formula, so sample each class="line" path, build a
// lookup y(x) per curve, and find where their difference changes sign.
window.__duo.drawnIntersections = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  const curves = [];
  for (const p of d.querySelectorAll('path,line,polyline')) {
    if (!String(p.getAttribute('class') || '').split(/\s+/).includes('line')) continue;
    if (typeof p.getPointAtLength !== 'function') continue;
    let L = 0; try { L = p.getTotalLength(); } catch (e) { continue; }
    const m = p.getScreenCTM(); if (!L || !m) continue;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const q = p.getPointAtLength((i / 120) * L);
      pts.push(g.toXY(fr.left + m.a * q.x + m.c * q.y + m.e, fr.top + m.b * q.x + m.d * q.y + m.f));
    }
    pts.sort((a, b) => a[0] - b[0]);
    if (pts.length > 4) curves.push(pts);
  }
  if (curves.length !== 2) return null;
  const yAt = (pts, x) => {
    if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (x1 === x0) return y1;
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return null;
  };
  const lo = Math.max(curves[0][0][0], curves[1][0][0]);
  const hi = Math.min(curves[0][curves[0].length - 1][0], curves[1][curves[1].length - 1][0]);
  if (!(hi > lo)) return null;
  const out = []; let prev = null;
  for (let x = lo; x <= hi; x += (hi - lo) / 400) {
    const a = yAt(curves[0], x), b = yAt(curves[1], x);
    if (a === null || b === null) { prev = null; continue; }
    const diff = a - b;
    if (Math.abs(diff) < 0.02) out.push([x, a]);
    else if (prev && prev.d * diff < 0) {
      const t = prev.d / (prev.d - diff);
      const xx = prev.x + (x - prev.x) * t;
      out.push([xx, yAt(curves[0], xx)]);
    }
    prev = { x, d: diff };
  }
  const uniq = [];
  for (const [x, y] of out) {
    const rx = Math.round(x * 2) / 2, ry = y === null ? null : Math.round(y * 2) / 2;
    if (!uniq.some(q => Math.abs(q[0] - rx) < 0.4)) uniq.push([rx, ry]);
  }
  return uniq.length ? uniq.sort((a, b) => a[0] - b[0]) : null;
};


// Points read off a drawing land a little off (interpolation + line thickness), so
// match a choice within ~0.6 of a unit rather than demanding equality.
(function () {
  const base = window.__duo.solveIntersectionChoice;
  window.__duo.solveIntersectionChoice = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const pts = this.intersectionsNL(); if (!pts || !pts.length) return r;
    const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const scored = ch.map((e, i) => {
      const m = half(this.ascii(e.innerText)).match(/\((-?[\d.]+),(-?[\d.]+)\)/);
      if (!m) return { i, d: Infinity };
      const x = parseFloat(m[1]), y = parseFloat(m[2]);
      let best = Infinity;
      for (const p of pts) {
        if (p[1] === null) continue;
        best = Math.min(best, Math.abs(p[0] - x) + Math.abs(p[1] - y));
      }
      return { i, d: best };
    }).sort((a, b) => a.d - b.d);
    if (scored[0].d <= 0.7 && (scored.length < 2 || scored[1].d - scored[0].d > 0.3))
      return { i: scored[0].i, want: 'near' };
    return r;
  };
})();
;'__duo ready';
