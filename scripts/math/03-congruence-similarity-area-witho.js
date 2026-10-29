
// ---- congruence / similarity / area, without screenshots ----
Object.assign(window.__duo, {
  // a translate slider is "how many units", straight from the prompt
  unitSlider() {
    const sl = this.sliderPx(0); if (!sl) return null;
    const m = this.tex().match(/(\d+)\s*units?/); if (!m) return null;
    const v = +m[1]; if (v < sl.lo || v > sl.hi) return null;
    return { v, from: sl.from, to: this.sliderPx(v).to };
  },

  // figure size in GRID units, from the client bbox over px-per-unit
  figs() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, s = this.scale(); if (!s) return null;
    const u = Math.abs(s.px(1, 0)[0] - s.px(0, 0)[0]);
    return [...d.querySelectorAll('.shape,.polygon')].map(e => { const r = e.getBoundingClientRect();
      return { w: +(r.width / u).toFixed(2), h: +(r.height / u).toFixed(2) }; })
      .filter(x => x.w > 0.1 && x.h > 0.1);
  },

  solveRelation() {
    const fg = this.figs(); if (!fg || fg.length < 2) return null;
    const [a, b] = fg, eq = (x, y) => Math.abs(x - y) < 0.15;
    const congruent = eq(a.w, b.w) && eq(a.h, b.h);
    const similar = congruent || eq(a.w / a.h, b.w / b.h);
    const want = congruent ? 'congruent' : (similar ? 'similarbutnotcongruent' : 'neithersimilarnorcongruent');
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '') === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // shapes are <polygon points> OR <path d> with rounded corners — pull the
  // coordinate pairs out of either, shoelace, rescale to grid units
  area() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const el = f.contentDocument.querySelector('.shape,.polygon'); if (!el) return null;
    let P = [];
    if (el.points && el.points.length) P = [...el.points].map(p => [p.x, p.y]);
    else { const nums = (el.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
      if (!nums) return null;
      for (let i = 0; i + 1 < nums.length; i += 2) P.push([+nums[i], +nums[i + 1]]); }
    if (P.length < 3) return null;
    let a = 0;
    for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; a += P[i][0] * P[j][1] - P[j][0] * P[i][1]; }
    a = Math.abs(a) / 2;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const rawW = Math.max(...xs) - Math.min(...xs), rawH = Math.max(...ys) - Math.min(...ys);
    const g = this.figs(); if (!g || !g.length || !rawW || !rawH) return null;
    return +(a * (g[0].w / rawW) * (g[0].h / rawH)).toFixed(2);
  },

  solveArea() {
    const a = this.area(); if (a === null) return null;
    const want = String(Math.round(a));
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '') === want);
    return i < 0 ? { miss: want, a } : { i, want };
  },
});

// a units slider is not a rotation — claim it before plan()'s other branches
(function () {
  const prev = window.__duo.plan;
  window.__duo.plan = function () {
    const f = document.querySelector('iframe');
    if (f && f.contentDocument && f.contentDocument.querySelector('.slider2d-thumb')
        && !f.contentDocument.querySelector('.draggable-point')) {
      const u = this.unitSlider();
      if (u && !/rotat/i.test(this.tex())) return { kind: 'units', v: u.v, from: u.from, to: u.to };
    }
    return prev.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveRelation', /relationship between/i],
  ['solveArea', /area of a congruent/i]);

;'__duo ready';

// Rounded corners shave a few percent off the shoelace result, so snap: the
// ratio of area to bounding box says rectangle (1) or triangle (1/2), and the
// box itself snaps to whole grid units. Raw 11.38 was really 12.
window.__duo.areaExact = function () {
  const a = this.area(), g = this.figs();
  if (a === null || !g || !g.length) return null;
  const W = Math.round(g[0].w), H = Math.round(g[0].h); if (!W || !H) return Math.round(a);
  const ratio = a / (g[0].w * g[0].h);
  if (Math.abs(ratio - 1) < 0.08) return W * H;
  if (Math.abs(ratio - 0.5) < 0.08) return W * H / 2;
  return Math.round(a);
};

window.__duo.solveArea = function () {
  const a = this.areaExact(); if (a === null) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '') === String(a));
  return i < 0 ? { miss: a } : { i, want: String(a) };
};

// "Enter the ..." variants: area and side length come off the figure

;'__duo ready';

// ---- dilations (unit 128) ----
Object.assign(window.__duo, {
  // \emphasis{} sits between "factor" and its number once braces are stripped.
  // The gap MUST be lazy: a greedy \D swallows the minus and -2 reads as 2.
  factor() { const m = this.tex().match(/factor\D{0,15}?(-?\d+(?:\.\d+)?)/i); return m ? +m[1] : null; },

  // on a dilation the slider IS the scale factor, and its range can go negative
  dilate() {
    const k = this.factor(); if (k === null) return null;
    const sl = this.sliderPx(0); if (!sl || k < sl.lo || k > sl.hi) return null;
    return { v: k, from: sl.from, to: this.sliderPx(k).to };
  },

  solveDilatePos() {
    const L = this.tex();
    const m = L.match(/(?:dilation by|scale factor\s*=?)\D{0,15}?(-?\d+(?:\.\d+)?(?:\/\d+)?)/i)
           || L.match(/factor\D{0,15}?(-?\d+(?:\/\d+)?)/i);
    if (!m) return null;
    const k = m[1].includes('/') ? (+m[1].split('/')[0] / +m[1].split('/')[1]) : +m[1];
    const a = Math.abs(k), want = a > 1 ? 'farther' : (a < 1 ? 'closer' : 'same');
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).toLowerCase());
    let i = txt.findIndex(t => t.includes(want));
    if (i < 0 && want === 'same') i = txt.findIndex(t => /same|unchanged|nochange/.test(t));
    return i < 0 ? { miss: want } : { i, want };
  },

  // the centre of a dilation lies on the line through p and p'
  solveDilateCenter() {
    const p = this.pts(); if (!p || p.length < 2) return null;
    const a = p[0][1], b = p[1][1];
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const cand = c.map(e => { const m = this.norm(this.ascii(e.innerText)).match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
      return m ? [+m[1], +m[2]] : null; });
    const i = cand.findIndex(q => q && ((a[0] - q[0]) * (b[1] - q[1]) - (a[1] - q[1]) * (b[0] - q[0])) === 0);
    return i < 0 ? { miss: 'collinear' } : { i, want: cand[i] };
  },

  // k = |p'| / |p| about the origin
  solveDilateFactor() {
    const p = this.pts(); if (!p || p.length < 2) return null;
    const gh = p.find(q => /ghost/.test(q[0])), so = p.find(q => !/ghost/.test(q[0]));
    if (!gh || !so) return null;
    const da = Math.hypot(gh[1][0], gh[1][1]), db = Math.hypot(so[1][0], so[1][1]);
    if (!da) return null;
    const k = db / da;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    const val = t => t.includes('/') ? (+t.split('/')[0] / +t.split('/')[1]) : +t;
    let i = txt.findIndex(t => Math.abs(val(t) - k) < 0.05);
    if (i < 0) i = txt.findIndex(t => Math.abs(val(t) - 1 / k) < 0.05);
    return i < 0 ? { miss: k } : { i, want: k };
  },

  solveDilateChoice() {
    const p = this.pts();
    const src = (p && p.length) ? (p.find(q => !/ghost/.test(q[0])) || p[0])[1] : this.subject();
    if (!src) return null;
    const t = this.target(src); if (!t) return null;
    const want = '(' + t[0] + ',' + t[1] + ')';
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '')).indexOf(want);
    return i < 0 ? { miss: want, src } : { i, want };
  },
});

// dilation joins translate/reflect/rotate as an ordered step
(function () {
  const prev = window.__duo.steps;
  window.__duo.steps = function (L) {
    const out = prev.call(this, L);
    for (const m of L.matchAll(/(?:scale factor|dilat\w*(?: by)?)\D{0,15}?(-?\d+(?:\.\d+)?)/gi)) {
      const k = +m[1], c = this.centre(L);
      out.push({ i: m.index, fn: p => [Math.round(c[0] + (p[0] - c[0]) * k), Math.round(c[1] + (p[1] - c[1]) * k)] });
    }
    return out.sort((a, b) => a.i - b.i);
  };
  const prevPlan = window.__duo.plan;
  window.__duo.plan = function () {
    if (/dilat/i.test(this.tex())) { const d = this.dilate();
      if (d) return { kind: 'factor', v: d.v, from: d.from, to: d.to }; }
    return prevPlan.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveDilatePos', /position of a dilated|position after dilation/i],
  ['solveDilateCenter', /center of dilation/i],
  ['solveDilateFactor', /dilation scale factor/i],
  ['solveDilateChoice', /dilated by scale factor|point dilated/i]);

;'__duo ready';

// p and p' may be points OR shapes; figure size is the more reliable ratio

// "Select the endpoints ..." — transform BOTH points and match the pair
window.__duo.solveEndpoints = function () {
  const p = this.pts().filter(q => !/ghost/.test(q[0])).map(q => q[1]);
  if (p.length < 2) return null;
  const t = p.map(q => this.target(q)); if (t.some(x => !x)) return null;
  const want = t.map(q => '(' + q[0] + ',' + q[1] + ')').sort().join('');
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = c.findIndex(e => {
    const m = [...this.norm(this.ascii(e.innerText)).replace(/\s/g, '').matchAll(/\(-?\d+,-?\d+\)/g)].map(x => x[0]);
    return m.length === 2 && m.sort().join('') === want;
  });
  return i < 0 ? { miss: want } : { i, want };
};

// One solver for every "bigger / smaller / same" phrasing — length, area,
// distance, position. |k|>1 grows, <1 shrinks, ==1 unchanged. (Area really
// scales by k squared, but the qualitative answer only needs the direction.)
window.__duo.solveQualitative = function () {
  const m = this.tex().match(/(?:scale factor|dilation by|factor)\s*=?\D{0,10}?(-?\d+(?:\.\d+)?(?:\/\d+)?)/i);
  if (!m) return null;
  const k = Math.abs(m[1].includes('/') ? (+m[1].split('/')[0] / +m[1].split('/')[1]) : +m[1]);
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '').toLowerCase());
  const GROW = /larger|longer|bigger|farther|greater/, SHRINK = /smaller|shorter|closer|less/, SAME = /same|unchanged|equal/;
  if (!txt.some(t => GROW.test(t) || SHRINK.test(t) || SAME.test(t))) return null;
  const pick = k > 1 ? GROW : (k < 1 ? SHRINK : SAME);
  const i = txt.findIndex(t => pick.test(t));
  return i < 0 ? { miss: k } : { i, want: txt[i] };
};

window.__duo.RULES.splice(2, 0,
  ['solveQualitative', /select the (area|length|position|distance) of|position after dilation/i],
  ['solveEndpoints', /endpoints/i],
  ['solveDilateFactor', /scale factor from|dilation scale factor/i]);

;'__duo ready';

// BUG (cost 3 answers): the ratio was forced >1 via max/min, so a SHRINKING
// dilation reported its reciprocal — 0.5 read as 2. Direction matters:
// k = image / pre-image, and ghost is the PRE-image.
window.__duo.kFactor = function () {
  const src = this.pts().concat(this.shapes());
  const gh = src.find(q => /ghost/.test(q[0])), so = src.find(q => !/ghost/.test(q[0]));
  const fg = this.figs();
  if (fg && fg.length >= 2 && gh && so) {
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const big = fg[0].w >= fg[1].w ? fg[0] : fg[1], small = fg[0].w >= fg[1].w ? fg[1] : fg[0];
    const ghIsSmall = d(gh[1], [0, 0]) <= d(so[1], [0, 0]);
    const pre = ghIsSmall ? small : big, img = ghIsSmall ? big : small;
    if (pre.w) return img.w / pre.w;
  }
  if (gh && so) { const da = Math.hypot(gh[1][0], gh[1][1]), db = Math.hypot(so[1][0], so[1][1]);
    if (da) return db / da; }
  return null;
};

window.__duo.solveDilateFactor = function () {
  const k = this.kFactor(); if (k === null) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
  const val = t => t.includes('/') ? (+t.split('/')[0] / +t.split('/')[1]) : parseFloat(t);
  const i = txt.findIndex(t => Math.abs(val(t) - k) < 0.06);
  return i < 0 ? { miss: k } : { i, want: k };
};

window.__duo.typeAnswer = function () {
  const L = this.tex();
  if (/scale factor from|dilation scale factor/i.test(L)) {
    const k = this.kFactor();
    if (k !== null) { const v = String(Math.round(k * 1000) / 1000); this.type(v); return v; } }
  if (/side length/i.test(L)) { const g = this.figs();
    if (g && g.length) { const v = String(Math.round(Math.max(g[0].w, g[0].h))); this.type(v); return v; } }
  if (/area/i.test(L)) { const a = this.areaExact();
    if (a !== null) { const v = String(a); this.type(v); return v; } }
  const A = this.read().latex.join(' ');
  const m = A.match(/\\duoblank\{([^}]*)\}/) || A.match(/\\phantom\{([^}]*)\}/);
  if (m) { const v = this.clean(m[1]); if (v !== '') { this.type(v); return v; } }
  const g = this.answer(); if (g) { this.type(g[0]); return g[0]; }
  return null;
};

;'__duo ready';
