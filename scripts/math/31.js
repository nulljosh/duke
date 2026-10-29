
// "Graph the transformation" where the prompt states g(x) = 1.25 f(x):
// the multiplier goes straight onto the slider.
(function () {
  const base = window.__duo.solveDilation;
  window.__duo.solveDilation = async function () {
    const S = this.slider2d(); if (!S) return false;
    const T = this.transformed();
    if (T && T.k.mul !== undefined && T.k.mul >= S.s.min && T.k.mul <= S.s.max)
      return await this.setSlider2d(T.k.mul);
    if (T && T.k.inmul !== undefined && T.k.inmul >= S.s.min && T.k.inmul <= S.s.max)
      return await this.setSlider2d(T.k.inmul);
    return await base.call(this);
  };
})();
;'__duo ready';

// g(x) = f(\frac{1}{4}x): a fractional inner multiplier. flatLine renders the
// fraction as "frac14", so parse that form too.
(function () {
  const base = window.__duo.transformed;
  window.__duo.transformed = function () {
    const T = base.call(this); if (T) return T;
    let f = null, k = null, gname = 'g';
    for (const t of this.mathParts()) {
      const q = t.match(/^([a-z])\(x\)=([^=]+)$/); if (!q) continue;
      let m;
      if ((m = q[2].match(/^([a-z])\(frac(\d+)(\d+)x\)$/)))
        { gname = q[1]; k = { inmul: parseFloat(m[2]) / parseFloat(m[3]) }; continue; }
      if ((m = q[2].match(/^frac(\d+)(\d+)([a-z])\(x\)$/)))
        { gname = q[1]; k = { mul: parseFloat(m[1]) / parseFloat(m[2]) }; continue; }
      if ((m = q[2].match(/^([a-z])\((-?\d+(?:\.\d+)?)x\)$/)))
        { gname = q[1]; k = { inmul: parseFloat(m[2]) }; continue; }
      const g = this.compile(q[2].replace(/cdot|times/g, '*')); if (g) f = g;
    }
    if (!f || !k) return null;
    const g = k.mul !== undefined ? (x => k.mul * f(x)) : (x => f(k.inmul * x));
    return { f, g, k, gname };
  };
})();
;'__duo ready';

// choices may hold fractional multipliers: g(x)=f(\frac{1}{4}x), g(x)=\frac{1}{2}f(x)
(function () {
  const base = window.__duo.solveTransformFromCurves;
  window.__duo.candTransform = function (el) {
    const t = this.plainMath(this.choiceLatex(el));
    let m;
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\(x\)([+-])(\d+(?:\.\d+)?)$/)))
      { const k = (m[1] === '-' ? -1 : 1) * parseFloat(m[2]); return (F, x) => { const v = F(x); return v === null ? null : v + k; }; }
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\(x([+-])(\d+(?:\.\d+)?)\)$/)))
      { const k = (m[1] === '-' ? -1 : 1) * parseFloat(m[2]); return (F, x) => F(x + k); }
    if ((m = t.match(/^[a-z]\(x\)=(-?)frac(\d+)(\d+)[a-z]\(x\)$/)))
      { const k = (m[1] ? -1 : 1) * parseFloat(m[2]) / parseFloat(m[3]); return (F, x) => { const v = F(x); return v === null ? null : k * v; }; }
    if ((m = t.match(/^[a-z]\(x\)=(-?\d+(?:\.\d+)?)(?:\*|cdot)?[a-z]\(x\)$/)))
      { const k = parseFloat(m[1]); return (F, x) => { const v = F(x); return v === null ? null : k * v; }; }
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\((-?)frac(\d+)(\d+)x\)$/)))
      { const k = (m[1] ? -1 : 1) * parseFloat(m[2]) / parseFloat(m[3]); return (F, x) => F(k * x); }
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\((-?\d+(?:\.\d+)?)x\)$/)))
      { const k = parseFloat(m[1]); return (F, x) => F(k * x); }
    return null;
  };
  window.__duo.solveTransformFromCurves = function () {
    const C = this.allCurves(); if (C.length < 2) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (ch.length < 2) return null;
    const dense = at => { const P = []; for (let i = 0; i <= 200; i++) { const p = at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); } return P.sort((a, b) => a[0] - b[0]); };
    const interp = P => x => { if (x < P[0][0] || x > P[P.length - 1][0]) return null;
      for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const [x0, y0] = P[i - 1], [x1, y1] = P[i];
        return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return null; };
    const pairs = [];
    for (let a = 0; a < C.length; a++) for (let b = 0; b < C.length; b++) if (a !== b) pairs.push([a, b]);
    for (const [fi, gi] of pairs) {
      const F = interp(dense(C[fi])), G = interp(dense(C[gi]));
      const hits = [];
      ch.forEach((e, i) => {
        const fn = this.candTransform(e); if (!fn) return;
        let n = 0, bad = 0;
        for (let x = -4; x <= 4; x += 0.25) {
          const want = G(x); if (want === null) continue;
          const got = fn(F, x); if (got === null) continue;
          n++; if (Math.abs(got - want) > 0.3) bad++;
        }
        if (n >= 10 && bad <= n * 0.1) hits.push(i);
      });
      if (hits.length === 1) return { i: hits[0] };
    }
    return null;
  };
})();
;'__duo ready';

// horizontal stretch: g(x) = f(x/k) stretches by k, so with g(x) = f(c x)
// the stretch value is 1/c. Measure c from the curves when no formula is given.
window.__duo.horizontalFactor = function () {
  const T = this.transformed();
  if (T && T.k.inmul !== undefined) return 1 / T.k.inmul;
  const C = this.allCurves(); if (C.length < 2) return null;
  const dense = at => { const P = []; for (let i = 0; i <= 200; i++) { const p = at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); } return P.sort((a, b) => a[0] - b[0]); };
  const interp = P => x => { if (x < P[0][0] || x > P[P.length - 1][0]) return null;
    for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return null; };
  const F = interp(dense(C[0])), G = interp(dense(C[1]));
  let best = null, bestErr = Infinity;
  for (const c of [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2, 3, 4]) {
    let n = 0, err = 0;
    for (let x = -4; x <= 4; x += 0.25) {
      const want = G(x), got = F(c * x);
      if (want === null || got === null) continue;
      err += Math.abs(got - want); n++;
    }
    if (n < 10) continue;
    const e = err / n;
    if (e < bestErr) { bestErr = e; best = c; }
  }
  return bestErr < 0.25 && best ? Math.round((1 / best) * 100) / 100 : null;
};
(function () {
  const RE = /horizontal (stretch|compress|shrink|dilation|scale)/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const k = this.horizontalFactor(); if (k !== null) return k; }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const k = this.horizontalFactor();
      if (k !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - k) < 0.02; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// "Graph g(x) = f(2x)" against the template g(x) = f(<slider> x): the goal line
// states the multiplier and the slider holds it directly.
window.__duo.solveInnerMulSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const tpl = this.mathParts().find(t => /duodisplay/.test(t));
  if (!tpl || !/duodisplay[\d.\-]+x\)/.test(tpl)) return false;
  for (const t of this.mathParts()) {
    if (/duodisplay/.test(t)) continue;
    const m = t.match(/^[a-z]\(x\)=[a-z]\((-?\d+(?:\.\d+)?)x\)$/);
    if (m) return await this.setSlider2d(parseFloat(m[1]));
    const f = t.match(/^[a-z]\(x\)=[a-z]\((-?)frac(\d+)(\d+)x\)$/);
    if (f) return await this.setSlider2d((f[1] ? -1 : 1) * parseFloat(f[2]) / parseFloat(f[3]));
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveInnerMulSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// A horizontal COMPRESSION value is the inner multiplier c in f(cx); a
// horizontal STRETCH value is its reciprocal. Report whichever the prompt asks.
window.__duo.innerMultiplier = function () {
  const k = this.horizontalFactor();      // returns 1/c
  return k === null || k === 0 ? null : Math.round((1 / k) * 100) / 100;
};
(function () {
  const RE = /horizontal (stretch|compress\w*|shrink|dilation|scale)/i;
  const want = function () {
    const ins = this.curInstruction();
    if (!RE.test(ins)) return null;
    return /compress|shrink/i.test(ins) ? this.innerMultiplier() : this.horizontalFactor();
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = want.call(this); if (v !== null && v !== undefined) return v;
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const v = want.call(this);
    if (v !== null && v !== undefined) {
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 0.02; });
      if (i >= 0) return { i };
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Unit 168: "Set the independent variable to 4" — a bare instruction naming the
// slider's target value. Covers any "set ... to N" wording.
window.__duo.solveSetSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const txt = this.mathParts().concat([this.curInstruction()]).join(' ');
  const m = txt.match(/set\s+[^.]*?\s+to\s+(-?\d+(?:\.\d+)?)/i);
  if (!m) return false;
  const v = parseFloat(m[1]);
  if (v < S.s.min || v > S.s.max) return false;
  return await this.setSlider2d(v);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveSetSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// mathParts strips spaces, so the "set ... to N" regex needs the despaced form
window.__duo.solveSetSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const txt = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const m = txt.match(/set[a-z]*?to(-?\d+(?:\.\d+)?)/i);
  if (!m) return false;
  const v = parseFloat(m[1]);
  if (v < S.s.min || v > S.s.max) return false;
  return await this.setSlider2d(v);
};
;'__duo ready';

// "Plot the data": the prompt lists the points and the grid holds one draggable
// marker per point. Match markers to targets nearest-first so the shortest
// drags happen first and markers do not swap places.
window.__duo.solvePlotData = async function () {
  const pts = this.gridPoints(); if (pts.length < 2) return false;
  const txt = this.mathParts().join(' ').replace(/\s/g, '');
  const targets = [...txt.matchAll(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/g)]
    .map(m => [parseFloat(m[1]), parseFloat(m[2])]);
  if (targets.length !== pts.length) return false;
  const free = pts.slice(), left = targets.slice();
  while (left.length) {
    let bi = 0, bj = 0, bd = Infinity;
    free.forEach((p, i) => left.forEach((t, j) => {
      const d = Math.hypot(p.x - t[0], p.y - t[1]);
      if (d < bd) { bd = d; bi = i; bj = j; }
    }));
    const p = free[bi], t = left[bj];
    if (Math.hypot(p.x - t[0], p.y - t[1]) > 1e-9) await this.dragPointTo(p, t[0], t[1]);
    free.splice(bi, 1); left.splice(bj, 1);
  }
  return this.gridPoints().every(p => targets.some(t => Math.hypot(p.x - t[0], p.y - t[1]) < 1e-6));
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solvePlotData()) return true;
    return await base.call(this);
  };
  const bp = window.__duo.plan;
  window.__duo.plan = function () {
    const p = bp.call(this); if (p) return p;
    if (this.gridPoints().length > 1) return { kind: 'plotdata', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// plainMath strips commas, which destroys coordinate pairs — keep them here.
window.__duo.promptPairs = function () {
  const txt = this.promptLatex()
    .map(l => this.ascii(l).replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
                           .replace(/[{}&~\s\\]/g, ''))
    .join(' ');
  return [...txt.matchAll(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/g)]
    .map(m => [parseFloat(m[1]), parseFloat(m[2])]);
};
(function () {
  const base = window.__duo.solvePlotData;
  window.__duo.solvePlotData = async function () {
    const pts = this.gridPoints(); if (pts.length < 2) return false;
    const targets = this.promptPairs();
    if (targets.length !== pts.length) return await base.call(this);
    const free = pts.slice(), left = targets.slice();
    while (left.length) {
      let bi = 0, bj = 0, bd = Infinity;
      free.forEach((p, i) => left.forEach((t, j) => {
        const d = Math.hypot(p.x - t[0], p.y - t[1]);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }));
      const p = free[bi], t = left[bj];
      if (Math.hypot(p.x - t[0], p.y - t[1]) > 1e-9) await this.dragPointTo(p, t[0], t[1]);
      free.splice(bi, 1); left.splice(bj, 1);
    }
    return this.gridPoints().every(p => targets.some(t => Math.hypot(p.x - t[0], p.y - t[1]) < 1e-6));
  };
})();
;'__duo ready';

// Unit 168 stats: "Create a positive trend" drives a correlation slider.
// Pick a decisive value (not just any value with the right sign) so the drag is
// real — CHECK stays disabled until the widget sees a pointer interaction.
window.__duo.solveTrendSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const txt = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  if (!/correlation|trend/.test(txt)) return false;
  let want = null;
  if (/positive|increasing|upward/.test(txt)) want = S.s.max;
  else if (/negative|decreasing|downward/.test(txt)) want = S.s.min;
  else if (/no(correlation|trend)|zero/.test(txt)) want = 0;
  if (want === null) return false;
  const cur = this.sliderValue();
  if (cur !== null && Math.abs(cur - want) < 1e-9) {   // nudge, then return
    const other = want === S.s.max ? want - S.s.step : want + S.s.step;
    await this.setSlider2d(other); await this.sleep(220);
  }
  return await this.setSlider2d(want);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveTrendSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// a scatter plot can have a single missing point, so allow one marker
(function () {
  const base = window.__duo.solvePlotData;
  window.__duo.solvePlotData = async function () {
    const pts = this.gridPoints();
    const targets = this.promptPairs();
    if (pts.length !== 1 || targets.length !== 1) return await base.call(this);
    const [t] = targets, p = pts[0];
    if (Math.hypot(p.x - t[0], p.y - t[1]) > 1e-9) await this.dragPointTo(p, t[0], t[1]);
    const q = this.gridPoints()[0];
    return !!q && Math.hypot(q.x - t[0], q.y - t[1]) < 1e-6;
  };
})();
;'__duo ready';

// "Select the approximate correlation coefficient" — compute Pearson's r over
// the plotted points and snap to the nearest offered value.
window.__duo.plottedPoints = function () {
  const d = this.diagram(); if (!d || !d.M.components) return [];
  return [...d.M.components.components.values()]
    .filter(v => v.options && 'x' in v.options)
    .map(v => [v.x, v.y]);
};
window.__duo.correlation = function () {
  const P = this.plottedPoints(); if (P.length < 3) return null;
  const n = P.length;
  const mx = P.reduce((a, p) => a + p[0], 0) / n, my = P.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of P) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (!sxx || !syy) return 0;
  const r = sxy / Math.sqrt(sxx * syy);
  return isFinite(r) ? r : null;
};
(function () {
  const RE = /correlation coefficient/i;
  const base = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const r = this.correlation();
      if (r !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        let bi = -1, bd = Infinity;
        ch.forEach((e, i) => { const v = this.choiceValue(e);
          if (v === null) return; const d = Math.abs(v - r); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0) return { i: bi };
      }
    }
    return base.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Unit 169: "Graph the trend line y = 2x - 1" with one slider whose meaning
// (slope or intercept) is not stated. Try each value and keep the one whose
// drawn line matches the target — a handful of drags, no guessing.
window.__duo.solveTrendLine = async function () {
  const S = this.slider2d(); if (!S) return false;
  let f = null;
  for (const t of this.mathParts()) {
    const m = t.match(/^(?:y|[a-z]\(x\))=([^=]+)$/);
    if (m) { const g = this.compile(m[1].replace(/cdot|times/g, '*')); if (g) f = g; }
  }
  if (!f) return false;
  if (this.curveMatches(f)) {                      // already right: nudge and return
    const cur = this.sliderValue();
    const other = cur === S.s.max ? cur - S.s.step : cur + S.s.step;
    await this.setSlider2d(other); await this.sleep(200);
    await this.setSlider2d(cur); return true;
  }
  for (let v = S.s.min; v <= S.s.max; v += S.s.step) {
    if (Math.abs(v - this.sliderValue()) < 1e-9) continue;
    await this.setSlider2d(v); await this.sleep(220);
    if (this.curveMatches(f)) return true;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveTrendLine()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';
