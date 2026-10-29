
// "Select a pair of corresponding vertices": the pre-image vertex and its
// image. Work out the transformation from the two figures, then keep the choice
// whose two named points actually map onto each other.
window.__duo.solveCorrespondingVertices = function () {
  if (!/corresponding vert/i.test(this.curInstruction())) return null;
  const N = this.namedPoints(); if (!N) return null;
  const plain = Object.keys(N).filter(k => !/'/.test(k));
  const prime = Object.keys(N).filter(k => /'/.test(k));
  if (!plain.length || !prime.length) return null;
  const A = plain.map(k => N[k]), B = prime.map(k => N[k]);
  // a rigid motion preserves the vertex ORDER around each figure, so match by
  // the shift/rotation that maps the whole set
  const cA = [A.reduce((s, p) => s + p[0], 0) / A.length, A.reduce((s, p) => s + p[1], 0) / A.length];
  const cB = [B.reduce((s, p) => s + p[0], 0) / B.length, B.reduce((s, p) => s + p[1], 0) / B.length];
  const map = {};
  for (const k of plain) {
    const rel = [N[k][0] - cA[0], N[k][1] - cA[1]];
    let best = null, bd = Infinity;
    for (const q of prime) {
      const rq = [N[q][0] - cB[0], N[q][1] - cB[1]];
      const d = Math.hypot(rq[0] - rel[0], rq[1] - rel[1]);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) map[k] = best;
  }
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/[’]/g, "'").replace(/and|,/gi, '');
    const m = t.match(/([A-Z])([A-Z]')/) || t.match(/([A-Z])'?\s*([A-Z]')/);
    return m && map[m[1]] === m[2];
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCorrespondingVertices', /corresponding vert/i]);
;'__duo ready';

// Unit 187: dilations. With a scale factor k, the image sits farther from the
// centre when k > 1, closer when k < 1, and the same distance when k == 1.
window.__duo.scaleFactorFromPrompt = function () {
  const lines = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/[{}&~\s\\]/g, '').replace(/[−–—]/g, '-'));
  for (const t of lines) {
    const m = t.match(/scalefactor=(.+)$/i);
    if (!m) continue;
    const g = this.compile(m[1]);
    if (g) { try { const v = g(0); if (isFinite(v)) return v; } catch (e) {} }
    const f = m[1].match(/^\(?\(?(-?[\d.]+)\)?\/\(?(-?[\d.]+)\)?\)?$/);
    if (f) { const v = parseFloat(f[1]) / parseFloat(f[2]); if (isFinite(v)) return v; }
  }
  return null;
};
window.__duo.solveDilationDistance = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  if (!words.some(w => /closer|farther|further|samedistance/.test(w))) return null;
  const k = this.scaleFactorFromPrompt(); if (k === null) return null;
  const want = Math.abs(k - 1) < 1e-9 ? 'same' : (Math.abs(k) > 1 ? 'far' : 'clos');
  const i = words.findIndex(w => want === 'same' ? w.startsWith('same')
                               : want === 'far' ? (w.startsWith('farther') || w.startsWith('further'))
                               : w.startsWith('closer'));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveDilationDistance', /scale factor|closer|farther/i]);
;'__duo ready';

// the LaTeX thin space \, survives as a stray comma, so the captured expression
// began with "," and never compiled


// "Dilate the point with scale factor k": image = centre + k * (point - centre).
window.__duo.solveDilatePoints = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').toLowerCase();
  if (!/dilat|scale factor/.test(all)) return false;
  const k = this.scaleFactorFromPrompt(); if (k === null) return false;
  const pts = this.gridPoints(); if (!pts.length) return false;
  const c = this.centrePoint();
  const targets = pts.map(p => [
    Math.round((c[0] + k * (p.x - c[0])) * 1e6) / 1e6,
    Math.round((c[1] + k * (p.y - c[1])) * 1e6) / 1e6]);
  if (targets.every((t, i) => Math.abs(t[0] - pts[i].x) < 1e-9 && Math.abs(t[1] - pts[i].y) < 1e-9)) return false;
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  if (targets.some(t => t[0] < x0 || t[0] > x1 || t[1] < y0 || t[1] > y1)) return false;
  for (let i = 0; i < pts.length; i++) {
    const p = this.gridPoints()[i]; if (!p) return false;
    if (Math.abs(p.x - targets[i][0]) < 1e-9 && Math.abs(p.y - targets[i][1]) < 1e-9) continue;
    await this.dragPointTo(p, targets[i][0], targets[i][1]);
  }
  const now = this.gridPoints();
  return targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6));
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveDilatePoints()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// thin spaces land on BOTH sides of the "=" ("scale factor ,= ,3")
(function () {
  const base = window.__duo.scaleFactorFromPrompt;
  window.__duo.scaleFactorFromPrompt = function () {
    const v = base.call(this); if (v !== null) return v;
    const lines = this.promptLatex().map(l => this.ascii(l)
      .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/[{}&~\s\\]/g, '').replace(/[−–—]/g, '-'));
    for (const t of lines) {
      const m = t.match(/scalefactor[,\s]*=[,\s]*(.+)$/i);
      if (!m) continue;
      const expr = m[1].replace(/^[,\s]+/, '');
      const g = this.compile(expr);
      if (g) { try { const q = g(0); if (isFinite(q)) return q; } catch (e) {} }
      const f = expr.match(/\(*(-?[\d.]+)\)*\/\(*(-?[\d.]+)\)*/);
      if (f) { const q = parseFloat(f[1]) / parseFloat(f[2]); if (isFinite(q)) return q; }
      const n = parseFloat(expr); if (isFinite(n)) return n;
    }
    return null;
  };
  // the dilation centre is a STATIC point, never the draggable one
  const bc = window.__duo.centrePoint;
  window.__duo.centrePoint = function () {
    const drag = new Set(this.gridPoints().map(p => p.x + ',' + p.y));
    const statics = this.plottedPoints().filter(p => !drag.has(p[0] + ',' + p[1]));
    const labs = (this.diagramLabels() || []).filter(l => /^[a-z]$/.test(l.t.trim()));
    const d = this.diagram();
    if (labs.length === 1 && d && d.M.grid && statics.length) {
      let px; try { px = d.M.grid.pixelToGrid([labs[0].x, labs[0].y]); } catch (e) { px = null; }
      if (px) {
        let best = null, bd = Infinity;
        for (const p of statics) { const dd = Math.hypot(p[0] - px[0], p[1] - px[1]); if (dd < bd) { bd = dd; best = p; } }
        if (best && bd < 3.5) return best;
      }
    }
    if (statics.length === 1) return statics[0];
    return bc.call(this);
  };
})();
;'__duo ready';

// "Select the scale factor from A to A'": ratio of the distances from the
// centre, measured off the plotted points.
window.__duo.measuredScaleFactor = function () {
  const N = this.namedPoints();
  let pre = null, img = null, c = null;
  if (N) {
    const keys = Object.keys(N);
    const plain = keys.find(k => /^[A-Z]$/.test(k));
    const prime = keys.find(k => /^[A-Z]'$/.test(k));
    const cen = keys.find(k => /^[a-z]$/.test(k));
    if (plain && prime) { pre = N[plain]; img = N[prime]; c = cen ? N[cen] : null; }
  }
  if (!c) c = this.centrePoint();
  if (!pre || !img || !c) return null;
  const d1 = Math.hypot(pre[0] - c[0], pre[1] - c[1]);
  const d2 = Math.hypot(img[0] - c[0], img[1] - c[1]);
  if (d1 < 1e-9) return null;
  const k = d2 / d1;
  return isFinite(k) ? Math.round(k * 1000) / 1000 : null;
};
window.__duo.solveScaleFactorChoice = function () {
  if (!/scale factor/i.test(this.curInstruction())) return null;
  const k = this.measuredScaleFactor(); if (k === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - k) < 0.02; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveScaleFactorChoice', /scale factor/i]);


// Rounding k to 3 decimals (0.333) made the fraction search miss 1/3.
// Keep the exact ratio and snap to a small fraction.
window.__duo.measuredScaleFactorRaw = function () {
  const N = this.namedPoints();
  let pre = null, img = null, c = null;
  if (N) {
    const keys = Object.keys(N);
    const plain = keys.find(k => /^[A-Z]$/.test(k));
    const prime = keys.find(k => /^[A-Z]'$/.test(k));
    const cen = keys.find(k => /^[a-z]$/.test(k));
    if (plain && prime) { pre = N[plain]; img = N[prime]; c = cen ? N[cen] : null; }
  }
  if (!c) c = this.centrePoint();
  if (!pre || !img || !c) return null;
  const d1 = Math.hypot(pre[0] - c[0], pre[1] - c[1]);
  const d2 = Math.hypot(img[0] - c[0], img[1] - c[1]);
  return d1 < 1e-9 ? null : d2 / d1;
};


// "Select the length of the dilated segment with scale factor k": the answer is
// the MULTIPLICATION expression (4 * 5), not the sum or the power.
window.__duo.solveDilatedLength = function () {
  const ins = this.curInstruction();
  if (!/dilated (segment|side|length)|length of the dilated/i.test(ins)) return null;
  const k = this.scaleFactorFromPrompt();
  const nums = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim())).map(l => parseFloat(l.t));
  const len = nums.length ? nums[0] : this.shapeSideLength();
  if (k === null || len === null || len === undefined) return null;
  const want = len * k;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  // prefer a product of exactly the two numbers, then any expression with the
  // right value
  let i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/cdot|times/g, '*');
    const m = t.match(/^(-?[\d.]+)\*(-?[\d.]+)$/);
    return m && Math.abs(parseFloat(m[1]) * parseFloat(m[2]) - want) < 1e-6
             && [len, k].every(v => [parseFloat(m[1]), parseFloat(m[2])].some(x => Math.abs(x - v) < 1e-6));
  });
  if (i < 0) i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveDilatedLength', /dilated/i]);
;'__duo ready';

// scale factor k: k > 1 makes the image larger, k < 1 smaller, k == 1 same size
window.__duo.solveScaleSize = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
  const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
  if (!words.some(w => /larger|smaller|samesize/.test(w))) return null;
  const k = this.scaleFactorFromPrompt(); if (k === null) return null;
  const want = Math.abs(k - 1) < 1e-9 ? 'samesize' : (Math.abs(k) > 1 ? 'larger' : 'smaller');
  const i = words.findIndex(w => w.startsWith(want));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveScaleSize', /scale factor|dilat/i]);
;'__duo ready';

// "Select/enter the dilated length with scale factor k": measure the drawn
// segment in grid units (or read its label) and multiply by k.
window.__duo.dilatedLengthValue = function () {
  const ins = this.curInstruction();
  if (!/dilated/i.test(ins)) return null;
  let k = this.scaleFactorFromPrompt();
  if (k === null) { const m = ins.replace(/\s/g, '').match(/scalefactor,?=?,?(-?[\d.]+)/i); if (m) k = parseFloat(m[1]); }
  if (k === null) return null;
  let len = null;
  const nums = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim())).map(l => parseFloat(l.t));
  if (nums.length) len = nums[0];
  if (len === null) {
    const P = this.plottedPoints();
    if (P.length === 2) len = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  }
  if (len === null) len = this.shapeSideLength();
  if (len === null || !isFinite(len)) return null;
  const v = len * k;
  return Math.abs(v - Math.round(v)) < 1e-4 ? Math.round(v) : Math.round(v * 100) / 100;
};


// "congruent" vs "not congruent": compare the two drawn shapes' sorted side
// lengths — a rigid motion preserves them, a dilation does not.
window.__duo.twoShapeSides = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, g = d.M.grid;
  const shapes = [...doc.querySelectorAll('path,polygon,polyline')]
    .filter(e => /polygon|(^|\s)shape(\s|$)/i.test(e.getAttribute('class') || ''))
    .filter(e => typeof e.getTotalLength === 'function');
  if (shapes.length < 2) return null;
  const sidesOf = el => {
    let L = 0; try { L = el.getTotalLength(); } catch (e) { return null; }
    if (!L) return null;
    const ctm = el.getScreenCTM(); if (!ctm) return null;
    const svg = el.ownerSVGElement;
    const N = 240, P = [];
    for (let i = 0; i < N; i++) {
      const q = el.getPointAtLength((i / N) * L);
      const p = svg.createSVGPoint(); p.x = q.x; p.y = q.y;
      const t = p.matrixTransform(ctm);
      P.push([t.x, t.y]);
    }
    // corners
    const V = [];
    for (let i = 0; i < N; i++) {
      const a = P[(i - 5 + N) % N], b = P[i], c = P[(i + 5) % N];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const lu = Math.hypot(...u), lv = Math.hypot(...v);
      if (lu < 1e-6 || lv < 1e-6) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
      if (ang > 0.45) V.push({ i, p: b, ang });
    }
    const corners = []; let run = [];
    for (let k = 0; k < V.length; k++) {
      if (!run.length || V[k].i - run[run.length - 1].i <= 2) run.push(V[k]);
      else { corners.push(run.reduce((a, b) => b.ang > a.ang ? b : a).p); run = [V[k]]; }
    }
    if (run.length) corners.push(run.reduce((a, b) => b.ang > a.ang ? b : a).p);
    if (corners.length < 3) return null;
    const n = corners.length;
    return corners.map((p, i) => Math.hypot(corners[(i + 1) % n][0] - p[0], corners[(i + 1) % n][1] - p[1]))
                  .sort((a, b) => a - b);
  };
  const A = sidesOf(shapes[0]), B = sidesOf(shapes[1]);
  return (A && B) ? { A, B } : null;
};
window.__duo.solveCongruentOrNot = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
  const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
  if (!words.some(w => /^congruent$/.test(w)) || !words.some(w => /^notcongruent$/.test(w))) return null;
  const S = this.twoShapeSides(); if (!S || S.A.length !== S.B.length) return null;
  const same = S.A.every((v, i) => Math.abs(v - S.B[i]) / Math.max(v, S.B[i]) < 0.06);
  const i = words.findIndex(w => same ? w === 'congruent' : w === 'notcongruent');
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCongruentOrNot', /congruent|select the match/i]);
;'__duo ready';

// "Select a pair of corresponding sides": in similar/congruent figures the
// corresponding sides are the ones whose lengths share the figures' scale
// factor. Choices name them like "AB and A'B'".
window.__duo.solveCorrespondingSides = function () {
  if (!/corresponding sides/i.test(this.curInstruction())) return null;
  const N = this.namedPoints(); if (!N) return null;
  const len = (a, b) => (N[a] && N[b]) ? Math.hypot(N[b][0] - N[a][0], N[b][1] - N[a][1]) : null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const parsed = ch.map(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/[’]/g, "'").replace(/and/gi, '');
    const m = t.match(/([A-Z]'?)([A-Z]'?)([A-Z]'?)([A-Z]'?)/);
    return m ? { a: [m[1], m[2]], b: [m[3], m[4]] } : null;
  });
  // the right pair: one side from the pre-image, one from the image, with a
  // consistent ratio across the whole figure
  const ratios = parsed.map(p => {
    if (!p) return null;
    const l1 = len(p.a[0], p.a[1]), l2 = len(p.b[0], p.b[1]);
    const primeA = p.a.some(x => /'/.test(x)), primeB = p.b.some(x => /'/.test(x));
    if (l1 === null || l2 === null || l1 < 1e-9) return null;
    if (primeA === primeB) return null;              // both from the same figure
    return l2 / l1;
  });
  const valid = ratios.map((r, i) => ({ r, i })).filter(x => x.r !== null);
  if (!valid.length) return null;
  // prefer the ratio that matches the figures' overall scale
  const S = this.twoShapeSides();
  if (S && S.A.length && S.B.length) {
    const k = S.B[S.B.length - 1] / S.A[S.A.length - 1];
    const hit = valid.find(x => Math.abs(x.r - k) < 0.08 * k);
    if (hit) return { i: hit.i };
  }
  return valid.length === 1 ? { i: valid[0].i } : null;
};
window.__duo.RULES.unshift(['solveCorrespondingSides', /corresponding sides/i]);
;'__duo ready';
