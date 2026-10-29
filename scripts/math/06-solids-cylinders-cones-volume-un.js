
// x may sit on either side of the sum: "6^2 + x^2 = 13^2" as well as x-first
(function () {
  const prev = window.__duo.solvePythFormChoice;
  window.__duo.solvePythFormChoice = function () {
    const r = prev.call(this); if (r && r.i >= 0) return r;
    const N = s => s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '').toLowerCase();
    const t = N(this.tex());
    let wantMinus = null;
    if (/\d+\^?2\+x\^?2=\d+\^?2/.test(t) || /x\^?2\+\d+\^?2=\d+\^?2/.test(t)) wantMinus = true;
    else if (/x\^?2=\d+\^?2\+\d+\^?2/.test(t)) wantMinus = false;
    if (wantMinus === null) return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const i = src.findIndex(s => { const n = N(s);
      return /sqrt|√/.test(n) && (wantMinus ? /-/.test(n) : /\+/.test(n)); });
    return i < 0 ? r : { i, want: N(src[i]) };
  };
})();

// typed side lengths: read the label when it is given, compute it when it is x


// ---- solids: cylinders, cones, volume (unit 132) ----
Object.assign(window.__duo, {
  // Dimensions come either from the PROMPT ("radius = 1, height = 12") or from
  // labels on the drawing. \begin{aligned} puts an & before the =, so "radius&=1".
  solidDims() {
    const t = this.tex().replace(/\s/g, '');
    const g = k => { const m = t.match(new RegExp(k + '&?=(\\d+(?:\\.\\d+)?)', 'i')); return m ? +m[1] : null; };
    const r = g('radius'), h = g('height'), d = g('diameter');
    if (r !== null || h !== null || d !== null)
      return { radius: r !== null ? r : (d !== null ? d / 2 : null), height: h };

    // otherwise read the drawing: the radius label sits INSIDE the figure (near
    // its centre x), the height label outside on the right edge
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const doc = f.contentDocument, fr = f.getBoundingClientRect();
    const labs = [...doc.querySelectorAll('text,tspan')].map(e => { const b = e.getBoundingClientRect();
      return { v: parseFloat(this.ascii(e.textContent.trim())),
               x: fr.left + b.left + b.width / 2, y: fr.top + b.top + b.height / 2 }; })
      .filter(o => !isNaN(o.v));
    if (labs.length < 2) return null;
    const shape = [...doc.querySelectorAll('ellipse,path,polygon,.shape')].map(e => e.getBoundingClientRect())
      .filter(b => b.width > 60 && b.height > 30).sort((a, b) => b.width - a.width)[0];
    if (!shape) return null;
    const cx = fr.left + shape.left + shape.width / 2, right = fr.left + shape.left + shape.width;
    const byDist = labs.slice().sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
    const radius = byDist[0];
    const height = labs.find(o => o !== radius && o.x >= right - 30) || byDist[byDist.length - 1];
    return { radius: radius && radius.v, height: height && height.v };
  },

  solveDimension() {
    const L = this.tex(), s = this.solidDims(); if (!s) return null;
    let want = null;
    if (/radius/i.test(L)) want = s.radius;
    else if (/diameter/i.test(L)) want = s.radius * 2;
    else if (/height/i.test(L)) want = s.height;
    if (want == null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  // the base shape follows from the solid
  solveBaseShape() {
    const t = this.tex().toLowerCase();
    const want = /cylinder|cone|sphere/.test(t) ? 'circle'
      : (/triangular prism/.test(t) ? 'triangle'
      : (/rectangular prism|cuboid|box/.test(t) ? 'rectangle' : null));
    if (!want) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).toLowerCase().includes(want));
    return i < 0 ? null : { i, want };
  },

  solveBaseArea() {
    const s = this.solidDims(); if (!s || s.radius == null) return null;
    const want = s.radius * s.radius;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const num = e => { const m = this.norm(this.ascii(e.innerText)).match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : NaN; };
    const i = c.findIndex(e => num(e) === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // choices are either a number ("V = 50π") or a formula ("π(2)²(4)")
  solveVolume() {
    const s = this.solidDims(); if (!s || s.radius == null || s.height == null) return null;
    const want = /cone/i.test(this.tex()) ? (s.radius ** 2 * s.height / 3) : (s.radius ** 2 * s.height);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const dig = e => { const d = (this.ascii(e).match(/\d/g) || []).join('');
      const h = d.length / 2; return (d.length % 2 === 0 && d.slice(0, h) === d.slice(h)) ? d.slice(0, h) : d; };
    let i = c.findIndex(e => /π|pi/i.test(this.ascii(e.innerText)) && dig(e.innerText) === '' + s.radius + '2' + s.height);
    if (i < 0) { const num = e => { const m = this.norm(this.ascii(e.innerText)).match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : NaN; };
      i = c.findIndex(e => num(e) === want); }
    return i < 0 ? { miss: want } : { i, want };
  },

  // "Create a ... with radius = N" — the slider is just that number
  dimPlan() {
    const t = this.tex().replace(/\s/g, '');
    const m = t.match(/(?:radius|height|diameter)\D{0,10}?=?\D{0,6}?(\d+)/i); if (!m) return null;
    let v = +m[1]; if (/diameter/i.test(t)) v = v / 2;
    const sl = this.sliderPx(0);
    if (!sl || v < sl.lo || v > sl.hi || !Number.isInteger(v)) return null;
    return { v, from: sl.from, to: this.sliderPx(v).to };
  },

  // "base area of Npi" => radius = sqrt(N)
  radiusPlan() {
    const m = this.tex().replace(/\s/g, '').match(/area\D{0,14}?(\d+)pi/i); if (!m) return null;
    const r = Math.sqrt(+m[1]); if (!Number.isInteger(r)) return null;
    const sl = this.sliderPx(0); if (!sl || r < sl.lo || r > sl.hi) return null;
    return { v: r, from: sl.from, to: this.sliderPx(r).to };
  },

  // "volume = Npi": one dimension is fixed, the slider sets the other
  volPlan() {
    const t = this.tex().replace(/\s/g, '');
    const v = t.match(/volume&?=\D{0,14}?(\d+)pi/i) || t.match(/volume\D{0,14}?(\d+)pi/i); if (!v) return null;
    const V = +v[1], sl = this.sliderPx(0); if (!sl) return null;
    const fixed = new Set();
    const d = this.solidDims();
    if (d) { if (d.radius) fixed.add(d.radius); if (d.height) fixed.add(d.height); }
    (t.match(/\d+/g) || []).forEach(n => { if (+n > 0 && +n <= 50) fixed.add(+n); });
    for (let c = sl.lo; c <= sl.hi; c++)
      for (const o of fixed)
        if (c * c * o === V || o * o * c === V) return { v: c, from: sl.from, to: this.sliderPx(c).to };
    return null;
  },
});

(function () {
  const prev = window.__duo.plan;
  window.__duo.plan = function () {
    const t = this.tex();
    if (/volume/i.test(t)) { const v = this.volPlan(); if (v) return { kind: 'vol', v: v.v, from: v.from, to: v.to }; }
    if (/base area|area of/i.test(t)) { const r = this.radiusPlan(); if (r) return { kind: 'radius', v: r.v, from: r.from, to: r.to }; }
    if (/create a (cylinder|cone|prism)/i.test(t) && /(radius|height|diameter)\s*&?=/i.test(t)) {
      const d = this.dimPlan(); if (d) return { kind: 'dim', v: d.v, from: d.from, to: d.to };
    }
    return prev.call(this);
  };
  // last-resort choice match: compare digit sequences, de-duplicating AFTER
  // extracting them (π and parentheses render differently in latex vs innerText)
  const prevPh = window.__duo.solvePhantomChoice;
  window.__duo.solvePhantomChoice = function () {
    const r = prevPh.call(this); if (r && r.i >= 0) return r;
    const p = this.phantom(); if (!p) return r;
    const dig = s => { const d = (this.ascii(s).match(/\d/g) || []).join('');
      const h = d.length / 2; return (d.length % 2 === 0 && d.slice(0, h) === d.slice(h)) ? d.slice(0, h) : d; };
    const want = dig(p); if (!want) return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => dig(e.innerText) === want);
    return i < 0 ? r : { i, want };
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveBaseShape', /shape of the base/i],
  ['solveDimension', /(select|enter) the (radius|diameter|height)|length of the (radius|diameter|height)/i],
  ['solveBaseArea', /area of the base|base area/i],
  ['solveVolume', /volume of/i]);

;'__duo ready';

// typed radius / diameter / height / base area / volume


window.__duo.RULES.splice(2, 0, ['solveVolume', /volume/i]);

;'__duo ready';

// Radius vs height was ambiguous on cones (centre-x proximity guessed wrong and
// cost two answers). Decide it by the ORIENTATION of the nearest long line: the
// radius label sits on a horizontal segment inside the base, the height label
// beside a vertical one.
window.__duo.solidDims = function () {
  const t = this.tex().replace(/\s/g, '');
  const g = k => { const m = t.match(new RegExp(k + '&?=(\\d+(?:\\.\\d+)?)', 'i')); return m ? +m[1] : null; };
  const r0 = g('radius'), h0 = g('height'), d0 = g('diameter');
  if (r0 !== null || h0 !== null || d0 !== null)
    return { radius: r0 !== null ? r0 : (d0 !== null ? d0 / 2 : null), height: h0 };

  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const doc = f.contentDocument, fr = f.getBoundingClientRect();
  const B = e => { const b = e.getBoundingClientRect();
    return { w: b.width, h: b.height, cx: fr.left + b.left + b.width / 2, cy: fr.top + b.top + b.height / 2 }; };
  const labs = [...doc.querySelectorAll('text,tspan')]
    .map(e => ({ v: parseFloat(this.ascii(e.textContent.trim())), ...B(e) })).filter(o => !isNaN(o.v));
  if (labs.length < 2) return null;
  const segs = [...doc.querySelectorAll('line,path,polyline')].map(B).filter(o => o.w > 25 || o.h > 25);
  const near = o => { let best = null, bd = 1e9;
    segs.forEach(s => { const d = (s.cx - o.cx) ** 2 + (s.cy - o.cy) ** 2; if (d < bd) { bd = d; best = s; } });
    return best; };
  let radius = null, height = null;
  labs.forEach(o => { const s = near(o); if (!s) return;
    if (s.w >= s.h) { if (radius === null) radius = o.v; } else if (height === null) height = o.v; });
  if (radius === null || height === null) {
    const byY = labs.slice().sort((a, b) => a.cy - b.cy);
    radius = radius !== null ? radius : byY[0].v;
    height = height !== null ? height : byY[byY.length - 1].v;
  }
  return { radius, height };
};

// which label is r and which is h can still be ambiguous — compute BOTH and
// take whichever matches an offered answer
window.__duo.solveVolume = function () {
  const s = this.solidDims(); if (!s || s.radius == null || s.height == null) return null;
  const cone = /cone/i.test(this.tex());
  const cands = [s.radius ** 2 * s.height, s.height ** 2 * s.radius].map(v => cone ? v / 3 : v);
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const num = e => { const m = this.norm(this.ascii(e.innerText)).match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : NaN; };
  for (const want of cands) { const i = c.findIndex(e => num(e) === want); if (i >= 0) return { i, want }; }
  const dig = e => { const d = (this.ascii(e).match(/\d/g) || []).join('');
    const h = d.length / 2; return (d.length % 2 === 0 && d.slice(0, h) === d.slice(h)) ? d.slice(0, h) : d; };
  for (const [r, h] of [[s.radius, s.height], [s.height, s.radius]]) {
    const i = c.findIndex(e => /π|pi/i.test(this.ascii(e.innerText)) && dig(e.innerText) === '' + r + '2' + h);
    if (i >= 0) return { i, want: r * r * h };
  }
  return { miss: cands };
};

// when the choices are FORMULAS a cone must carry the 1/3 and a cylinder must not
window.__duo.solveVolumeForm = function () {
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
  if (!src.some(s => /pi|π/i.test(s))) return null;
  const third = s => /frac\{?1\}?\{?3\}?|1\/3|⅓/i.test(s.replace(/\s/g, ''));
  if (!src.some(third)) return null;
  const cone = /cone/i.test(this.tex());
  const i = src.findIndex(s => cone ? third(s) : !third(s));
  return i < 0 ? null : { i, want: cone ? '1/3' : 'no-1/3' };
};

// the shown formula often substitutes one value already, e.g. V = (1/3)π · 9 · h
window.__duo.volPlan = function () {
  const t = this.tex().replace(/\s/g, '');
  const v = t.match(/volume\D{0,16}?=?\D{0,6}?(\d+)pi/i); if (!v) return null;
  const V = +v[1], sl = this.sliderPx(0); if (!sl) return null;
  const cone = /frac13|cone/i.test(t);
  const fm = t.match(/=\s*(?:frac13)?pi(?:cdot)?(\d+)/i);
  if (fm) { const x = (cone ? 3 * V : V) / +fm[1];
    if (Number.isInteger(x) && x >= sl.lo && x <= sl.hi) return { v: x, from: sl.from, to: this.sliderPx(x).to }; }
  const fixed = new Set();
  const f = document.querySelector('iframe');
  if (f && f.contentDocument) [...f.contentDocument.querySelectorAll('text,tspan')]
    .forEach(e => { const n = parseFloat(this.ascii(e.textContent.trim())); if (!isNaN(n)) fixed.add(n); });
  (t.match(/\d+/g) || []).forEach(n => { if (+n > 0 && +n <= 60) fixed.add(+n); });
  const k = cone ? 3 : 1;
  for (let c = sl.lo; c <= sl.hi; c++)
    for (const o of fixed) if (c * c * o === V * k || o * o * c === V * k)
      return { v: c, from: sl.from, to: this.sliderPx(c).to };
  return null;
};

// self-contained, each with a digit-sequence fallback (π and parentheses render
// differently in LaTeX and innerText). NEVER rebuild these by string-replacing a
// serialized closure — that produced a self-referencing TDZ crash.
window.__duo.solveDuoblank = function () {
  const m = this.read().latex.join(' ').match(/\\duoblank\{([^}]*)\}/); if (!m) return null;
  const want = this.clean(m[1]);
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  let i = c.findIndex(e => this.clean(e.innerText) === want);
  if (i < 0) { const dig = s => { const d = (this.ascii(s).match(/\d/g) || []).join('');
      const h = d.length / 2; return (d.length % 2 === 0 && d.slice(0, h) === d.slice(h)) ? d.slice(0, h) : d; };
    const wd = dig(m[1]); if (wd) i = c.findIndex(e => dig(e.innerText) === wd); }
  if (i >= 0) return { i, want };
  if (this.read().input) { this.type(want); return { ok: true, idx: [], want: [want] }; }
  return { miss: want };
};

window.__duo.solvePhantomChoice = function () {
  const p = this.phantom(); if (!p) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const want = this.clean(p);
  let i = c.findIndex(e => this.clean(e.innerText) === want);
  if (i >= 0) return { i, want };
  const dig = s => { const d = (this.ascii(s).match(/\d/g) || []).join('');
    const h = d.length / 2; return (d.length % 2 === 0 && d.slice(0, h) === d.slice(h)) ? d.slice(0, h) : d; };
  const wd = dig(p);
  if (wd) { i = c.findIndex(e => dig(e.innerText) === wd); if (i >= 0) return { i, want: wd }; }
  return { miss: want };
};

window.__duo.RULES.splice(2, 0, ['solveVolumeForm', /volume/i]);

;'__duo ready';

// when the prompt doesn't name the solid, read it off the drawing: an <ellipse>
// (or an arc in a path) means a circular base
(function () {
  const prev = window.__duo.solveBaseShape;
  window.__duo.solveBaseShape = function () {
    const r = prev.call(this); if (r && r.i >= 0) return r;
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return r;
    const d = f.contentDocument;
    const round = d.querySelector('ellipse')
      || [...d.querySelectorAll('path')].some(p => /[Aa]/.test(p.getAttribute('d') || ''));
    if (!round) return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).toLowerCase().includes('circle'));
    return i < 0 ? r : { i, want: 'circle' };
  };
})();

;'__duo ready';
