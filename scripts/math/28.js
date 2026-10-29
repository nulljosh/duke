
// Some questions put the data in a TABLE inside the diagram iframe rather than
// in the prompt LaTeX: "x f(x) 0 1 1 6 2 36 3 216". Read it as (x, y) pairs.
// "constant factor between outputs" / "common ratio" / "common difference"
window.__duo.solveTableStep = function () {
  const ins = this.curInstruction();
  const wantRatio = /ratio|factor|multipl/.test(ins);
  const wantDiff = /difference|add/.test(ins);
  if (!wantRatio && !wantDiff) return null;
  const P = this.tableXY(); if (!P) return null;
  const ys = P.map(p => p[1]);
  const want = wantRatio ? ys[1] / ys[0] : ys[1] - ys[0];
  if (!isFinite(want)) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => Math.abs(parseFloat(this.flatLine(this.choiceLatex(e))) - want) < 1e-9);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveTableStep', /constant factor|common (ratio|difference)/i]);
;'__duo ready';

// When no formula is printed, the value table is the function. Look the answer
// up directly, or extrapolate: constant ratio => exponential, constant
// difference => linear.


// The table uses a Unicode minus and marks the asked-for cell with "?", so a
// plain \d scan mis-paired the columns. Tokenize numbers and holes together.
window.__duo.tableXY = function () {
  const d = this.diagram(); if (!d) return null;
  const txt = d.f.contentDocument.body.innerText
    .replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
  const toks = txt.match(/-?\d+(?:\.\d+)?|\?/g) || [];
  if (toks.length < 4 || toks.length % 2) return null;
  const P = [];
  for (let i = 0; i < toks.length; i += 2) {
    if (toks[i] === '?') return null;               // unknown x is a different shape
    P.push([Number(toks[i]), toks[i + 1] === '?' ? null : Number(toks[i + 1])]);
  }
  const dx = P[1][0] - P[0][0];
  if (!dx || P.some((p, i) => i && Math.abs(p[0] - P[i - 1][0] - dx) > 1e-9)) return null;
  return P;
};
window.__duo.tableValueAt = function (x) {
  const P = this.tableXY(); if (!P) return null;
  const hit = P.find(p => Math.abs(p[0] - x) < 1e-9);
  if (hit && hit[1] !== null) return hit[1];
  const K = P.filter(p => p[1] !== null);           // ignore the hole when fitting
  if (K.length < 2) return null;
  const rs = [], ds = [];
  for (let i = 1; i < K.length; i++) {
    const n = (K[i][0] - K[i - 1][0]);
    if (K[i - 1][1]) rs.push(Math.pow(K[i][1] / K[i - 1][1], 1 / n));
    ds.push((K[i][1] - K[i - 1][1]) / n);
  }
  const same = a => a.length && a.every(v => Math.abs(v - a[0]) < 1e-9);
  if (same(rs)) return K[0][1] * Math.pow(rs[0], x - K[0][0]);
  if (same(ds)) return K[0][1] + ds[0] * (x - K[0][0]);
  return null;
};
;'__duo ready';

// A value table with a "?" cell made plan() return tablefill even when the
// screen is really multiple choice ("select the value when x = 0"), so the
// choice rules never ran. Multiple choice always wins.
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this);
    if (p && p.kind === 'tablefill' &&
        document.querySelector('[data-test="challenge-choice"]')) return null;
    return p;
  };
})();
;'__duo ready';

// choices are sometimes full equations ("f(0) = 1"), so compare the RHS
(function () {
  const base = window.__duo.solveCurveKind;
  window.__duo.solveCurveKind = function () {
    const r = base.call(this); if (r) return r;
    const o = this.solveOutputAt(); if (o === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - o) < 1e-9; });
    return i < 0 ? null : { i };
  };
})();
;'__duo ready';

// Horizontal asymptote: the limit the function settles on at one end. Take it
// from the formula when there is one, otherwise from the flat tail of the
// drawn curve.
window.__duo.asymptoteY = function () {
  const F = this.formulaIn('x');
  if (F && F.f) {
    for (const xs of [[-40, -30, -20], [40, 30, 20]]) {
      try {
        const v = xs.map(x => F.f(x));
        if (v.every(isFinite) && Math.abs(v[0] - v[1]) < 1e-6 && Math.abs(v[1] - v[2]) < 1e-6)
          return Math.round(v[0] * 1e6) / 1e6;
      } catch (e) {}
    }
    return null;
  }
  const c = this.curvePath(); if (!c) return null;
  for (const ts of [[0, 0.05, 0.1], [1, 0.95, 0.9]]) {
    const v = ts.map(t => c.at(t)[1]);
    if (v.every(isFinite) && Math.abs(v[0] - v[1]) < 0.12 && Math.abs(v[1] - v[2]) < 0.12)
      return Math.round(v[0]);
  }
  return null;
};
window.__duo.solveAsymptote = function () {
  if (!/asymptote/.test(this.curInstruction())) return null;
  const y = this.asymptoteY(); if (y === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - y) < 0.2; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveAsymptote', /asymptote/i]);
;'__duo ready';

// "Graph the function f(x) = 8^x": one draggable point pinned to a single x by
// its constraints. Drag it to (x, f(x)).
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveGraphPoint()) return true;
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// y at a given x, from whichever representation the screen provides.
window.__duo.valueAtX = function (x) {
  const F = this.formulaIn('x');
  if (F && F.f) { try { const v = F.f(x); if (isFinite(v)) return v; } catch (e) {} }
  const t = this.tableValueAt(x); if (t !== null && t !== undefined) return t;
  const c = this.curvePath(); if (!c) return null;
  let best = null, bd = Infinity;
  for (let i = 0; i <= 400; i++) {
    const p = c.at(i / 400);
    const dd = Math.abs(p[0] - x);
    if (dd < bd) { bd = dd; best = p[1]; }
  }
  return bd < 0.25 ? Math.round(best * 100) / 100 : null;
};
window.__duo.solveIntercept = function () {
  const ins = this.curInstruction();
  if (!/y-?intercept/.test(ins)) return null;
  const y = this.valueAtX(0); if (y === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - y) < 0.2; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveIntercept', /y-?intercept/i]);
;'__duo ready';

// the LaTeX strip leaves "y -intercept" with a space, so /y-?intercept/ missed
(function () {
  const RE = /y\s*-?\s*intercept/i;
  const base = window.__duo.solveIntercept;
  window.__duo.solveIntercept = function () {
    if (!RE.test(this.curInstruction())) return null;
    const y = this.valueAtX(0); if (y === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - y) < 0.2; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveIntercept', RE]);
})();
;'__duo ready';

// grid.gridToPixel takes ONE argument, the [x, y] pair, and returns [px, py].
// Calling it as (x, y) threw "Invalid attempt to destructure non-iterable".
;'__duo ready';

// The point's LIVE position is p.x / p.y (options keeps the initial values), and
// the drag must start from the element's real rect — starting from the
// grid-computed position overshoots and the point clamps to its constraint.
window.__duo.dragPointTo = async function (pt, gx, gy) {
  const d = this.diagram(), g = d.M.grid;
  const fr = d.f.getBoundingClientRect();
  const ctm = pt.element.ownerSVGElement.getScreenCTM();
  const at = (x, y) => { const [px, py] = g.gridToPixel([x, y]);
    return [Math.round(fr.left + px + ctm.e), Math.round(fr.top + py + ctm.f)]; };
  const el = pt.element.querySelector('circle') || pt.element;
  const r = el.getBoundingClientRect();
  const from = [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
  await this.dragXY(pt.element, d.f, from, at(gx, gy));
  await this.sleep(320);
};
window.__duo.solveGraphPoint = async function () {
  const F = this.formulaIn('x'); if (!F || !F.f) return false;
  const pts = this.gridPoints(); if (pts.length !== 1) return false;
  const p = pts[0], c = p.options.constraints;
  const x = c && c.xMin === c.xMax ? c.xMin : p.x;
  let y; try { y = F.f(x); } catch (e) { return false; }
  if (!isFinite(y)) return false;
  if (c && (y < c.yMin || y > c.yMax)) return false;
  if (Math.abs(p.y - y) < 1e-9) return true;
  await this.dragPointTo(p, x, y);
  return Math.abs(this.gridPoints()[0].y - y) < 1e-9;
};
;'__duo ready';

// A plain graph's axis tick labels ("-5 -4 -3 ... 1 2 3") parse as number pairs,
// so tableXY happily invented a table out of a picture. Require the x / f(x)
// header row that a real value table always has.


// "Select the match": choices are candidate functions; keep the one that agrees
// with the drawn curve at several sample x values.
window.__duo.solveMatchCurve = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const c = this.curvePath(); if (!c) return null;
  const S = []; for (let i = 1; i < 10; i++) S.push(c.at(i / 10));
  const ok = [];
  ch.forEach((e, i) => {
    const g = this.compile(this.flatLine(this.choiceLatex(e)).split('=').pop());
    if (!g) return;
    let bad = 0;
    for (const [x, y] of S) { try { if (Math.abs(g(x) - y) > 0.25) bad++; } catch (err) { bad++; } }
    if (!bad) ok.push(i);
  });
  return ok.length === 1 ? { i: ok[0] } : null;
};
window.__duo.RULES.unshift(['solveMatchCurve', /select the match/i]);
;'__duo ready';

// \b after "f(x)" never matches (")" then space are both non-word), so the
// header guard rejected every real table.
(function () {
  const base = window.__duo.tableXY;
  window.__duo.tableXY = function () {
    const d = this.diagram(); if (!d) return null;
    const head = d.f.contentDocument.body.innerText.replace(/\s+/g, ' ').slice(0, 24)
      .normalize('NFKC').toLowerCase();
    if (!/^x\s*(f\(x\)|y)/.test(head)) return null;
    return base.call(this);
  };
})();

// "First, find the initial value when x = 0" — same lookup, different wording.


// standalone (the earlier guard wrappers stacked and the innermost one still
// rejected every table) — define tableXY outright, no wrapping
window.__duo.tableXY = function () {
  const d = this.diagram(); if (!d) return null;
  const txt = d.f.contentDocument.body.innerText
    .replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
  const head = txt.slice(0, 24).normalize('NFKC').toLowerCase();
  if (!/^x\s*(f\(x\)|y)/.test(head)) return null;   // axis ticks are not a table
  const toks = txt.match(/-?\d+(?:\.\d+)?|\?/g) || [];
  if (toks.length < 4 || toks.length % 2) return null;
  const P = [];
  for (let i = 0; i < toks.length; i += 2) {
    if (toks[i] === '?') return null;
    P.push([Number(toks[i]), toks[i + 1] === '?' ? null : Number(toks[i + 1])]);
  }
  const dx = P[1][0] - P[0][0];
  if (!dx || P.some((p, i) => i && Math.abs(p[0] - P[i - 1][0] - dx) > 1e-9)) return null;
  return P;
};
;'__duo ready';

// exponential fit from the value table: y = a * r^x
window.__duo.fitTable = function () {
  const P = (this.tableXY() || []).filter(p => p[1] !== null);
  if (P.length < 2) return null;
  const r = Math.pow(P[1][1] / P[0][1], 1 / (P[1][0] - P[0][0]));
  if (!isFinite(r) || r <= 0) return null;
  const a = P[0][1] / Math.pow(r, P[0][0]);
  for (const [x, y] of P) if (Math.abs(a * Math.pow(r, x) - y) > 1e-6 * Math.max(1, Math.abs(y))) return null;
  return { a, r };
};

// "Write the exponential equation" — score each candidate against the table.
window.__duo.solveEquationChoice = function () {
  const P = (this.tableXY() || []).filter(p => p[1] !== null);
  if (P.length < 2) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const ok = [];
  ch.forEach((e, i) => {
    const g = this.compile(this.flatLine(this.choiceLatex(e)).split('=').pop().replace(/cdot/g, '*'));
    if (!g) return;
    let bad = 0;
    for (const [x, y] of P) { try { if (Math.abs(g(x) - y) > 1e-6 * Math.max(1, Math.abs(y))) bad++; } catch (err) { bad++; } }
    if (!bad) ok.push(i);
  });
  return ok.length === 1 ? { i: ok[0] } : null;
};
window.__duo.RULES.unshift(['solveEquationChoice', /equation|formula/i]);
;'__duo ready';

// "Create f(0) = 1" with f(x) = <slider> * 2^x: try each slider value in the
// displayed formula and keep the one that satisfies the requested output.
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveSliderTarget()) return true;
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// flatLine strips the braces, so \duodisplay{-2}{2} became the ambiguous
// "duodisplay-22". Work from the raw LaTeX where the two arguments are delimited.
window.__duo.solveSliderTarget = async function () {
  const S = this.slider2d(); if (!S) return false;
  let want = null, at = null;
  for (const t of this.promptLatex().map(l => this.flatLine(l))) {
    const m = t.match(/f\((-?[\d.]+)\)=(-?[\d.]+)$/);
    if (m) { at = parseFloat(m[1]); want = parseFloat(m[2]); }
  }
  if (want === null) return false;
  const raw = this.promptLatex().find(l => /duodisplay/.test(this.ascii(l)));
  if (!raw) return false;
  for (let k = S.s.min; k <= S.s.max; k += S.s.step) {
    const body = this.ascii(raw)
      .replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/g, '(' + k + ')')
      .replace(/\\mathbf|\\textbf|\\text|\\cdot/g, m => m === '\\cdot' ? '*' : '')
      .replace(/[{}\s]/g, '')
      .split('=').pop();
    const g = this.compile(body);
    if (!g) continue;
    let v; try { v = g(at); } catch (e) { continue; }
    if (isFinite(v) && Math.abs(v - want) < 1e-9) return await this.setSlider2d(k);
  }
  return false;
};
;'__duo ready';

// intercepts are sometimes offered as points, not bare values: (0, 2)
window.__duo.choicePair = function (el) {
  const m = this.flatLine(this.choiceLatex(el)).match(/\((-?[\d.]+),(-?[\d.]+)\)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};
(function () {
  const RE = /y\s*-?\s*intercept/i;
  window.__duo.solveIntercept = function () {
    if (!RE.test(this.curInstruction())) return null;
    const y = this.valueAtX(0); if (y === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    let i = ch.findIndex(e => { const p = this.choicePair(e);
      return p && Math.abs(p[0]) < 1e-9 && Math.abs(p[1] - y) < 0.2; });
    if (i < 0) i = ch.findIndex(e => { const v = this.choiceValue(e);
      return v !== null && this.choicePair(e) === null && Math.abs(v - y) < 0.2; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveIntercept', RE]);
})();
;'__duo ready';

// "Create a growth factor of 4" / "with base 3" — the target is stated outright
// and goes straight onto the slider.
window.__duo.solveGraphBase = async function () {
  const A = this.promptLatex().map(l => this.flatLine(l)).join(' ');
  const m = A.match(/(?:base|growthfactor|decayfactor|commonratio|multiplier)of?(-?[\d.]+)/i);
  if (!m) return false;
  return await this.setSlider2d(parseFloat(m[1]));
};
;'__duo ready';

// "Select the growth factor" — same quantity as the common ratio, read off the
// value table or the printed a * b^x formula.
window.__duo.growthFactor = function () {
  const F = this.fitTable(); if (F) return F.r;
  const src = this.formulaIn('x'); if (!src) return null;
  const m = src.src.replace(/cdot/g, '*').match(/(-?[\d.]+)\s*\*\*?\s*\(?x/) ||
            src.src.match(/(-?[\d.]+)\^x/);
  return m ? parseFloat(m[1]) : null;
};
(function () {
  const RE = /(growth|decay)\s*factor|common\s*ratio|multiplier|constant\s*factor/i;
  const base = window.__duo.solveTableStep;
  window.__duo.solveTableStep = function () {
    const r = base.call(this); if (r) return r;
    if (!RE.test(this.curInstruction())) return null;
    const g = this.growthFactor(); if (g === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - g) < 1e-9; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveTableStep', RE]);
})();
;'__duo ready';

// flatLine leaves \cdot as the bare word "cdot", which never compiled
window.__duo.formulaIn = function (v) {
  v = v || 'x';
  let f = null, src = null;
  for (const line of this.promptLatex()) {
    const t = this.flatLine(line);
    const q = t.match(new RegExp('^(?:[a-z]\\(' + v + '\\)|y)=([^=]+)$'));
    if (q) { src = q[1]; const g = this.compile(src.replace(/cdot|times/g, '*')); if (g) f = g; }
  }
  return src ? { f, src } : null;
};
;'__duo ready';

// "f(x) = 6 \cdot 6^x" is a \mathbf line but contains letters ("cdot"), so it
// was winning over the real instruction. Prefer \text/\textbf; \mathbf only as
// a fallback.
window.__duo.curInstruction = function () {
  const L = this.promptLatex();
  const pick = re => {
    for (let i = L.length - 1; i >= 0; i--) {
      if (!re.test(L[i])) continue;
      const t = this.ascii(L[i]).replace(/mathbf|textbf|emphasis|text|\\|[{}]|~/g, ' ');
      if (/[a-z]{3}/i.test(t.replace(/cdot|frac|sqrt|times/g, ''))) return t.replace(/\s+/g, ' ').trim().toLowerCase();
    }
    return null;
  };
  return pick(/\\text(bf)?\{/) || pick(/mathbf/) ||
         this.ascii(L[L.length - 1] || '').toLowerCase();
};
;'__duo ready';
