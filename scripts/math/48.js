
// "Create a rectangular prism with volume = 16": one slider controls a
// dimension. The diagram labels every edge, so drop the labels equal to the
// slider's current value and the rest are the fixed dimensions.
window.__duo.solveVolumeSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  let target = null;
  for (const t of this.mathParts()) {
    const m = String(t).replace(/\s/g, '').match(/^(volume|area|surfacearea)[=:](-?\d+(?:\.\d+)?)$/i);
    if (m) { target = parseFloat(m[2]); break; }
  }
  if (target === null) return false;
  const cur = this.sliderValue(); if (cur === null) return false;
  const labs = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim())).map(l => parseFloat(l.t));
  if (labs.length < 2) return false;
  const tri = /triangular/i.test(this.promptTitle() + ' ' + this.curInstruction());
  // Don't guess which label the slider drives: try every legal value, swap it
  // in for the labels currently showing `cur`, and keep the one that fits.
  // A prism labels some edges twice, so don't dedup by value: try every
  // 3-subset of the labels and let the target pick the right one.
  // Only ONE label is slider-driven even when several currently read `cur`,
  // so substitute a single occurrence at a time.
  const swaps = [];
  labs.forEach((x, k) => { if (Math.abs(x - cur) < 1e-9) swaps.push(k); });
  for (let v = S.s.min; v <= S.s.max + 1e-9; v += S.s.step)
   for (const k of swaps) {
    const L = labs.map((x, j) => j === k ? v : x);
    for (let a = 0; a < L.length; a++)
      for (let b = a + 1; b < L.length; b++)
        for (let c = b + 1; c < L.length; c++) {
          let vol = L[a] * L[b] * L[c];
          if (tri) vol /= 2;
          if (Math.abs(vol - target) < 1e-9) return await this.setSlider2d(v);
        }
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveVolumeSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the volume of the rectangular prism": multiply the three distinct
// edge labels (each edge length appears once per visible face).
window.__duo.prismDimensions = function () {
  const labs = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim())).map(l => parseFloat(l.t));
  if (labs.length < 3) return null;
  const counts = {};
  for (const v of labs) counts[v] = (counts[v] || 0) + 1;
  const uniq = Object.keys(counts).map(Number);
  if (uniq.length === 3) return uniq;
  if (uniq.length === 2) {
    // a repeated dimension: the one appearing more often is used twice
    const [a, b] = uniq;
    return counts[a] > counts[b] ? [a, a, b] : [a, b, b];
  }
  if (uniq.length === 1) return [uniq[0], uniq[0], uniq[0]];
  return null;
};


// Match each numeric diagram label to the edge it annotates, so "height" vs
// "base" is read off the drawing instead of guessed from label order.
window.__duo.labeledEdges = function () {
  const f = this.visibleFrame(); if (!f) return null;
  const doc = f.contentDocument; if (!doc) return null;
  // diagramLabels() reports FRAME-LOCAL rects, so keep segments frame-local too.
  const segs = [];
  // SVG point coords are USER units; map them with getScreenCTM, never by
  // adding the svg's bounding rect (that ignores the viewBox scale).
  for (const el of doc.querySelectorAll('svg path,svg line,svg polygon,svg polyline')) {
    const svg = el.ownerSVGElement; if (!svg) continue;
    const m = svg.getScreenCTM(); if (!m) continue;
    const map = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    let pts = [];
    if (el.tagName === 'line') {
      pts = [[+el.getAttribute('x1'), +el.getAttribute('y1')],
             [+el.getAttribute('x2'), +el.getAttribute('y2')]];
    } else if (el.getTotalLength) {
      const L = el.getTotalLength(); if (!L) continue;
      const n = Math.min(60, Math.max(8, Math.round(L / 6)));
      for (let i = 0; i <= n; i++) { const p = el.getPointAtLength(L * i / n); pts.push([p.x, p.y]); }
    }
    for (let i = 1; i < pts.length; i++) {
      const A = map(pts[i - 1][0], pts[i - 1][1]), B = map(pts[i][0], pts[i][1]);
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      if (len < 4) continue;
      segs.push({ mx: (A.x + B.x) / 2, my: (A.y + B.y) / 2,
                  dx: B.x - A.x, dy: B.y - A.y, len });
    }
  }
  if (!segs.length) return null;
  const out = [];
  for (const l of this.diagramLabels() || []) {
    if (!/^-?\d+(\.\d+)?$/.test(l.t.trim())) continue;
    let best = null, bd = Infinity;
    for (const s of segs) { const d = Math.hypot(s.mx - l.x, s.my - l.y); if (d < bd) { bd = d; best = s; } }
    if (!best) continue;
    const ang = Math.abs(Math.atan2(best.dy, best.dx) * 180 / Math.PI);
    out.push({ v: parseFloat(l.t), vertical: Math.min(ang, 180 - ang) > 60, dist: bd });
  }
  return out.length ? out : null;
};

// Guided prism steps: "enter the area of the bottom base" / "the height" /
// "the volume". The vertical edge is the height; the rest form the base.


// Volume/area questions sometimes offer LaTeX EXPRESSIONS as choices
// ("\frac{1}{2}\cdot4\cdot3\cdot2") rather than numbers.
(function () {
  const be = window.__duo.evalTrigExpr;
  window.__duo.evalTrigExpr = function (t) {
    return be.call(this, String(t == null ? '' : t)
      .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, ''));
  };
  const bc = window.__duo.choiceValue;
  window.__duo.choiceValue = function (el) {
    const v = bc.call(this, el);
    if (v !== null && v !== undefined) return v;
    const a = el && el.querySelector('annotation');
    const raw = a ? a.textContent : ((el && el.textContent) || '');
    if (!/\\(cdot|times|frac)/.test(raw)) return v;
    const e = this.evalTrigExpr(raw);
    return (typeof e === 'number' && isFinite(e)) ? e : v;
  };
})();
;'__duo ready';

// "Select the volume of the triangular prism" — the earlier prismDimensions()
// path only handles rectangular solids and numeric choices.


// Guided solid steps state the target volume; when they do, prefer arithmetic
// over guessing which labelled edges form the base.
(function () {
  const statedVolume = function () {
    for (const t of this.mathParts()) {
      const m = String(t).replace(/\s/g, '').match(/^volume[=:](-?\d+(?:\.\d+)?)$/i);
      if (m) return parseFloat(m[1]);
    }
    return null;
  };
  const base = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = String(this.curInstruction() || '');
    const V = statedVolume.call(this);
    const E = this.labeledEdges();
    if (V !== null && E) {
      const h = E.filter(e => e.vertical).map(e => e.v);
      if (h.length === 1) {
        if (/area of the .*base|base area/i.test(ins)) return V / h[0];
        if (/\bheight\b/i.test(ins)) return h[0];
      }
    }
    return base.call(this);
  };
})();
;'__duo ready';

// "Select the cross section parallel/perpendicular to the base" — the answer is
// determined by the solid plus the slice direction, nothing in the drawing.
(function () {
  const TABLE = {
    cylinder:   { par: 'circle',    perp: 'rectangle' },
    cone:       { par: 'circle',    perp: 'triangle' },
    sphere:     { par: 'circle',    perp: 'circle' },
    triangular: { par: 'triangle',  perp: 'rectangle' },
    rectangular:{ par: 'rectangle', perp: 'rectangle' },
    cube:       { par: 'square',    perp: 'square' },
    pyramid:    { par: 'square',    perp: 'triangle' },
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    // "select the base of the cylinder net" wants the same shape as a slice
    // parallel to the base.
    if (/cross section/i.test(ins) || /\bbase of the .*net\b/i.test(ins)) {
      const hay = (ins + ' ' + this.promptTitle() + ' ' +
        (document.querySelector('[data-test^="challenge "]') || {}).innerText || '').toLowerCase();
      let key = Object.keys(TABLE).find(k => hay.includes(k));
      // The solid is usually only drawn, never named: a curved outline means a
      // round solid, and both cylinder and cone slice parallel to a circle.
      if (!key) {
        const f = this.visibleFrame(), d = f && f.contentDocument;
        const paths = d ? [...d.querySelectorAll('svg path')] : [];
        const big = paths.filter(p => { const b = p.getBBox ? p.getBBox() : null; return b && b.width > 60 && b.height > 60; });
        if (big.some(p => /[CcAaSsQq]/.test(p.getAttribute('d') || ''))) key = 'cylinder';
      }
      if (key) {
        const want = TABLE[key][/perpendicular/i.test(ins) ? 'perp' : 'par'];
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => this.half(e.innerText).trim().toLowerCase() === want);
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// "Create a cylinder with volume = 12\pi": V = pi r^2 h, and the horizontal
// label may be either the radius or the diameter, so try both.
window.__duo.solveCylinderSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const hay = (this.promptTitle() + ' ' + this.curInstruction()).toLowerCase();
  if (!/cylinder|cone|sphere/.test(hay)) return false;
  const m = this.promptLatex().join(' ').replace(/\s/g, '')
    .match(/(volume|basearea)\}?=\\?[a-z]*\{?(-?\d+(?:\.\d+)?)\\pi/i);
  if (!m) return false;
  const target = parseFloat(m[2]);          // in units of pi
  const third = /cone/.test(hay) ? 3 : 1;
  const cur = this.sliderValue(); if (cur === null) return false;
  if (/sphere/.test(hay)) {
    for (let v = S.s.min; v <= S.s.max + 1e-9; v += S.s.step)
      for (const rr of [v, v / 2])
        if (Math.abs(4 / 3 * rr * rr * rr - target) < 1e-9) return await this.setSlider2d(v);
    return false;
  }
  const E = (this.labeledEdges() || []).filter(e => e.dist < 40);
  if (E.length < 2) return false;
  for (let v = S.s.min; v <= S.s.max + 1e-9; v += S.s.step) {
    for (let k = 0; k < E.length; k++) {
      if (Math.abs(E[k].v - cur) > 1e-9) continue;
      const L = E.map((e, j) => ({ v: j === k ? v : e.v, vertical: e.vertical }));
      const h = L.filter(e => e.vertical).map(e => e.v);
      const r = L.filter(e => !e.vertical).map(e => e.v);
      if (h.length !== 1 || !r.length) continue;
      for (const rr of [r[0], r[0] / 2])
        if (Math.abs(rr * rr * h[0] / third - target) < 1e-9) return await this.setSlider2d(v);
    }
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveCylinderSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// Guided solid steps print the whole equation ("81\pi = \pi\cdot r^2\cdot 1",
// "V = \pi\cdot 5^2\cdot 3"). Solve it by trying each choice in the unknown's
// place; pi is set to 1 on BOTH sides so "25\pi" choices compare cleanly.
(function () {
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\pi/g, '*1').replace(/[{}]/g, '').replace(/\s/g, '')
    .replace(/(^|[=(*+\-/])\*+/g, '$1');
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    if (/^select the (radius|height|volume|diameter|base area|area)/i.test(ins)) {
      const line = this.promptLatex().filter(l => /=/.test(l)).pop();
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      if (line && ch.length) {
        const eq = prep(line);
        const vals = ch.map(e => {
          const a = e.querySelector('annotation');
          const n = this.compile(prep(a ? a.textContent : e.innerText));
          try { return n ? n(0) : null; } catch (x) { return null; }
        });
        const [lhs, rhs] = eq.split('=');
        const unk = (eq.match(/[a-zA-Z]/g) || []).find(c => c !== 'e');
        if (unk) {
          for (let i = 0; i < vals.length; i++) {
            if (vals[i] === null) continue;
            const sub = s => s.replace(new RegExp(unk, 'g'), '(' + vals[i] + ')');
            const L = this.compile(sub(lhs)), R = this.compile(sub(rhs));
            try { if (L && R && Math.abs(L(0) - R(0)) < 1e-9) return { i }; } catch (x) {}
          }
        } else if (rhs) {
          const R = this.compile(rhs);
          try {
            const want = R(0);
            const i = vals.findIndex(v => v !== null && Math.abs(v - want) < 1e-9);
            if (i >= 0) return { i };
          } catch (x) {}
        }
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// Choice innerText is doubled ("kitekite"); several solvers need this.
window.__duo.half = function (s) {
  const t = String(s == null ? '' : s).replace(/\s/g, '');
  return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2))
    ? t.slice(0, t.length / 2) : t;
};
;'__duo ready';

// Typed guided steps print the equation with the answer blanked:
// "7\pi = \pi\cdot\duoblank{1}^2\cdot 7". Solve for the blank numerically.
(function () {
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\duoblank\{[^{}]*\}/g, 'x').replace(/\\pi/g, '*1')
    .replace(/[{}]/g, '').replace(/\s/g, '')
    // "\pi\cdot r" leaves a leading "*"; drop operators stranded at a boundary
    .replace(/(^|[=(*+\-/])\*+/g, '$1');
  const base = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const line = this.promptLatex().find(l => /duoblank/.test(l) && /=/.test(l));
    if (line) {
      const [ls, rs] = prep(line).split('=');
      const L = this.compile(ls), R = this.compile(rs);
      if (L && R) {
        const f = x => { try { return L(x) - R(x); } catch (e) { return NaN; } };
        // lengths are positive and usually small; scan then bisect
        let a = null;
        for (let x = 0.0625; x <= 400; x += 0.0625) {
          const v = f(x);
          if (!isFinite(v)) continue;
          if (Math.abs(v) < 1e-9) { a = x; break; }
          const p = f(x - 0.0625);
          if (isFinite(p) && p * v < 0) {
            let lo = x - 0.0625, hi = x;
            for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; (f(lo) * f(m) <= 0) ? hi = m : lo = m; }
            a = (lo + hi) / 2; break;
          }
        }
        if (a !== null) return Math.abs(a - Math.round(a)) < 1e-6 ? Math.round(a) : a;
      }
    }
    return base.call(this);
  };
})();
;'__duo ready';

// "Select the area of the lateral face of the cylinder": 2*pi*r*h, offered as
// LaTeX expressions. Compare with pi set to 1 on both sides.
(function () {
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\pi/g, '*1').replace(/[{}]/g, '').replace(/\s/g, '')
    .replace(/(^|[=(*+\-/])\*+/g, '$1')
    .replace(/(\d)\(/g, '$1*(').replace(/\)(\d|\()/g, ')*$1');
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    if (/lateral|surface area/i.test(ins)) {
      const E = (this.labeledEdges() || []).filter(e => e.dist < 40);
      const h = E.filter(e => e.vertical).map(e => e.v);
      const r = E.filter(e => !e.vertical).map(e => e.v);
      if (h.length === 1 && r.length) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const vals = ch.map(e => {
          const a = e.querySelector('annotation');
          const g = this.compile(prep(a ? a.textContent : e.innerText));
          try { return g ? g(0) : null; } catch (x) { return null; }
        });
        // "total surface area" must beat the lateral-only distractor, so try
        // the total first whenever the prompt is not explicitly lateral.
        const lateralOnly = /lateral/i.test(ins);
        const wants = [];
        for (const rr of [r[0], r[0] / 2]) {
          const lat = 2 * rr * h[0], tot = lat + 2 * rr * rr;
          wants.push(lateralOnly ? lat : tot);
        }
        for (const rr of [r[0], r[0] / 2]) {
          const lat = 2 * rr * h[0], tot = lat + 2 * rr * rr;
          wants.push(lateralOnly ? tot : lat);
        }
        for (const w of wants) {
          const i = vals.findIndex(v => v !== null && Math.abs(v - w) < 1e-9);
          if (i >= 0) return { i };
        }
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';
