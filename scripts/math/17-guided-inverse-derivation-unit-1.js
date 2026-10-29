
// The rendered curve is CLIPPED to the plot box, so its endpoints say nothing about
// the function's real bounds — a line from (-5,0) to (4,3) still has range
// (-inf, inf). Decide from the shape: a straight line with nonzero slope is
// unbounded in both; a horizontal line has a single-value range.
window.__duo.solveDomainRange = function () {
  const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').toLowerCase();
  const wantDomain = /domain/.test(A), wantRange = /range/.test(A);
  if (!wantDomain && !wantRange) return null;
  const c = this.curvePath(); if (!c) return null;

  const M = c.at(0.5);
  const dx = c.B[0] - c.A[0], dy = c.B[1] - c.A[1];
  if (!dx) return null;
  const slope = dy / dx;
  const straight = Math.abs((c.A[1] + slope * (M[0] - c.A[0])) - M[1]) < 0.15;
  if (!straight) return null;                       // curves need their own rule

  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\s/g, ''));

  if (wantDomain || Math.abs(slope) > 1e-9) {
    const i = S.findIndex(s => (s.match(/infty/g) || []).length >= 2);
    return i < 0 ? { miss: 'allreals' } : { i, want: 'allreals' };
  }
  // horizontal line: the range is the single y value
  const y = Math.round(c.A[1] * 2) / 2;
  const i = S.findIndex(s => { const v = this.numTok(s); return v !== null && Math.abs(v - y) < 1e-9; });
  return i < 0 ? { miss: y } : { i, want: y };
};
;'__duo ready';

// Curves: sample the path and use its SHAPE, since the drawing is clipped.
// x non-monotonic  -> sideways (opens left/right): range all reals, domain bounded
//                     at the vertex
// y non-monotonic  -> a U: domain all reals, range bounded at the vertex
// both monotonic   -> a half-curve (sqrt): both bounded at the endpoint that lies
//                     inside the plot


// "domain of the INVERSE" is the range of the original, and vice versa: answer by
// flipping which axis the existing solver is asked about.


// Distinguishing a real endpoint from a CLIPPED one needs the plot's own bounds,
// which are not the label extremes — the drawing area runs past the last label.
// Convert the diagram svg's box into grid coordinates instead.
window.__duo.plotBounds = function () {
  const g = this.grid2D(); if (!g) return null;
  const svg = g.f.contentDocument.querySelector('svg.math-diagram, svg');
  if (!svg) return null;
  const fr = g.f.getBoundingClientRect(), r = svg.getBoundingClientRect();
  const a = g.toXY(fr.left + r.left, fr.top + r.top);
  const b = g.toXY(fr.left + r.right, fr.top + r.bottom);
  return { xlo: Math.min(a[0], b[0]), xhi: Math.max(a[0], b[0]), ylo: Math.min(a[1], b[1]), yhi: Math.max(a[1], b[1]) };
};
(function () {
  const base = window.__duo.solveDomainRange;
  window.__duo.solveDomainRange = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').toLowerCase();
    if (!/domain|range/.test(A)) return r;
    const c = this.curvePath(); if (!c) return r;
    const B = this.plotBounds(); if (!B) return r;
    // a monotonic curve that leaves the plot on both sides is unbounded there
    // 0.5, not 0.3: the plot runs ~0.36 past the last label, so a curve clipped at
    // the edge reads as 0.36 short of the bound
    const off = (p, k) => k === 0 ? (p[0] <= B.xlo + 0.5 || p[0] >= B.xhi - 0.5)
                                  : (p[1] <= B.ylo + 0.5 || p[1] >= B.yhi - 0.5);
    let k = /domain/.test(A) ? 0 : 1;
    if (/inverse/.test(A)) k = 1 - k;
    if (!off(c.A, k) || !off(c.B, k)) return r;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
      .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|left|right|[{}]|\s/g, ''));
    const i = S.findIndex(s => /^\(-infty,infty\)$/.test(s));
    return i < 0 ? r : { i, want: 'allreals' };
  };
})();
;'__duo ready';

// Last resort: when no rule fires on a choice screen the loop presses CHECK with
// nothing selected, gets no verdict ("noblame") and spins until the info-loop guard
// trips — the lesson never advances. Guessing is strictly better: a wrong answer is
// graded, the question is replaced, and run2's 2-wrong halt still bounds the damage.


// ---- guided inverse derivation (unit 143 L3) ----
// Steps: "swap the x and y variables" -> pick x = f(y); then solve for y.
window.__duo.solveInverseStep = function () {
  const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  const live = L[L.length - 1] || '';
  const A = L.join(' ').toLowerCase();
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));

  // the instruction is the last TEXT line, so read it from the raw prompt
  const instr = this.prompt();
  if (/swap/.test(instr)) {
    // want "x = ...y...", i.e. the equation with x alone on the left
    const i = S.findIndex(s => /^x=/.test(s) && /y/.test(s));
    return i < 0 ? { miss: 'swap' } : { i };
  }
  if (/solve for y|isolate y/.test(instr)) {
    // find the swapped equation x = m*y + b, then y = (x - b)/m
    let eq = null;
    for (let i = L.length - 1; i >= 0; i--) if (/^x=/.test(L[i])) { eq = L[i]; break; }
    if (!eq) return null;
    const ab = this.formulaAB('y=' + eq.slice(2));      // reuse the linear parser on the RHS
    if (!ab || !ab.m) return null;
    const i = S.findIndex(s => {
      const m2 = s.match(/^y=(.+)$/); if (!m2) return false;
      const t = this.linear(m2[1], 'x');
      return t && Math.abs(t.a - 1 / ab.m) < 1e-9 && Math.abs(t.b - (-ab.b / ab.m)) < 1e-9;
    });
    return i < 0 ? { miss: 'solve' } : { i };
  }
  return null;
};
window.__duo.RULES.splice(2, 0, ['solveInverseStep', /swap|solve for y|isolate y/i]);
;'__duo ready';

// "Find the inverse operation" for the term shown: 3y -> divide by 3, y+4 ->
// subtract 4, y/2 -> multiply by 2.
window.__duo.solveInverseOp = function () {
  const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  let term = null;
  for (let i = L.length - 1; i >= 0; i--) if (/^[-+]?\d*\/?[a-z]|^frac/.test(L[i]) && !/=/.test(L[i])) { term = L[i]; break; }
  if (!term) return null;
  let want = null, n = null;
  let m = term.match(/^frac([a-z])(\d+)$/) || term.match(/^([a-z])\/(\d+)$/);
  if (m) { want = 'multiply'; n = m[2]; }
  if (!want) { m = term.match(/^(\d+)[a-z]$/); if (m) { want = 'divide'; n = m[1]; } }
  if (!want) { m = term.match(/^[a-z]\+(\d+)$/); if (m) { want = 'subtract'; n = m[1]; } }
  if (!want) { m = term.match(/^[a-z]-(\d+)$/); if (m) { want = 'add'; n = m[1]; } }
  if (!want) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText).toLowerCase());
  const i = S.findIndex(s => s.includes(want) && s.includes(String(n)));
  return i < 0 ? { miss: want + ' ' + n } : { i, want: want + ' ' + n };
};
window.__duo.RULES.splice(2, 0, ['solveInverseOp', /inverse operation/i]);
;'__duo ready';

// The final step of the inverse derivation: from "a*y = x + b" divide through to get
// f^-1(x) = (1/a)x + b/a. Compare the choices numerically so 1/3 and \frac{1}{3}
// both match.
window.__duo.solveInverseResult = function () {
  const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  let eq = null;
  for (let i = L.length - 1; i >= 0; i--) {
    const m = L[i].match(/^(-?\d*)y=(.+)$/);
    if (m) { eq = { a: m[1] === '' ? 1 : (m[1] === '-' ? -1 : +m[1]), rhs: m[2] }; break; }
  }
  if (!eq || !eq.a) return null;
  const t = this.linear(eq.rhs, 'x'); if (!t) return null;
  const wm = t.a / eq.a, wb = t.b / eq.a;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const i = S.findIndex(s => {
    const ab = this.formulaAB(s);
    return ab && Math.abs(ab.m - wm) < 1e-9 && Math.abs(ab.b - wb) < 1e-9;
  });
  return i < 0 ? { miss: wm + 'x+' + wb } : { i, want: wm + 'x+' + wb };
};
window.__duo.RULES.splice(2, 0, ['solveInverseResult', /divide every term|multiply every term|f\^\{?-1/i]);
;'__duo ready';

// pairs of an equation and its variable-swapped inverse: y = -2x  <->  x = -2y
window.__duo.swapPairs = async function () {
  const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
  if (tk.length < 4) return null;
  const norm = tk.map(e => {
    const a = e.querySelector('annotation');
    return this.ascii(a ? a.textContent : e.innerText).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
  });
  const swap = s => s.replace(/x/g, '@').replace(/y/g, 'x').replace(/@/g, 'y');
  const done = e => /_2wryV/.test(String(e.className));
  const used = new Set(); let n = 0;
  for (let i = 0; i < tk.length; i++) {
    if (used.has(i) || done(tk[i])) continue;
    const want = swap(norm[i]);
    const j = norm.findIndex((s, k) => k !== i && !used.has(k) && !done(tk[k]) && s === want);
    if (j < 0) continue;
    used.add(i); used.add(j); n++;
    this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
  }
  return n ? { pairs: n } : null;
};

// Guard every pairs solver: taps that do not actually match bounce back, the solver
// still reports a count, and run2 replays the same screen forever ("p3,p3,p3...").
// Count solved tokens before and after; report null when nothing changed.


// "Complete the pattern" where the rule is a variable swap: y=4x^2 -> x=4y^2
window.__duo.solveSwapPattern = function () {
  const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  const swap = s => s.replace(/x/g, '@').replace(/y/g, 'x').replace(/@/g, 'y');
  // rows come in pairs; the query row's answer is "?" or blank
  const qi = L.findIndex(s => s === '?' || s === '');
  if (qi < 1) return null;
  // confirm the rule on another pair before trusting it
  let ok = false;
  for (let i = 0; i < L.length - 1; i++) {
    if (i === qi - 1) continue;
    if (L[i] && L[i + 1] && swap(L[i]) === L[i + 1]) { ok = true; break; }
  }
  if (!ok) return null;
  const want = swap(L[qi - 1]);
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
  const i = S.findIndex(s => s === want);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveSwapPattern', /complete the pattern/i]);
;'__duo ready';

// ---- "Select the inverse function" ----
// Rather than model how each inverse is written (fraction, root, nested), verify
// numerically: a choice g is the inverse of f when f(g(t)) == t on sample points.
Object.assign(window.__duo, {
  // LaTeX expression -> a JS function of x. The normaliser only strips LaTeX
  // syntax down to a plain algebraic string; mathjs (loaded by run.mjs as a
  // local bundle, scripts/mathjs.min.js — no network dependency) does the
  // actual parsing/evaluation, including implicit multiplication, sqrt, abs,
  // and pi, so none of that needs hand-rolling here any more.
  compile(src) {
    let t = this.ascii(src)
      // strip the COMMAND WITH ITS BACKSLASH: dropping just the word leaves "\{...}",
      // and the later "any backslash left means unsupported" check then bails
      .replace(/\\(mathbf|textbf|text)\s*/g, '')
      .replace(/\\left|\\right/g, '')
      // LaTeX spacing commands survive the whitespace strip and leave a backslash,
      // which the "unsupported command" check then rejects
      .replace(/\\[,;:!]/g, '')
      .replace(/[~\s]/g, '');
    // peel the wrapper braces the stripped commands leave behind
    for (let i = 0; i < 4; i++) {
      const m = t.match(/^\{(.*)\}$/);
      if (!m) break;
      t = m[1];
    }
    t = t.replace(/^[a-z]\(x\)=|^[a-z]\^\{?-1\}?\(x\)=|^y=/, '');
    t = t.replace(/\\cdot|\\times/g, '*').replace(/\\div/g, '/').replace(/\\pi/g, 'pi');
    // \frac{a}{b} and \sqrt{a}, innermost first
    for (let i = 0; i < 6; i++) {
      t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
           .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
           .replace(/\\sqrt(\d+)/g, 'sqrt($1)');
    }
    if (/\\/.test(t)) return null;                 // an unhandled command
    t = t.replace(/\^\{([^{}]*)\}/g, '^($1)');
    if (typeof math === 'undefined') return null;   // mathjs not loaded
    try {
      const node = math.parse(t), code = node.compile();
      const f = x => code.evaluate({ x });
      f(2); return f;
    } catch (e) { return null; }
  },

  solveInverseFunction() {
    const L = this.promptLatex();
    let f = null;
    for (let i = L.length - 1; i >= 0; i--) {
      if (!/\(x\)\s*=/.test(this.ascii(L[i])) || /-1/.test(this.ascii(L[i]))) continue;
      f = this.compile(L[i]); if (f) break;
    }
    if (!f) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const ts = [1, 4, 9, 16];
    const hits = [];
    S.forEach((s, i) => {
      const g = this.compile(s); if (!g) return;
      let good = 0, tried = 0;
      for (const t of ts) {
        const v = g(t); if (!isFinite(v)) continue;
        const back = f(v); if (!isFinite(back)) continue;
        tried++; if (Math.abs(back - t) < 1e-6) good++;
      }
      if (tried >= 2 && good === tried) hits.push(i);
    });
    return hits.length === 1 ? { i: hits[0] } : null;
  },
});
window.__duo.RULES.splice(2, 0, ['solveInverseFunction', /inverse function|inverse of/i]);
;'__duo ready';

// ---- piecewise functions (unit 144) ----
// Each piece is its own class="line" path; the breakpoint is where one ends and the
// next begins.
Object.assign(window.__duo, {
  pieces() {
    const g = this.grid2D(); if (!g) return null;
    const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
    const out = [...d.querySelectorAll('path,line,polyline')]
      .filter(e => String(e.getAttribute('class') || '').split(/\s+/).includes('line'))
      .map(p => {
        let L = 0; try { L = p.getTotalLength(); } catch (e) { return null; }
        const m = p.getScreenCTM(); if (!L || !m) return null;
        const at = t => {
          const q = p.getPointAtLength(t * L);
          return g.toXY(fr.left + m.a * q.x + m.c * q.y + m.e, fr.top + m.b * q.x + m.d * q.y + m.f);
        };
        const A = at(0), B = at(1);
        const lo = A[0] <= B[0] ? A : B, hi = A[0] <= B[0] ? B : A;
        const dx = hi[0] - lo[0];
        return { lo, hi, slope: dx ? (hi[1] - lo[1]) / dx : null };
      }).filter(Boolean).sort((a, b) => a.lo[0] - b.lo[0]);
    return out.length ? out : null;
  },

  breakpoint() {
    const P = this.pieces(); if (!P || P.length < 2) return null;
    // the junction: the right end of one piece meeting the left end of the next
    const x = (P[0].hi[0] + P[1].lo[0]) / 2;
    return Math.round(x * 2) / 2;
  },
});

// typed: "At what x-value does the function change?"


// more piecewise steps: the y-value of the horizontal piece, and each piece's slope


// evaluate the drawn piecewise function at an x, by picking the piece whose
// x-interval contains it
Object.assign(window.__duo, {
  pieceAt(x) {
    const P = this.pieces(); if (!P) return null;
    const p = P.find(q => x >= q.lo[0] - 0.01 && x <= q.hi[0] + 0.01) || null;
    if (!p || p.slope === null) return null;
    return p.lo[1] + p.slope * (x - p.lo[0]);
  },

  solvePiecewiseEval() {
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
      .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
    // choices look like "f(0)=2"; take the x from them when the prompt has none
    let x = null;
    let m = A.match(/f\((-?[\d.]+)\)/);
    if (m) x = parseFloat(m[1]);
    if (x === null) { for (const s of S) { const q = s.match(/f\((-?[\d.]+)\)/); if (q) { x = parseFloat(q[1]); break; } } }
    if (x === null) return null;
    const y = this.pieceAt(x); if (y === null) return null;
    const want = Math.round(y * 2) / 2;
    const i = S.findIndex(s => {
      const q = s.match(/f\((-?[\d.]+)\)=(-?[\d.]+)/);
      return q && parseFloat(q[1]) === x && Math.abs(parseFloat(q[2]) - want) < 1e-6;
    });
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solvePiecewiseEval', null]);
;'__duo ready';
