
// LaTeX writes non-breaking spaces as ~ ("x~=~4"), which defeats every regex
(function () {
  const prev = window.__duo.tex;
  window.__duo.tex = function () { return prev.call(this).replace(/~/g, ''); };
})();

Object.assign(window.__duo, {
  // "Create a positive/negative/zero trend": the slider IS the trend's sign
  trendPlan() {
    const m = this.tex().toLowerCase().match(/create a\s*\S{0,12}?(positive|negative|zero|no)\s*trend/);
    if (!m) return null;
    const want = m[1] === 'positive' ? 1 : (m[1] === 'negative' ? -1 : 0);
    const sl = this.sliderPx(0); if (!sl || want < sl.lo || want > sl.hi) return null;
    return { kind: 'trend', v: want, from: sl.from, to: this.sliderPx(want).to };
  },

  // "Set the y-intercept to N" — \emphasis{} leaves ~9 non-digit chars after "to"
  setPlan() {
    const t = this.tex().replace(/\s/g, '');
    const m = t.match(/setthe\D{0,26}?to\D{0,14}?(-?\d+)/i) || t.match(/to\D{0,14}?(-?\d+)/i);
    if (!m) return null;
    const v = +m[1], sl = this.sliderPx(0); if (!sl || v < sl.lo || v > sl.hi) return null;
    return { kind: 'set', v, from: sl.from, to: this.sliderPx(v).to };
  },

  // "Graph the line of best fit: y = mx + b" — the slider holds one parameter
  graphPlan() {
    const m = this.tex().replace(/\s/g, '').match(/y=(-?\d*)x([+-]\d+)?/i); if (!m) return null;
    const slope = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : +m[1]);
    const inter = m[2] ? +m[2] : 0;
    const sl = this.sliderPx(0); if (!sl) return null;
    for (const v of [inter, slope])
      if (v >= sl.lo && v <= sl.hi && v !== sl.now)
        return { kind: 'graph', v, from: sl.from, to: this.sliderPx(v).to };
    return null;
  },

  solveSlopeDir() {
    const bf = this.bestFit();
    const m = bf && Number.isFinite(bf.m) ? bf.m : this.corr();
    if (m === null || !Number.isFinite(m)) return null;
    const want = Math.abs(m) < 0.05 ? 'zero' : (m > 0 ? 'positive' : 'negative');
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).toLowerCase());
    let i = txt.findIndex(t => t.includes(want));
    if (i < 0 && want === 'positive') i = txt.findIndex(t => /up|increas/.test(t));
    if (i < 0 && want === 'negative') i = txt.findIndex(t => /down|decreas/.test(t));
    return i < 0 ? { miss: want } : { i, want };
  },

  // Read x from the PROMPT line only: tex() concatenates the choices, so
  // "x = 4" with choices 2,1,0 parsed as x = 4210.
  solvePredict() {
    const L0 = this.ascii(this.read().latex[0] || '').replace(/[~\s]/g, '')
      .replace(/[{}\\]|mathbf|textbf/g, '');
    const xm = L0.match(/x=(-?\d+)/i); if (!xm) return null;
    const x = +xm[1];
    const q = (this.pts() || []).map(o => o[1]).filter(v => v && isFinite(v[0]) && isFinite(v[1]));
    let want = null;
    const hit = q.find(v => v[0] === x);
    if (hit) want = hit[1];
    else if (q.length >= 2) {
      const n = q.length, mx = q.reduce((s, v) => s + v[0], 0) / n, my = q.reduce((s, v) => s + v[1], 0) / n;
      let sxy = 0, sxx = 0;
      q.forEach(v => { sxy += (v[0] - mx) * (v[1] - my); sxx += (v[0] - mx) ** 2; });
      if (sxx) want = Math.round(my + (sxy / sxx) * (x - mx));
    }
    if (want === null) { const bf = this.bestFit(); if (bf) want = Math.round(bf.m * x + bf.b); }
    if (want === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },
});

// the intercept may be offered as a POINT (0,b) rather than a bare number
(function () {
  const prev = window.__duo.solveFit;
  window.__duo.solveFit = function () {
    const r = prev.call(this); if (r && r.i >= 0) return r;
    const bf = this.bestFit(); if (!bf || !/intercept/i.test(this.tex())) return r;
    const want = '(0,' + Math.round(bf.b) + ')';
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '') === want);
    return i < 0 ? r : { i, want };
  };
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const t = this.tex();
    if (/create a\s*\S{0,12}?(positive|negative|zero|no)\s*trend/i.test(t)) { const p = this.trendPlan(); if (p) return p; }
    if (/graph the line/i.test(t)) { const p = this.graphPlan(); if (p) return p; }
    if (/set the/i.test(t)) { const p = this.setPlan(); if (p) return p; }
    return base.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveSlopeDir', /direction of the slope/i],
  ['solvePredict', /value when/i]);

;'__duo ready';

// A HORIZONTAL best-fit line has slope 0, but the slanted-line filter found
// nothing at all — handle the flat case explicitly.
(function () {
  const prev = window.__duo.bestFit;
  window.__duo.bestFit = function () {
    const r = prev.call(this); if (r) return r;
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument;
    const flat = [...d.querySelectorAll('line')].filter(e => !/grid/.test(String(e.getAttribute('class'))))
      .map(e => ({ y: +e.getAttribute('y1'), y2: +e.getAttribute('y2'),
                   x1: +e.getAttribute('x1'), x2: +e.getAttribute('x2') }))
      .filter(o => Math.abs(o.y - o.y2) < 2 && Math.abs(o.x1 - o.x2) > 40)[0];
    if (!flat) return null;
    const s = this.scale(); if (!s) return null;
    const svg = d.querySelector('svg'), sr = svg.getBoundingClientRect(), fr = f.getBoundingClientRect();
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const sy = vb.length === 4 ? sr.height / vb[3] : 1, oy = vb.length === 4 ? -vb[1] * sy : 0;
    const b = s.grid(0, fr.top + sr.top + oy + flat.y * sy)[1];
    return { m: 0, b, p1: [0, b], p2: [1, b] };
  };
})();

;'__duo ready';

// Scan each latex ENTRY for a standalone equation. Concatenating them made
// "y = 8x - 4" swallow the choice digits and evaluate to -4524804.
window.__duo.equation = function () {
  for (const s of this.read().latex) {
    const t = this.ascii(s).replace(/[~\s]/g, '').replace(/[{}\\]|mathbf|textbf|text/g, '');
    const m = t.match(/^y=(-?\d*)x([+-]\d+)?$/i);
    if (m) { const a = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : +m[1]);
      return { m: a, b: m[2] ? +m[2] : 0 }; }
  }
  return null;
};

window.__duo.solvePredict = function () {
  const L0 = this.ascii(this.read().latex[0] || '').replace(/[~\s]/g, '').replace(/[{}\\]|mathbf|textbf/g, '');
  const xm = L0.match(/x=(-?\d+)/i); if (!xm) return null;
  const x = +xm[1];
  let want = null;
  const eq = this.equation(); if (eq) want = eq.m * x + eq.b;
  if (want === null) {
    const q = (this.pts() || []).map(o => o[1]).filter(v => v && isFinite(v[0]) && isFinite(v[1]));
    const hit = q.find(v => v[0] === x);
    if (hit) want = hit[1];
    else if (q.length >= 2) {
      const n = q.length, mx = q.reduce((s, v) => s + v[0], 0) / n, my = q.reduce((s, v) => s + v[1], 0) / n;
      let sxy = 0, sxx = 0;
      q.forEach(v => { sxy += (v[0] - mx) * (v[1] - my); sxx += (v[0] - mx) ** 2; });
      if (sxx) want = Math.round(my + (sxy / sxx) * (x - mx));
    }
  }
  if (want === null) { const bf = this.bestFit(); if (bf) want = Math.round(bf.m * x + bf.b); }
  if (want === null) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = c.findIndex(e => this.clean(e.innerText) === String(want));
  return i < 0 ? { miss: want } : { i, want };
};

// "Complete the scatter plot (x,y)" is the same as "place the point"
window.__duo.placePlan = function () {
  const t = this.tex().replace(/\s/g, '');
  const m = t.match(/(?:place|complete)[^(]*\((-?\d+),(-?\d+)\)/i); if (!m) return null;
  const tgt = [+m[1], +m[2]];
  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const d = f.contentDocument, fr = f.getBoundingClientRect();
  const dp = d.querySelector('.draggable-point');
  if (dp) { const s = this.scale(); if (!s) return null;
    const r = dp.getBoundingClientRect();
    return { kind: 'place', tgt,
      from: [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)],
      to: s.px(tgt[0], tgt[1]) }; }
  const sl = this.sliderPx(0); if (!sl) return null;
  const fx = t.match(/\((-?\d+),duodisplay/i), fy = t.match(/duodisplay[^)]*,(-?\d+)\)/i);
  const want = (fx && +fx[1] === tgt[0]) ? tgt[1] : ((fy && +fy[1] === tgt[1]) ? tgt[0] : tgt[1]);
  if (want < sl.lo || want > sl.hi) return null;
  return { kind: 'coord', v: want, from: sl.from, to: this.sliderPx(want).to };
};

// guided prediction: the substitution step puts a NUMBER in parentheses

// guided steps render their choices a beat late — re-read once before deciding
// a screen is a no-answer explainer

(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    if (/place the point|complete the scatter/i.test(this.tex())) { const p = this.placePlan(); if (p) return p; }
    return base.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveSubstitute', /predicted output|substitut/i],
  ['solvePredict', /predicted output|value when|output when/i]);

;'__duo ready';

// ---- two-way frequency tables (unit 135) ----
Object.assign(window.__duo, {


  // header "9th" vs prompt "Grade 9": fall back to matching on the digits
  hdrMatch(h, L) {
    h = String(h).toLowerCase(); if (!h) return false;
    if (L.includes(h)) return true;
    const dh = h.replace(/\D/g, '');
    if (dh && new RegExp('\\b' + dh + '\\b').test(L)) return true;
    const w = h.replace(/[^a-z]/g, '');
    return w.length > 2 && L.includes(w);
  },



  // a "?" cell is recoverable from its column total
  solveTableMissing() {
    const T = this.table(); if (!T || T.length < 2) return null;
    const body = T.slice(1);
    const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
    let ri = -1, ci = -1;
    body.forEach((r, i) => r.forEach((v, j) => { if (/\?/.test(String(v))) { ri = i; ci = j; } }));
    if (ri < 0) return null;
    const totalRow = body.findIndex(r => /total/i.test(String(r[0])));
    let want = null;
    if (totalRow >= 0 && totalRow !== ri) {
      const tot = num(body[totalRow][ci]);
      const others = body.filter((r, i) => i !== ri && i !== totalRow).reduce((a, r) => a + (num(r[ci]) || 0), 0);
      if (tot !== null) want = tot - others;
    }
    if (want === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    if (i >= 0) return { i, want };
    if (this.read().input) { this.type(String(want)); return { ok: true, idx: [], want: [String(want)] }; }
    return { miss: want };
  },

  // "Complete the table": work out each blank from its column total and drag the
  // matching tile into it. Uses the positional grid so blanks are located.
  tablePlan() {
    const G = this.gridCells(); if (!G) return null;
    const g = G.grid;
    const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
    const totR = g.findIndex(r => /total/i.test(String(r[0])));
    if (totR < 0) return null;
    const cols = g[0].map((v, i) => v ? i : -1).filter(i => i > 0);
    const bodyRows = g.map((r, i) => (i > 0 && i < totR && r[0]) ? i : -1).filter(i => i >= 0);
    const wants = [];
    cols.forEach(ci => {
      const missing = bodyRows.filter(ri => !g[ri][ci]);
      if (missing.length === 1) {
        const tot = num(g[totR][ci]);
        const others = bodyRows.filter(ri => ri !== missing[0]).reduce((a, ri) => a + (num(g[ri][ci]) || 0), 0);
        if (tot !== null) wants.push({ r: missing[0], c: ci, val: tot - others });
      } else if (!g[totR][ci]) {
        wants.push({ r: totR, c: ci, val: bodyRows.reduce((a, ri) => a + (num(g[ri][ci]) || 0), 0) });
      }
    });
    if (!wants.length) return null;
    // tiles sit below the table: numeric cells in rows past the total row
    const tiles = [];
    g.forEach((r, i) => { if (i <= totR) return;
      r.forEach((v, j) => { if (/^\d+$/.test(String(v))) tiles.push({ v: +v, xy: [Math.round(G.xs[j]), Math.round(G.ys[i])] }); }); });
    const used = [], steps = [];
    wants.forEach(w => { const tk = tiles.find(x => x.v === w.val && !used.includes(x));
      if (tk) { used.push(tk); steps.push({ from: tk.xy, to: [Math.round(G.xs[w.c]), Math.round(G.ys[w.r])], val: w.val }); } });
    return { wants: wants.map(w => w.val), steps };
  },
});

window.__duo.RULES.splice(2, 0,
  ['solveTableMissing', null],
  ['solveTableCell', /frequency for|how many/i],
  ['solveTableTotal', /total for/i]);

;'__duo ready';

// the "?" can be IN the Total row — then it's the column SUM, not a difference
window.__duo.solveTableMissing = function () {
  const T = this.table(); if (!T || T.length < 2) return null;
  const body = T.slice(1);
  const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
  let ri = -1, ci = -1;
  body.forEach((r, i) => r.forEach((v, j) => { if (/\?/.test(String(v))) { ri = i; ci = j; } }));
  if (ri < 0) return null;
  const totalRow = body.findIndex(r => /total/i.test(String(r[0])));
  let want = null;
  if (ri === totalRow) want = body.filter((r, i) => i !== totalRow).reduce((a, r) => a + (num(r[ci]) || 0), 0);
  else if (totalRow >= 0) { const tot = num(body[totalRow][ci]);
    const others = body.filter((r, i) => i !== ri && i !== totalRow).reduce((a, r) => a + (num(r[ci]) || 0), 0);
    if (tot !== null) want = tot - others; }
  if (want === null) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = c.findIndex(e => this.clean(e.innerText) === String(want));
  if (i >= 0) return { i, want };
  if (this.read().input) { this.type(String(want)); return { ok: true, idx: [], want: [String(want)] }; }
  return { miss: want };
};

// typed table questions: with no choices the solver reports its value in `miss`


window.__duo.RULES.splice(2, 0, ['solveTableTotal', /total frequency for|total for/i]);

;'__duo ready';
