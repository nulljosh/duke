
// ---- scatter plots and data (unit 133) ----
Object.assign(window.__duo, {
  // ROBUST axis calibration: x-axis labels SHARE a y (and vice versa). Group by
  // rounded coordinate and take the biggest group with >=2 distinct values.
  // The older "distance from the mean" split collapsed on 0-based L-shaped axes
  // and produced a degenerate x scale.
  scale() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const labs = [...d.querySelectorAll('.axis-label,text,tspan')].map(e => { const r = e.getBoundingClientRect();
      return { v: +this.ascii(e.textContent.trim()).replace(/[−–]/g, '-'),
               x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 }; })
      .filter(o => !isNaN(o.v));
    if (labs.length < 4) return null;
    const group = key => { const m = {};
      labs.forEach(o => { const k = Math.round(o[key] / 6) * 6; (m[k] = m[k] || []).push(o); });
      let best = null;
      Object.values(m).forEach(g => { const vs = new Set(g.map(o => o.v));
        if (vs.size >= 2 && (!best || g.length > best.length)) best = g; });
      return best; };
    const xs = group('y'), ys = group('x'); if (!xs || !ys) return null;
    const fit = (g, key) => { const a = g.slice().sort((p, q) => p.v - q.v);
      const lo = a[0], hi = a[a.length - 1], u = (hi[key] - lo[key]) / (hi.v - lo.v);
      return { u, o: lo[key] - lo.v * u }; };
    const xa = fit(xs, 'x'), ya = fit(ys, 'y');
    if (!isFinite(xa.u) || !isFinite(ya.u) || !xa.u || !ya.u) return null;
    return { px: (gx, gy) => [Math.round(xa.o + gx * xa.u), Math.round(ya.o + gy * ya.u)],
             grid: (x, y) => [Math.round((x - xa.o) / xa.u), Math.round((y - ya.o) / ya.u)] };
  },

  // "Place the point at (x,y)": drag the point, or — when there is no draggable
  // point — a slider sets the ONE free coordinate (the formula shows the fixed one)
  placePlan() {
    const t = this.tex().replace(/\s/g, '');
    const m = t.match(/place[^(]*\((-?\d+),(-?\d+)\)/i); if (!m) return null;
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
    let want = (fx && +fx[1] === tgt[0]) ? tgt[1] : ((fy && +fy[1] === tgt[1]) ? tgt[0] : tgt[1]);
    if (want < sl.lo || want > sl.hi) return null;
    return { kind: 'coord', v: want, from: sl.from, to: this.sliderPx(want).to };
  },

  // "Plot the data (a,b), (c,d), ..." — one draggable point per pair
  plotPlan() {
    const t = this.tex().replace(/\s/g, '');
    const pairs = [...t.matchAll(/\((-?\d+),(-?\d+)\)/g)].map(m => [+m[1], +m[2]]);
    if (pairs.length < 2) return null;
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), s = this.scale(); if (!s) return null;
    const dps = [...d.querySelectorAll('.draggable-point')].map(e => { const r = e.getBoundingClientRect();
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; });
    if (!dps.length) return null;
    const used = [], steps = [];
    pairs.forEach(p => { const to = s.px(p[0], p[1]);
      let best = null, bd = 1e9;
      dps.forEach(v => { if (used.includes(v)) return;
        const dd = (v[0] - to[0]) ** 2 + (v[1] - to[1]) ** 2; if (dd < bd) { bd = dd; best = v; } });
      if (best) { used.push(best); steps.push({ from: best, to, pair: p }); } });
    return { pairs, steps };
  },

  solveCount() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const n = f.contentDocument.querySelectorAll('.point').length; if (!n) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(n));
    return i < 0 ? { miss: n } : { i, want: n };
  },

  // independent = x axis, dependent = y axis. Axis TITLES are the non-numeric
  // labels: the x title sits lowest, the y title leftmost.
  axisTitles() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const labs = [...d.querySelectorAll('text,tspan')].map(e => { const r = e.getBoundingClientRect();
      return { t: this.ascii(e.textContent.trim()),
               x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 }; })
      .filter(o => o.t && !/^-?\d+(\.\d+)?$/.test(o.t));
    if (!labs.length) return null;
    const xt = labs.slice().sort((a, b) => b.y - a.y)[0];
    const yt = labs.filter(o => o !== xt).sort((a, b) => a.x - b.x)[0];
    return { x: xt && xt.t, y: yt && yt.t };
  },

  solveVariable() {
    const L = this.tex(), a = this.axisTitles(); if (!a) return null;
    const want = /independent/i.test(L) ? a.x : (/dependent/i.test(L) ? a.y : null);
    if (!want) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const n = s => this.norm(this.ascii(s)).toLowerCase().replace(/[^a-z0-9]/g, '');
    const i = c.findIndex(e => n(e.innerText) === n(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  solveVarValue() {
    const L = this.tex(), m = L.replace(/\s/g, '').match(/\((-?\d+),(-?\d+)\)/); if (!m) return null;
    const want = /independent/i.test(L) ? +m[1] : (/dependent/i.test(L) ? +m[2] : null);
    if (want === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  solveOrderedPair() {
    const p = this.pts(); if (!p || !p.length) return null;
    const q = (p.find(o => !/ghost/.test(o[0])) || p[0])[1];
    if (!q || !isFinite(q[0]) || !isFinite(q[1])) return null;
    const want = '(' + q[0] + ',' + q[1] + ')';
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '') === want);
    return i < 0 ? { miss: want } : { i, want };
  },
});

(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    if (/place the point/i.test(this.tex())) { const p = this.placePlan(); if (p) return p; }
    return base.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveCount', /number of data points|how many points/i],
  ['solveVariable', /(independent|dependent) variable/i],
  ['solveVarValue', /value of the (independent|dependent)/i],
  ['solveOrderedPair', /ordered pair/i]);

;'__duo ready';

// several points are plotted: match the choice against ANY of them
window.__duo.solveOrderedPair = function () {
  const p = this.pts(); if (!p || !p.length) return null;
  const set = new Set(p.map(o => o[1]).filter(q => q && isFinite(q[0]) && isFinite(q[1]))
    .map(q => '(' + q[0] + ',' + q[1] + ')'));
  if (!set.size) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = c.findIndex(e => set.has(this.norm(this.ascii(e.innerText)).replace(/\s/g, '')));
  return i < 0 ? { miss: [...set] } : { i, want: this.norm(this.ascii(c[i].innerText)) };
};

// typed variants for the data unit


// ---- scatter-plot statistics ----
// These plots often have NO numeric axis labels, so scale() cannot calibrate.
// Correlation, clustering and outliers don't need real units — work in raw
// pixels (y negated, since screen y grows downward).
Object.assign(window.__duo, {
  pixPts() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return [];
    return [...f.contentDocument.querySelectorAll('.point')].map(e => { const r = e.getBoundingClientRect();
      return [r.left + r.width / 2, -(r.top + r.height / 2)]; });
  },

  corr() {
    const q = this.pixPts(); if (q.length < 3) return null;
    const n = q.length, mx = q.reduce((s, v) => s + v[0], 0) / n, my = q.reduce((s, v) => s + v[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    q.forEach(v => { sxy += (v[0] - mx) * (v[1] - my); sxx += (v[0] - mx) ** 2; syy += (v[1] - my) ** 2; });
    return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : 0;
  },

  solveAssociation() {
    const r = this.corr(); if (r === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).toLowerCase());
    if (txt.some(t => /linear/.test(t))) {
      const want = Math.abs(r) > 0.85 ? 'linear' : 'nonlinear';
      const i = txt.findIndex(t => want === 'linear' ? /^linear/.test(t) : /nonlinear/.test(t));
      return i < 0 ? { miss: want } : { i, want, r: +r.toFixed(2) };
    }
    const want = Math.abs(r) < 0.3 ? 'no' : (r > 0 ? 'positive' : 'negative');
    let i = txt.findIndex(t => t.includes(want));
    if (i < 0 && want === 'no') i = txt.findIndex(t => /no association|none/.test(t));
    return i < 0 ? { miss: want } : { i, want, r: +r.toFixed(2) };
  },

  // the cluster is the offered set with the smallest bounding box
  solveCluster() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const sets = c.map(e => [...this.norm(this.ascii(e.innerText)).matchAll(/\((-?\d+),\s*(-?\d+)\)/g)]
      .map(m => [+m[1], +m[2]]));
    if (!sets.length || sets.some(s => s.length < 2)) return null;
    const spread = s => { const xs = s.map(p => p[0]), ys = s.map(p => p[1]);
      return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys)); };
    let best = 0; sets.forEach((s, i) => { if (spread(s) < spread(sets[best])) best = i; });
    return { i: best, want: sets[best] };
  },

  // the outlier is the offered point furthest from the centre of the data
  solveOutlier() {
    const p = this.pts();
    const all = (p || []).map(o => o[1]).filter(q => q && isFinite(q[0]) && isFinite(q[1]));
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const cand = c.map(e => { const m = this.norm(this.ascii(e.innerText)).match(/\((-?\d+),\s*(-?\d+)\)/);
      return m ? [+m[1], +m[2]] : null; });
    if (cand.some(x => !x)) return null;
    const pool = all.length >= 3 ? all : cand;
    const cx = pool.reduce((s, q) => s + q[0], 0) / pool.length;
    const cy = pool.reduce((s, q) => s + q[1], 0) / pool.length;
    let best = 0;
    cand.forEach((q, i) => { if ((q[0] - cx) ** 2 + (q[1] - cy) ** 2 >
      (cand[best][0] - cx) ** 2 + (cand[best][1] - cy) ** 2) best = i; });
    return { i: best, want: cand[best] };
  },
});

window.__duo.RULES.splice(2, 0,
  ['solveCluster', /cluster/i],
  ['solveOutlier', /outlier/i],
  ['solveAssociation', /association/i]);

;'__duo ready';

// ---- line of best fit (unit 134) ----
Object.assign(window.__duo, {
  // Exact endpoints from the <line> beat a bounding box, which includes the
  // arrowhead and skews the slope. Calibrate from the grid lines themselves.
  bestFit() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument;
    const gl = [...d.querySelectorAll('line')].filter(e => /grid/.test(String(e.getAttribute('class'))));
    const vx = [...new Set(gl.filter(e => +e.getAttribute('x1') === +e.getAttribute('x2'))
      .map(e => +e.getAttribute('x1')))].sort((a, b) => a - b);
    const hy = [...new Set(gl.filter(e => +e.getAttribute('y1') === +e.getAttribute('y2'))
      .map(e => +e.getAttribute('y1')))].sort((a, b) => a - b);
    if (vx.length < 2 || hy.length < 2) return null;
    const ux = (vx[vx.length - 1] - vx[0]) / (vx.length - 1);
    const uy = (hy[hy.length - 1] - hy[0]) / (hy.length - 1);
    const x0 = vx[0], y0 = hy[hy.length - 1];
    const fit = [...d.querySelectorAll('line')].filter(e => !/grid/.test(String(e.getAttribute('class'))))
      .map(e => ({ x1: +e.getAttribute('x1'), y1: +e.getAttribute('y1'),
                   x2: +e.getAttribute('x2'), y2: +e.getAttribute('y2') }))
      .filter(o => Math.abs(o.x1 - o.x2) > 5 && Math.abs(o.y1 - o.y2) > 5)[0];
    if (!fit) return null;
    const G = (px, py) => [(px - x0) / ux, (y0 - py) / uy];
    const p1 = G(fit.x1, fit.y1), p2 = G(fit.x2, fit.y2);
    const m = (p2[1] - p1[1]) / (p2[0] - p1[0]);
    return { m: +m.toFixed(3), b: +(p1[1] - m * p1[0]).toFixed(3),
             p1: p1.map(v => +v.toFixed(2)), p2: p2.map(v => +v.toFixed(2)) };
  },

  solveFit() {
    const bf = this.bestFit(); if (!bf) return null;
    const L = this.tex();
    const v = /slope/i.test(L) ? bf.m : (/intercept/i.test(L) ? bf.b : null);
    if (v === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(v));
    return i < 0 ? { miss: v } : { i, want: v };
  },

  // rise = change in Y, run = change in X (getting these backwards cost an answer)
  solveRiseRun() {
    const L = this.tex().replace(/\s/g, '');
    const pts = [...L.matchAll(/\((-?\d+),(-?\d+)\)/g)].map(m => [+m[1], +m[2]]);
    if (pts.length < 2) return null;
    const [p, q] = pts.slice(-2);
    const run = /run/i.test(L); if (!run && !/rise/i.test(L)) return null;
    const a = run ? q[0] : q[1], b = run ? p[0] : p[1];
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const norm = e => this.norm(this.ascii(e.innerText)).replace(/\s/g, '').replace(/−/g, '-');
    let i = c.findIndex(e => norm(e) === a + '-' + b + '=' + (a - b));
    if (i < 0) i = c.findIndex(e => { const m = norm(e).match(/^(-?\d+)-(-?\d+)=(-?\d+)$/);
      return m && +m[1] === a && +m[2] === b; });
    return i < 0 ? { miss: a + '-' + b } : { i, want: a - b };
  },
});



window.__duo.RULES.splice(2, 0,
  ['solveRiseRun', /\b(rise|run)\b/i],
  ['solveFit', /intercept|slope/i]);

;'__duo ready';
