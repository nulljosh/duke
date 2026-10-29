
// "Select the line with the greater/lesser rate of change": each choice carries its
// own inline SVG, so measure the slope inside each choice rather than in a frame.
Object.assign(window.__duo, {
  slopeIn(root) {
    const p = [...root.querySelectorAll('path,line,polyline')].find(e => {
      const c = String(e.getAttribute('class') || '');
      if (/axis|grid/.test(c)) return false;
      const r = e.getBoundingClientRect();
      return r.width > 8 || r.height > 8;
    });
    if (!p) return null;
    let x1, y1, x2, y2;
    if (p.tagName.toLowerCase() === 'line') {
      x1 = +p.getAttribute('x1'); y1 = +p.getAttribute('y1');
      x2 = +p.getAttribute('x2'); y2 = +p.getAttribute('y2');
    } else {
      const n = String(p.getAttribute('d') || p.getAttribute('points') || '').match(/-?\d+(?:\.\d+)?/g);
      if (!n || n.length < 4) return null;
      x1 = +n[0]; y1 = +n[1]; x2 = +n[n.length - 2]; y2 = +n[n.length - 1];
    }
    if (![x1, y1, x2, y2].every(isFinite)) return null;
    const dx = x2 - x1, dy = -(y2 - y1);
    if (Math.abs(dx) < 1) return null;
    return dy / dx;
  },

  solveCompareSlope() {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    const greater = /greater|greatest|steeper|largest|fastest/.test(A);
    const lesser = /lesser|least|smallest|slowest|shallower/.test(A);
    if (!greater && !lesser) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const sl = ch.map(e => this.slopeIn(e));
    if (sl.some(s => s === null) || sl.length < 2) return null;
    let best = 0;
    for (let i = 1; i < sl.length; i++) if (greater ? sl[i] > sl[best] : sl[i] < sl[best]) best = i;
    return { i: best, want: sl.map(s => +s.toFixed(2)).join(',') };
  },
});
window.__duo.RULES.splice(2, 0, ['solveCompareSlope', /rate of change|steeper|slope/i]);
;'__duo ready';

// These inline SVGs report a 0x0 client rect for every path, so a size filter
// discards them all. Choose by geometry instead: the axes are axis-aligned, so the
// data line is the path with both a horizontal and a vertical extent.
window.__duo.slopeIn = function (root) {
  const ends = p => {
    if (p.tagName.toLowerCase() === 'line') {
      return [+p.getAttribute('x1'), +p.getAttribute('y1'), +p.getAttribute('x2'), +p.getAttribute('y2')];
    }
    const n = String(p.getAttribute('d') || p.getAttribute('points') || '').match(/-?\d+(?:\.\d+)?/g);
    if (!n || n.length < 4) return null;
    return [+n[0], +n[1], +n[n.length - 2], +n[n.length - 1]];
  };
  const cands = [];
  for (const p of root.querySelectorAll('path,line,polyline')) {
    const c = String(p.getAttribute('class') || '');
    if (/axis|grid/.test(c)) continue;
    const e = ends(p); if (!e || !e.every(isFinite)) continue;
    const dx = e[2] - e[0], dy = -(e[3] - e[1]);
    cands.push({ dx, dy });
  }
  const line = cands.find(c => Math.abs(c.dx) >= 1 && Math.abs(c.dy) >= 1)
    || cands.find(c => Math.abs(c.dx) >= 1);
  if (!line || Math.abs(line.dx) < 1) return null;
  return line.dy / line.dx;
};
;'__duo ready';

// The comparison can also be between EQUATIONS rather than drawn lines. (The paths
// found inside a choice are UI icons with no `d` at all — never assume a choice
// containing <path> holds a graph.)
window.__duo.slopeOfFormula = function (s) {
  const t = this.ascii(s).replace(/mathbf|textbf|text|\s/g, '');
  let m = t.match(/=\s*-?\\?frac\{(-?\d+)\}\{(-?\d+)\}\s*x/);
  if (m) { const v = +m[1] / +m[2]; return /=-/.test(t) ? -v : v; }
  m = t.match(/=\s*(-?\d*\.?\d*)x/);
  if (m) { if (m[1] === '' ) return 1; if (m[1] === '-') return -1; return parseFloat(m[1]); }
  return null;
};
(function () {
  const base = window.__duo.solveCompareSlope;
  window.__duo.solveCompareSlope = function () {
    const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
    const greater = /greater|greatest|steeper|largest|fastest/.test(A);
    const lesser = /lesser|least|smallest|slowest|shallower/.test(A);
    if (greater || lesser) {
      const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      if (ann.length === ch.length && ch.length >= 2) {
        const sl = ann.map(s => this.slopeOfFormula(s));
        if (sl.every(v => v !== null)) {
          let best = 0;
          for (let i = 1; i < sl.length; i++) if (greater ? sl[i] > sl[best] : sl[i] < sl[best]) best = i;
          return { i: best, want: sl.join(',') };
        }
      }
    }
    return base.call(this);
  };
})();
;'__duo ready';

// ---- 2D coordinate grid ----
// Reused by the "change in x / change in y" questions. Axis labels split into a
// horizontal row (the x axis) and a vertical column (the y axis); an empty tspan
// still coerces to 0, so drop blanks before clustering.
Object.assign(window.__duo, {
  grid2D() {
    // guided lessons STACK one iframe per step; the live one is the last with
    // content, so scan in reverse or a solved step's graph answers the new question
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
      const d = f.contentDocument, fr = f.getBoundingClientRect();
      const labs = [...d.querySelectorAll('text,tspan')].map(e => {
        const t = e.textContent.trim(); if (!t) return null;
        const v = parseFloat(this.ascii(t)); if (isNaN(v)) return null;
        const r = e.getBoundingClientRect(); if (!r.width) return null;
        return { v, x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 };
      }).filter(Boolean);
      if (labs.length < 4) continue;

      const byRow = {}, byCol = {};
      labs.forEach(o => {
        const rk = Math.round(o.y / 8) * 8, ck = Math.round(o.x / 8) * 8;
        (byRow[rk] = byRow[rk] || []).push(o); (byCol[ck] = byCol[ck] || []).push(o);
      });
      const row = Object.values(byRow).sort((a, b) => b.length - a.length)[0];
      const col = Object.values(byCol).sort((a, b) => b.length - a.length)[0];
      if (!row || !col || row.length < 3 || col.length < 3) continue;

      const fit = (arr, key) => {
        const s = arr.slice().sort((a, b) => a.v - b.v), lo = s[0], hi = s[s.length - 1];
        const u = (hi[key] - lo[key]) / (hi.v - lo.v);
        return isFinite(u) && u ? { zero: lo[key] - lo.v * u, u } : null;
      };
      const X = fit(row, 'x'), Y = fit(col, 'y');
      if (!X || !Y) continue;
      return {
        f,
        toXY: (px, py) => [ (px - X.zero) / X.u, (py - Y.zero) / Y.u ],
        ux: X.u, uy: Y.u, x0: X.zero, y0: Y.zero,
      };
    }
    return null;
  },

  // plotted points in grid coordinates, left to right
  gridPoints() {
    const g = this.grid2D(); if (!g) return null;
    const fr = g.f.getBoundingClientRect();
    const pts = [...g.f.contentDocument.querySelectorAll('g.point')].map(p => {
      const c = String(p.getAttribute('class') || ''); if (/hidden/.test(c)) return null;
      const r = p.getBoundingClientRect();
      const [x, y] = g.toXY(fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2);
      return [Math.round(x * 2) / 2, Math.round(y * 2) / 2];
    }).filter(Boolean).sort((a, b) => a[0] - b[0]);
    return pts.length >= 2 ? pts : null;
  },

  solveDelta() {
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const wantX = /change in\s*x/i.test(A), wantY = /change in\s*y/i.test(A);
    if (!wantX && !wantY) return null;
    const p = this.gridPoints(); if (!p) return null;
    const a = p[0], b = p[p.length - 1];
    const want = wantX ? b[0] - a[0] : b[1] - a[1];
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
      .map(e => parseFloat(this.clean(e.innerText)));
    const i = ch.findIndex(v => v === want);
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solveDelta', /change in .*from left to right|select the change in/i]);
;'__duo ready';

// "Select the rate of change": slope from the two plotted points, matched against
// choices that may be a fraction, a decimal, or an integer.
window.__duo.solveRateValue = function () {
  const p = this.gridPoints(); if (!p) return null;
  const a = p[0], b = p[p.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (!dx) return null;
  const want = dy / dx;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const val = s => {
    const t = this.ascii(s).replace(/mathbf|textbf|text|\s/g, '');
    const m = t.match(/(-?)\\?frac\{(-?\d+)\}\{(-?\d+)\}/);
    if (m) return (m[1] === '-' ? -1 : 1) * (+m[2] / +m[3]);
    const v = parseFloat(t.replace(/[^-\d.]/g, ''));
    return isNaN(v) ? null : v;
  };
  const hits = [];
  S.forEach((s, i) => { const v = val(s); if (v !== null && Math.abs(v - want) < 1e-9) hits.push(i); });
  return hits.length === 1 ? { i: hits[0], want } : (hits.length ? { i: hits[0], want } : { miss: want });
};
window.__duo.RULES.splice(2, 0, ['solveRateValue', /select the rate of change|what is the rate of change/i]);
;'__duo ready';

// ---- "Create a line with rate of change = m" ----
// Both endpoints are <g class="point draggable-point">, there is no slider, and the
// grid is bounded — so pick a lattice pair with the required slope that actually
// FITS the axes (slope 6 needs dx=1, e.g. (0,-3)->(1,3)), then drag each point and
// re-verify, because the widget moves relative to the grab point.
Object.assign(window.__duo, {
  targetSlope() {
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ');
    let m = A.match(/rate of change\s*,?\s*=\s*(-?\d+(?:\.\d+)?)/i);
    if (m) return parseFloat(m[1]);
    m = A.match(/rate of change of\s*(-?\d+(?:\.\d+)?)/i);
    return m ? parseFloat(m[1]) : null;
  },

  // axis extent, read from the labels
  gridRange() {
    const g = this.grid2D(); if (!g) return null;
    const fr = g.f.getBoundingClientRect();
    let lo = 0, hi = 0;
    for (const e of g.f.contentDocument.querySelectorAll('text,tspan')) {
      const t = e.textContent.trim(); if (!t) continue;
      const v = parseFloat(this.ascii(t)); if (isNaN(v)) continue;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return { lo, hi };
  },

  linePair(m) {
    const R = this.gridRange() || { lo: -5, hi: 5 };
    let best = null;
    for (let dx = 1; dx <= (R.hi - R.lo); dx++) {
      const dy = m * dx;
      if (Math.abs(dy - Math.round(dy)) > 1e-9) continue;
      for (let x1 = R.lo; x1 + dx <= R.hi; x1++) {
        for (let y1 = R.lo; y1 <= R.hi; y1++) {
          const y2 = y1 + dy;
          if (y2 < R.lo || y2 > R.hi) continue;
          const cost = Math.abs(x1) + Math.abs(y1) + Math.abs(x1 + dx) + Math.abs(y2);
          if (!best || cost < best.cost) best = { a: [x1, y1], b: [x1 + dx, y2], cost };
        }
      }
      if (best) break;
    }
    return best && [best.a, best.b];
  },

  async solveMakeLine() {
    const m = this.targetSlope(); if (m === null) return false;
    // gridPoints() may hand back widget components rather than [x,y] pairs
    const XY = list => (list || []).map(p => Array.isArray(p) ? p : [p.x, p.y]);
    const want = this.linePair(m); if (!want) return false;
    const g = this.grid2D(); if (!g) return false;
    const px = (x, y) => [Math.round(g.x0 + x * g.ux), Math.round(g.y0 + y * g.uy)];

    for (let pass = 0; pass < 5; pass++) {
      const cur = XY(this.gridPoints()); if (cur.length < 2) return false;
      const dxNow = cur[cur.length - 1][0] - cur[0][0];
      const dyNow = cur[cur.length - 1][1] - cur[0][1];
      if (dxNow && Math.abs(dyNow / dxNow - m) < 1e-9) return true;

      const fr = g.f.getBoundingClientRect();
      const els = [...g.f.contentDocument.querySelectorAll('g.point')]
        .filter(p => /draggable/.test(String(p.getAttribute('class') || '')))
        .map(p => {
          const r = p.getBoundingClientRect();
          const cx = fr.left + r.left + r.width / 2, cy = fr.top + r.top + r.height / 2;
          const [x, y] = g.toXY(cx, cy);
          return { el: p, cx, cy, x: Math.round(x), y: Math.round(y) };
        }).sort((a, b) => a.x - b.x);
      if (els.length < 2) return false;

      let moved = false;
      for (let i = 0; i < 2; i++) {
        const t = px(want[i][0], want[i][1]);
        if (Math.abs(t[0] - els[i].cx) < 3 && Math.abs(t[1] - els[i].cy) < 3) continue;
        await this.dragXY(els[i].el, g.f, [Math.round(els[i].cx), Math.round(els[i].cy)], t);
        moved = true; break;             // re-read after every single move
      }
      if (!moved) break;
    }
    const cur = XY(this.gridPoints());
    if (cur.length < 2) return false;
    const dx = cur[cur.length - 1][0] - cur[0][0], dy = cur[cur.length - 1][1] - cur[0][1];
    return !!dx && Math.abs(dy / dx - m) < 1e-9;
  },
});


(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('g.point.draggable-point,g.draggable-point'));
    if (f && this.targetSlope() !== null) return { kind: 'makeline', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// "Complete the pattern" over formulas: each row pairs f(x)=mx+b with a value.
// Confirm on a worked row what that value is (slope or intercept) before applying
// it to the query row — the two are indistinguishable from the query alone.
window.__duo.solveSlopePattern = function () {
  const L = this.promptLatex().map(s => this.ascii(s)
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, '').replace(/\s+/g, ''));
  const rows = [];
  for (let i = 0; i < L.length - 1; i++) {
    if (!/^[a-z]\(x\)=/.test(L[i])) continue;
    rows.push({ f: L[i], ans: L[i + 1] });
  }
  if (rows.length < 2) return null;
  const intercept = s => { const m = s.match(/x([+-]\d+)$/); return m ? +m[1] : null; };
  const ex = rows.find(r => /^-?\d+$/.test(r.ans));
  const q = rows.find(r => r.ans === '?' || r.ans === '');
  if (!ex || !q) return null;
  const v = +ex.ans;
  let want = null;
  if (this.slopeOfFormula(ex.f) === v) want = this.slopeOfFormula(q.f);
  else if (intercept(ex.f) === v) want = intercept(q.f);
  if (want === null || want === undefined) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
    .map(e => parseFloat(this.clean(e.innerText)));
  const i = ch.findIndex(x => x === want);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveSlopePattern', /complete the pattern/i]);
;'__duo ready';

// "Match the pairs": formula <-> its slope, where a slope can be a fraction token


// the rate of change can be asked from a formula with no graph present at all


// pts() was part of the bootstrap that never lived in this file (like ascii/tap).
// Older solvers call it as [[label, [x, y]], ...].
if (typeof window.__duo.pts !== 'function') window.__duo.pts = function () {
  const g = this.grid2D(); if (!g) return null;
  const fr = g.f.getBoundingClientRect();
  const out = [...g.f.contentDocument.querySelectorAll('g.point')].map(p => {
    const c = String(p.getAttribute('class') || ''); if (/hidden/.test(c)) return null;
    const r = p.getBoundingClientRect();
    const [x, y] = g.toXY(fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2);
    const lab = (p.textContent || '').trim();
    return [lab, [Math.round(x * 2) / 2, Math.round(y * 2) / 2]];
  }).filter(Boolean);
  return out.length ? out : null;
};

// one missing helper deep in the chain should not kill the whole lesson
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    try { return base.call(this); } catch (e) { return null; }
  };
})();
;'__duo ready';

// A fraction token arrives as \mathbf{-\frac{2}{3}}, so an ANCHORED ^\\?frac match
// fails and the digit-only fallback reads it as -23. Search for the fraction
// anywhere, and only fall back to a plain number when there is no frac at all.
window.__duo.numTok = function (s) {
  const t = this.ascii(s).replace(/mathbf|textbf|text|\s/g, '');
  const m = t.match(/(-?)\\?frac\{(-?\d+)\}\{(-?\d+)\}/);
  if (m) {
    // the sign can sit outside the \frac, as in "{-\frac{2}{3}}"
    const neg = m[1] === '-' || /[-]\\?frac/.test(t);
    return (neg ? -1 : 1) * Math.abs(+m[2] / +m[3]);
  }
  if (/[a-z]\(/.test(t)) return null;            // a formula, not a value
  const v = parseFloat(t.replace(/[^-\d.]/g, ''));
  return isNaN(v) ? null : v;
};
window.__duo.slopePairs = async function () {
  const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
  if (tk.length < 4) return null;
  const txt = tk.map(e => { const a = e.querySelector('annotation'); return a ? a.textContent : this.ascii(e.innerText); });
  const slope = txt.map(s => /\(x\)\s*=/.test(this.ascii(s)) ? this.slopeOfFormula(s) : null);
  const val = txt.map((s, i) => slope[i] === null ? this.numTok(s) : null);
  const used = new Set(); let n = 0;
  for (let i = 0; i < tk.length; i++) {
    if (used.has(i) || slope[i] === null) continue;
    const j = val.findIndex((v, k) => k !== i && !used.has(k) && v !== null && Math.abs(v - slope[i]) < 1e-9);
    if (j < 0) continue;
    used.add(i); used.add(j); n++;
    this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
  }
  return n ? { pairs: n } : null;
};
;'__duo ready';
