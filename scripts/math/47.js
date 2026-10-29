
// The drawn arc may be only part of the circle, so a bounding box lies. Fit the
// centre and radius by least squares over the sampled points instead.
window.__duo.circleFromCurve = function () {
  const c = this.curvePath(); if (!c) return null;
  const P = [];
  for (let i = 0; i <= 120; i++) { const p = c.at(i / 120); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); }
  if (P.length < 20) return null;
  // solve for (h, k, C) in x^2+y^2 = 2hx + 2ky + C  (linear least squares)
  let Sxx = 0, Sxy = 0, Syy = 0, Sx = 0, Sy = 0, S1 = 0, Sxz = 0, Syz = 0, Sz = 0;
  for (const [x, y] of P) {
    const z = x * x + y * y;
    Sxx += x * x; Sxy += x * y; Syy += y * y; Sx += x; Sy += y; S1 += 1;
    Sxz += x * z; Syz += y * z; Sz += z;
  }
  const A = [[2 * Sxx, 2 * Sxy, Sx], [2 * Sxy, 2 * Syy, Sy], [2 * Sx, 2 * Sy, S1]];
  const B = [Sxz, Syz, Sz];
  const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(A); if (Math.abs(D) < 1e-9) return null;
  const rep = (m, col, v) => m.map((row, i) => row.map((x, j) => j === col ? v[i] : x));
  const h = det3(rep(A, 0, B)) / D;
  const k = det3(rep(A, 1, B)) / D;
  const Cc = det3(rep(A, 2, B)) / D;
  const r2 = Cc + h * h + k * k;
  if (!(r2 > 0)) return null;
  const r = Math.sqrt(r2);
  // check the fit really is circular
  for (const [x, y] of P) if (Math.abs(Math.hypot(x - h, y - k) - r) > 0.25) return null;
  const rr = Math.round(r);
  return { h: Math.round(h), k: Math.round(k), r: rr, r2: rr * rr };
};
;'__duo ready';

// "Substitute the radius into the equation": x^2 + y^2 = r^2 — the SQUARED form
// is right, the bare r is the decoy.
window.__duo.solveCircleEquation = function () {
  const ins = this.curInstruction() + ' ' + this.promptTitle();
  if (!/circle|radius|equation/i.test(ins)) return null;
  const C = this.circleFromEquation() || this.circleFromCurve() || this.circleFromDrawing();
  let r = C ? C.r : null;
  if (r === null) {
    const m = this.promptLatex().map(l => this.ascii(l)).join(' ').match(/radius[^\d]{0,12}(\d+(?:\.\d+)?)/i);
    if (m) r = parseFloat(m[1]);
  }
  if (r === null) return null;
  const h = C ? C.h : 0, k = C ? C.k : 0;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.ascii(this.choiceLatex(e))
      .replace(/\\(mathbf|textbf|text|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    // accept r^2 written either as "3^2" or already evaluated as "9"
    const m = t.match(/^\(?x([+-][\d.]+)?\)?\^?2\+\(?y([+-][\d.]+)?\)?\^?2=(.+)$/);
    if (!m) return;
    const hh = m[1] ? -parseFloat(m[1]) : 0, kk = m[2] ? -parseFloat(m[2]) : 0;
    if (Math.abs(hh - h) > 1e-9 || Math.abs(kk - k) > 1e-9) return;
    const v = this.evalTrigExpr(m[3]);
    if (v !== null && Math.abs(v - r * r) < 1e-9) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveCircleEquation', /circle|radius|substitute/i]);
;'__duo ready';

// evalTrigExpr never translated "^" to exponentiation, so "3^2" failed.


// In "write the equation from its graph" lessons the printed equation belongs
// to an EARLIER step, so reading it gave the previous circle's radius. When a
// circle is actually drawn, the drawing wins.
window.__duo.currentCircle = function () {
  return this.circleFromCurve() || this.circleFromDrawing() || this.circleFromEquation();
};


// "Create a circle with radius 3": one draggable point sets the radius from the
// circle's centre — move it that many units away.
window.__duo.solveMakeCircle = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  if (!/createacircle|circlewithradius/.test(all)) return false;
  const m = all.match(/radius(-?[\d.]+)/); if (!m) return false;
  const r = parseFloat(m[1]);
  const pts = this.gridPoints(); if (pts.length !== 1) return false;
  const p = pts[0];
  const drag = new Set(pts.map(q => q.x + ',' + q.y));
  const statics = this.plottedPoints().filter(q => !drag.has(q[0] + ',' + q[1]));
  const c = statics.length ? statics[0] : [0, 0];
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  for (const t of [[c[0] + r, c[1]], [c[0] - r, c[1]], [c[0], c[1] + r], [c[0], c[1] - r]]) {
    if (t[0] < x0 || t[0] > x1 || t[1] < y0 || t[1] > y1) continue;
    if (Math.abs(p.x - t[0]) < 1e-9 && Math.abs(p.y - t[1]) < 1e-9) return true;
    await this.dragPointTo(p, t[0], t[1]);
    const q = this.gridPoints()[0];
    if (q && Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6) return true;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMakeCircle()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// The radius can also be set by a slider rather than a draggable point.
(function () {
  const base = window.__duo.solveMakeCircle;
  window.__duo.solveMakeCircle = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/createacircle|circlewithradius/.test(all)) return false;
    const m = all.match(/radius(-?[\d.]+)/); if (!m) return await base.call(this);
    const r = parseFloat(m[1]);
    const S = this.slider2d();
    if (S && r >= S.s.min && r <= S.s.max) return await this.setSlider2d(r);
    return await base.call(this);
  };
})();
;'__duo ready';

// "Create the circle" given its equation: the slider holds the radius, which is
// sqrt of the right-hand side.
(function () {
  const base = window.__duo.solveMakeCircle;
  window.__duo.solveMakeCircle = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (/createthecircle|createacircle/.test(all)) {
      const C = this.circleFromEquation();
      const S = this.slider2d();
      if (C && S && C.r >= S.s.min && C.r <= S.s.max) return await this.setSlider2d(C.r);
    }
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the point on the circle": the point whose distance from the centre
// equals the radius.
window.__duo.solvePointOnCircle = function () {
  if (!/point on the circle/i.test(this.curInstruction())) return null;
  const C = this.currentCircle(); if (!C) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => { const p = this.choicePair(e); if (!p) return;
    if (Math.abs(Math.hypot(p[0] - C.h, p[1] - C.k) - C.r) < 0.05) hits.push(i); });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solvePointOnCircle', /point on the circle/i]);
;'__duo ready';

// The equation can be written with the terms in either order (y^2 + x^2 = 9),
// which the x-first pattern missed.
window.__duo.circleFromEquation = function () {
  for (const l of this.promptLatex()) {
    const t = this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    if (!/=/.test(t)) continue;
    const [lhs, rhs] = t.split('=');
    if (!lhs || !rhs) continue;
    const r2 = parseFloat(rhs);
    if (!isFinite(r2) || r2 <= 0) continue;
    const gx = lhs.match(/\(?x([+-][\d.]+)?\)?\^?2/);
    const gy = lhs.match(/\(?y([+-][\d.]+)?\)?\^?2/);
    if (!gx || !gy) continue;
    const h = gx[1] ? -parseFloat(gx[1]) : 0;
    const k = gy[1] ? -parseFloat(gy[1]) : 0;
    return { h, k, r: Math.sqrt(r2), r2 };
  }
  return null;
};
;'__duo ready';

// Vertex form y = a(x - h)^2 + k  ->  vertex (h, k). Complements the existing
// curve-fitting vertex finder, which needs a drawn parabola.
window.__duo.vertexFromEquation = function () {
  for (const l of this.promptLatex()) {
    const t = this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/[{}~\\]/g, '').replace(/[−–—]/g, '-').replace(/\s/g, '');
    const m = t.match(/^y=(-?[\d.]*)\(x([+-][\d.]+)\)\^?2([+-][\d.]+)?$/);
    if (m) {
      const h = -parseFloat(m[2]);
      const k = m[3] ? parseFloat(m[3]) : 0;
      return [h, k];
    }
    const n = t.match(/^y=(-?[\d.]*)x\^?2([+-][\d.]+)?$/);
    if (n) return [0, n[2] ? parseFloat(n[2]) : 0];
  }
  return null;
};


// wording varies: "Create a segment of length 5" as well as "with 5 units"
(function () {
  const base = window.__duo.solveSegmentLength;
  window.__duo.solveSegmentLength = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/segment(with|oflength)|createasegment/.test(all)) return await base.call(this);
    const m = all.match(/(?:oflength|with)(-?\d+(?:\.\d+)?)(?:units?)?/) || all.match(/(\d+(?:\.\d+)?)units?/);
    if (!m) return await base.call(this);
    const want = parseFloat(m[1]);
    const pts = this.gridPoints(); if (pts.length !== 2) return await base.call(this);
    const [a, b] = pts;
    if (Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - want) < 1e-9) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    const inR = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const cands = [[a.x + want, a.y], [a.x - want, a.y], [a.x, a.y + want], [a.x, a.y - want]];
    for (const t of cands) {
      if (!inR(t[0], t[1])) continue;
      await this.dragPointTo(this.gridPoints()[1], t[0], t[1]);
      const q = this.gridPoints();
      if (q.length === 2 && Math.abs(Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) - want) < 1e-6) return true;
    }
    return false;
  };
})();
;'__duo ready';

// "Select the distance between the points": measure the two plotted points (or
// the pair named in the prompt) and match by VALUE, so radical answers work.
window.__duo.solvePointDistance = function () {
  if (!/distance between/i.test(this.curInstruction())) return null;
  let a = null, b = null;
  const P = this.plottedPoints();
  if (P.length === 2) { a = P[0]; b = P[1]; }
  else { const pp = this.promptPairs(); if (pp.length >= 2) { a = pp[0]; b = pp[1]; } }
  if (!a || !b) return null;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.radValue(this.choiceLatex(e));
    return v !== null && Math.abs(v - d) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePointDistance', /distance between/i]);


// "Create a segment with this length" + a separate "length = 5" line
(function () {
  const base = window.__duo.solveSegmentLength;
  window.__duo.solveSegmentLength = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/createasegment|segment(with|oflength)/.test(all)) return await base.call(this);
    let m = all.match(/length[=:](-?\d+(?:\.\d+)?)/)
         || all.match(/(?:oflength|with)(-?\d+(?:\.\d+)?)/)
         || all.match(/(\d+(?:\.\d+)?)units?/);
    if (!m) return await base.call(this);
    const want = parseFloat(m[1]);
    const pts = this.gridPoints(); if (pts.length !== 2) return await base.call(this);
    const [a] = pts;
    if (Math.abs(Math.hypot(pts[1].x - a.x, pts[1].y - a.y) - want) < 1e-9) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    const inR = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    for (const t of [[a.x + want, a.y], [a.x - want, a.y], [a.x, a.y + want], [a.x, a.y - want]]) {
      if (!inR(t[0], t[1])) continue;
      await this.dragPointTo(this.gridPoints()[1], t[0], t[1]);
      const q = this.gridPoints();
      if (q.length === 2 && Math.abs(Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) - want) < 1e-6) return true;
    }
    return false;
  };
})();
;'__duo ready';

// A long segment may not fit from the existing anchor (length 7 on a -5..5
// grid), so move BOTH endpoints: search the grid for any pair at the required
// distance, preferring the smallest total movement.
(function () {
  const base = window.__duo.solveSegmentLength;
  window.__duo.solveSegmentLength = async function () {
    if (await base.call(this)) return true;
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/createasegment|segment(with|oflength)/.test(all)) return false;
    const m = all.match(/length[=:](-?\d+(?:\.\d+)?)/) || all.match(/(?:oflength|with)(-?\d+(?:\.\d+)?)/);
    if (!m) return false;
    const want = parseFloat(m[1]);
    const pts = this.gridPoints(); if (pts.length !== 2) return false;
    if (Math.abs(Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) - want) < 1e-9) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    let best = null, bestCost = Infinity;
    for (let ax = x0; ax <= x1; ax++) for (let ay = y0; ay <= y1; ay++)
      for (const [dx, dy] of [[want, 0], [-want, 0], [0, want], [0, -want]]) {
        const bx = ax + dx, by = ay + dy;
        if (bx < x0 || bx > x1 || by < y0 || by > y1) continue;
        const cost = Math.hypot(ax - pts[0].x, ay - pts[0].y) + Math.hypot(bx - pts[1].x, by - pts[1].y);
        if (cost < bestCost) { bestCost = cost; best = [[ax, ay], [bx, by]]; }
      }
    if (!best) return false;
    for (let i = 0; i < 2; i++) {
      const p = this.gridPoints()[i]; if (!p) return false;
      if (Math.abs(p.x - best[i][0]) < 1e-9 && Math.abs(p.y - best[i][1]) < 1e-9) continue;
      await this.dragPointTo(p, best[i][0], best[i][1]);
    }
    const q = this.gridPoints();
    return q.length === 2 && Math.abs(Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) - want) < 1e-6;
  };
})();
;'__duo ready';

// Partitioning a segment in a ratio a:b — the point sits a/(a+b) of the way
// along, so "the fraction for a 3:1 ratio" is 3/4.
window.__duo.ratioFraction = function () {
  const t = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const m = t.match(/(\d+)[:.](\d+)ratio/i) || t.match(/ratioof(\d+)[:.](\d+)/i);
  if (!m) return null;
  const a = parseFloat(m[1]), b = parseFloat(m[2]);
  return (a + b) ? a / (a + b) : null;
};
window.__duo.solveRatioFraction = function () {
  const v = this.ratioFraction(); if (v === null) return null;
  if (!/fraction|ratio/i.test(this.curInstruction())) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 1e-9; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveRatioFraction', /ratio|fraction/i]);
;'__duo ready';

// Unit 197: solids. "base area = <slider> * 5" style templates — solve for the
// slider so the stated target is met (reuses the sum-slider idea for products).
window.__duo.solveTargetSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const raw = this.promptLatex().find(l => /duodisplay/.test(this.ascii(l)));
  if (!raw) return false;
  // the target: a number stated in the title ("Make the base area 30")
  let target = null, byPi = false;
  const parts = this.mathParts().concat([this.promptTitle()]);
  const asks = parts.some(t => /make|create|build/i.test(String(t)));
  for (const t of parts) {
    const f = String(t).replace(/\s/g, '');
    // the number may live in its own emphasised part, away from "Create a ..."
    // "Create f(1) = 2" puts punctuation between the verb and the target
    const m = f.match(/(?:make|create|build)[^=]*?=?\s*(-?\d+(?:\.\d+)?)(pi)?$/i)
           || (asks ? f.match(/^(-?\d+(?:\.\d+)?)(pi)?$/i) : null);
    if (m) { target = parseFloat(m[1]); byPi = !!m[2]; break; }
  }
  if (target === null) return false;
  for (let v = S.s.min; v <= S.s.max; v += S.s.step) {
    const expr = this.ascii(raw)
      .replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/g, '(' + v + ')')
      // \frac{1}{3} must become (1)/(3) BEFORE braces are stripped
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\(mathbf|textbf|text)\b/g, '')
      .replace(/\\cdot|\\times/g, '*')
      // "16\pi" vs "\pi r^2": pi cancels on both sides, so drop it.
      .replace(/\\pi/g, byPi ? '' : '(3.141592653589793)')
      .replace(/[{}\s\\]/g, '')
      .split('=').pop();
    const g = this.compile(expr); if (!g) continue;
    let out; try { out = g(0); } catch (e) { continue; }
    if (isFinite(out) && Math.abs(out - target) < 1e-9) return await this.setSlider2d(v);
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveTargetSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Create a rectangular prism with height = 4": the stated quantity IS the
// slider value, written with "=" rather than "set ... to".
(function () {
  const base = window.__duo.solveSetSlider;
  window.__duo.solveSetSlider = async function () {
    if (await base.call(this)) return true;
    const S = this.slider2d(); if (!S) return false;
    const parts = this.mathParts();
    for (const t of parts) {
      const m = String(t).replace(/\s/g, '')
        .match(/^(?:height|width|length|base|radius|depth|side)[=:](-?\d+(?:\.\d+)?)$/i);
      if (!m) continue;
      const v = parseFloat(m[1]);
      if (v < S.s.min || v > S.s.max) continue;
      return await this.setSlider2d(v);
    }
    return false;
  };
})();
;'__duo ready';
