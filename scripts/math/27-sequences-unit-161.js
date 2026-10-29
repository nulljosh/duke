
// 1. systems written with \begin{aligned} y &= ... \\ y &= ... : the "&" survived
//    the brace strip and stopped the equations compiling
(function () {
  const base = window.__duo.intersectionsNL;
  window.__duo.intersectionsNL = function () {
    const r = base.call(this);
    if (r && r.length) return r;
    const fs = [];
    for (const line of this.promptLatex()) {
      const cleaned = this.ascii(line)
        .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, ' ')
        .replace(/\\(mathbf|textbf|text)\s*/g, '')
        .replace(/&/g, '')
        .replace(/[{}]/g, ' ');
      for (const part of cleaned.split(/\\\\/)) {
        const t = part.trim();
        if (!/^y\s*=/.test(t)) continue;
        const f = this.compile(t); if (f) fs.push(f);
      }
    }
    if (fs.length < 2) return null;
    const [f, g] = fs;
    const out = []; let prev = null;
    for (let x = -20; x <= 20; x += 0.02) {
      let d; try { d = f(x) - g(x); } catch (e) { prev = null; continue; }
      if (!isFinite(d)) { prev = null; continue; }
      if (Math.abs(d) < 1e-9) out.push(x);
      else if (prev && prev.d * d < 0) {
        let lo = prev.x, hi = x;
        for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; ((f(lo) - g(lo)) * (f(m) - g(m)) <= 0) ? (hi = m) : (lo = m); }
        out.push((lo + hi) / 2);
      }
      prev = { x, d };
    }
    const uniq = [];
    for (const x of out) { const r2 = Math.round(x * 2) / 2; if (!uniq.some(q => Math.abs(q - r2) < 1e-6)) uniq.push(r2); }
    return uniq.length ? uniq.sort((a, b) => a - b).map(x => [x, Math.round(f(x) * 2) / 2]) : null;
  };
})();

// 2. typed "Enter the value when x = -5" for a formula


// ---- sequences (unit 161) ----
// "Select the next term" for 3, 6, 12: detect arithmetic (constant difference) or
// geometric (constant ratio) and extend.
window.__duo.nextTerm = function () {
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const ns = (t.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (ns.length < 3) continue;
    const d = ns.slice(1).map((v, i) => v - ns[i]);
    if (d.every(v => Math.abs(v - d[0]) < 1e-9)) return ns[ns.length - 1] + d[0];
    if (ns.every(v => v !== 0)) {
      const q = ns.slice(1).map((v, i) => v / ns[i]);
      if (q.every(v => Math.abs(v - q[0]) < 1e-9)) return ns[ns.length - 1] * q[0];
    }
    // second-difference (quadratic) sequences
    if (d.length >= 2) {
      const d2 = d.slice(1).map((v, i) => v - d[i]);
      if (d2.every(v => Math.abs(v - d2[0]) < 1e-9))
        return ns[ns.length - 1] + d[d.length - 1] + d2[0];
    }
  }
  return null;
};
window.__duo.solveNextTerm = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/next term|next number|continues the (pattern|sequence)/.test(A)) return null;
  const v = this.nextTerm(); if (v === null) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => Math.abs(parseFloat(half(this.ascii(e.innerText))) - v) < 1e-9);
  return i < 0 ? { miss: v } : { i, want: v };
};
window.__duo.RULES.unshift(['solveNextTerm', /next term|next number|pattern|sequence/i]);


// \duoblank{} carries the answer verbatim, so for TYPED questions it must outrank
// every heuristic — the sequence handler was reading 15, 3, 45 out of
// "15 \cdot 3 = \duoblank{45}" and typing a made-up next term.


// "Select the common difference" / "common ratio" of a sequence
window.__duo.solveCommonDiff = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const wantRatio = /common ratio/.test(A);
  const wantDiff = /common difference/.test(A);
  if (!wantRatio && !wantDiff) return null;
  let ns = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const v = (t.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (v.length >= 3) { ns = v; break; }
  }
  if (!ns) return null;
  let want;
  if (wantRatio) {
    if (ns.some(v => v === 0)) return null;
    want = ns[1] / ns[0];
  } else want = ns[1] - ns[0];
  if (!isFinite(want)) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => Math.abs(parseFloat(half(this.ascii(e.innerText))) - want) < 1e-9);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.unshift(['solveCommonDiff', /common (difference|ratio)/i]);


// "Create the common ratio" for 54, 36, 24, 16 — three token slots make a fraction
// term2 / term1 (e.g. 36 / 54).
window.__duo.solveRatioSlots = async function () {
  const d = this.diagram(); if (!d || !d.M.entries || d.M.entries.length !== 3) return false;
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/common ratio|ratio/.test(A)) return false;
  let ns = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
    const v = (t.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (v.length >= 2) { ns = v; break; }
  }
  if (!ns) return false;
  const seq = [String(ns[1]), '/', String(ns[0])];
  const centre = el => {
    const r = el.getBoundingClientRect(), f = d.f.getBoundingClientRect();
    return [Math.round(f.left + r.left + r.width / 2), Math.round(f.top + r.top + r.height / 2)];
  };
  for (let i = 0; i < seq.length; i++) {
    if (d.M.entries[i] !== null) continue;
    const tok = this.bankTokens().find(o => o.t === seq[i] && o.el.isConnected);
    const cell = d.M.cellElements && d.M.cellElements[i];
    if (!tok || !cell) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
    await this.sleep(340);
  }
  return d.M.entries.every(e => e !== null);
};
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const d = this.diagram();
    if (d && d.M.entries && d.M.entries.some(e => e === null)) {
      if (await this.solveRatioSlots()) return true;
    }
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// Typed "common ratio" wants an exact value: 27/81 as 1/3, not 0.3333333333333333.
// Emit a reduced fraction whenever the ratio isn't an exact short decimal.
window.__duo.exactFrac = function (ns, i) {
  const a = ns[i + 1], b = ns[i];
  const sc = v => { const s = String(v); const d = s.includes('.') ? s.split('.')[1].length : 0; return d; };
  const p = Math.pow(10, Math.max(sc(a), sc(b)));
  let n = Math.round(a * p), d = Math.round(b * p);
  const g = (x, y) => y ? g(y, x % y) : Math.abs(x);
  const k = g(n, d); n /= k; d /= k;
  if (d < 0) { n = -n; d = -d; }
  return d === 1 ? String(n) : n + '/' + d;
};

// Guided lessons accumulate prompt lines, so /common ratio/ over the whole prompt
// hijacked later steps ("write a recursive formula") and typed a ratio at them.
// Gate on the CURRENT instruction only: the last \textbf line.


// "First, substitute <v> for <x>" — the choices are literal substitutions
// (f(2) = 3^2 vs f(2) = 2^3). Pick the one whose RHS is the formula's RHS with
// the variable textually replaced, not an evaluated value.
// exponents render as plain digits in innerText (3^2 -> "32"), so drop ^ before comparing
window.__duo.subNorm = function (s) { return String(s).replace(/[{}\\\s^]|mathbf|textbf|text|cdot|\*/g, ''); };
window.__duo.RULES.unshift(['solveSubstitute', /substitut/i]);
;'__duo ready';

// Choice innerText flattens exponents (3^2 reads as "32"), so string-matching a
// substitution step is unreliable. The MathML <annotation> carries real LaTeX —
// read that and compare by VALUE, which covers both the "substitute" step
// (2^3 vs 3^2) and the "expand" step (3*2 vs 3*3).
window.__duo.choiceLatex = function (el) {
  const a = el.querySelector('annotation');
  return a ? a.textContent : this.ascii(el.innerText);
};
;'__duo ready';

// curInstruction only looked at \textbf/\mathbf, so a plain \text step
// ("Select the expanded form.") left it reporting the previous step's wording.

// Guided exponential steps ("substitute", "expand the power", "select the
// expanded form") all reduce to: the last equation line has a value, pick the
// choice with the same value. Beats string matching, which the flattened
// innerText breaks.
window.__duo.solveValueMatch = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  let want = null;
  for (const line of this.promptLatex()) {
    const t = this.ascii(line).replace(/mathbf|textbf|text|\\(?![a-z])|[{}]|~|\s/g, '');
    const q = t.match(/=([^=]+)$/);
    if (!q) continue;
    const g = this.compile(q[1]);
    try { const val = g && g(0); if (isFinite(val)) want = val; } catch (e) {}
  }
  if (want === null) return null;
  const i = ch.findIndex(e => {
    const g = this.compile(this.choiceLatex(e).split('=').pop());
    try { return g && Math.abs(g(0) - want) < 1e-9; } catch (err) { return false; }
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveValueMatch', /expand|substitut|simplif/i]);
;'__duo ready';

// "Substitute V for x" is a LITERAL rewrite, not an evaluation: with f(x)=4^x
// and V=3 the answer is 4^3, and 3^4 is the decoy with a different value, so
// value-matching picks wrong. Compare LaTeX from the MathML annotation instead.
window.__duo.solveSubstitute = function () {
  const m = this.curInstruction().match(/substitut\w*\s+(-?[\d.]+)\s+(?:for|into)\s+([a-z])/);
  if (!m) return null;
  const val = m[1], v = m[2];
  const flat = s => String(s).replace(/mathbf|textbf|text|\\|[{}]|~|\s|cdot/g, '');
  let rhs = null;
  for (const line of this.promptLatex()) {
    const q = flat(this.ascii(line)).match(new RegExp('^[a-z]\\(' + v + '\\)=([^=]+)$'));
    if (q) rhs = q[1];
  }
  if (!rhs) return null;
  const want = rhs.split('').map(c => c === v ? val : c).join('');
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => flat(this.choiceLatex(e)).split('=').pop() === want);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveSubstitute', /substitut/i]);
;'__duo ready';

// Grid2D exponential graphing: a curve component (options.fOfX) plus one
// draggable point. "Graph an exponential with base 3" against y = 5 * 2^x means
// dragging that point until the curve's base matches. grid.gridToPixel converts
// graph coords to iframe pixels.
window.__duo.gridPoints = function () {
  const d = this.diagram(); if (!d || !d.M.components) return [];
  return [...d.M.components.components.values()]
    .filter(v => v.options && 'x' in v.options && !v.options.isStatic);
};
// base b: the prompt asks for a base, the point sits at (1, current base).
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (/base/.test(this.curInstruction()) && await this.solveGraphBase()) return true;
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// Grid2D "slider2d": an SVG track with one notch per allowed value and a thumb.
// grid.slider gives {min,max,step}; drag the thumb onto the notch for the value
// the prompt asks for. Nothing in components is draggable for these screens.
window.__duo.slider2d = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const thumb = doc.querySelector('.slider2d-thumb, [class*="slider2d-thumb"]');
  const notches = [...doc.querySelectorAll('.slider2d-notch, [class*="slider2d-notch"]')];
  const g = d.M.grid;
  if (!thumb || !notches.length || !g || !g.slider) return null;
  return { d, thumb, notches, s: g.slider };
};
window.__duo.setSlider2d = async function (want) {
  const S = this.slider2d(); if (!S) return false;
  const i = Math.round((want - S.s.min) / S.s.step);
  if (i < 0 || i >= S.notches.length) return false;
  // the slider group has a zero-size bounding rect, so getBoundingClientRect is
  // useless here; go through the SVG screen CTM instead.
  const fr = S.d.f.getBoundingClientRect();
  const svg = S.thumb.ownerSVGElement;
  const scr = (el, lx, ly) => {
    const p = svg.createSVGPoint(); p.x = lx; p.y = ly;
    const q = p.matrixTransform(el.getScreenCTM());
    return [Math.round(fr.left + q.x), Math.round(fr.top + q.y)];
  };
  const n = S.notches[i];
  const from = scr(S.thumb, +S.thumb.getAttribute('x') + (+S.thumb.getAttribute('width') || 0) / 2,
                             +S.thumb.getAttribute('y') + (+S.thumb.getAttribute('height') || 0) / 2);
  const to = scr(n, +n.getAttribute('cx'), +n.getAttribute('cy'));
  await this.dragXY(S.thumb, S.d.f, from, to);
  await this.sleep(320);
  return true;
};
;'__duo ready';

(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveGraphBase()) return true;
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// "Select the match": the subject is a drawn curve and the choices are the
// words linear / quadratic / exponential. Classify by sampling the path:
// constant 2nd difference and a sign change in slope => quadratic, constant
// ratio of successive deltas => exponential, constant slope => linear.
window.__duo.curveKind = function () {
  const c = this.curvePath(); if (!c) return null;
  const P = []; for (let i = 0; i <= 20; i++) P.push(c.at(i / 20));
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v))) return null;
  const d1 = []; for (let i = 1; i < P.length; i++) d1.push((ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]));
  const spread = a => Math.max(...a) - Math.min(...a);
  const scale = Math.max(1e-9, spread(ys));
  if (spread(d1) < 0.05 * Math.max(1, Math.abs(d1[0])) + 1e-6) return 'linear';
  const d2 = []; for (let i = 1; i < d1.length; i++) d2.push(d1[i] - d1[i - 1]);
  const ratios = []; for (let i = 1; i < d1.length; i++) if (Math.abs(d1[i - 1]) > 1e-6) ratios.push(d1[i] / d1[i - 1]);
  const rSpread = ratios.length ? spread(ratios) / Math.max(1e-9, Math.abs(ratios[0])) : Infinity;
  const cSpread = spread(d2) / Math.max(1e-9, Math.abs(d2[0] || 1));
  // an exponential never turns around; a quadratic does (or its slope changes sign)
  const turns = d1.some(v => v > 0) && d1.some(v => v < 0);
  if (turns) return 'quadratic';
  return rSpread < cSpread ? 'exponential' : 'quadratic';
};
window.__duo.RULES.unshift(['solveCurveKind', /select the match|what (kind|type)/i]);
;'__duo ready';

window.__duo.RULES.unshift(['solveCurveKind', /select the (match|function type)|what (kind|type)/i]);

// "Enter the output when x = 2" — evaluate the function given in the prompt.
(function () {
  const prev = window.__duo.typeAnswer;
  window.__duo.typeAnswer = function () {
    if (document.querySelector('[data-test="challenge-text-input"]')) {
      const o = this.solveOutputAt();
      if (o !== null) { const s = String(o); this.type(s); return s; }
    }
    return prev.call(this);
  };
})();
;'__duo ready';

// prompt lines keep stray backslashes/marks after the LaTeX strip, so anchoring
// on ^[a-z]( failed. One shared cleaner for formula extraction.
window.__duo.flatLine = function (line) {
  return this.ascii(line).replace(/mathbf|textbf|emphasis|text|\\|[{}]|~|\s/g, '')
    .replace(/^[^A-Za-z0-9(-]+/, '');
};
window.__duo.solveOutputAt = function () {
  const ins = this.curInstruction();
  const m = ins.match(/(?:output|value)\s+when\s+([a-z])\s*=\s*(-?[\d.]+)/) ||
            ins.match(/find\s+[a-z]\(\s*(-?[\d.]+)\s*\)/);
  if (!m) return null;
  const two = m[2] !== undefined;
  const F = this.formulaIn(two ? m[1] : 'x');
  if (!F) return null;
  let out; try { out = F.f(parseFloat(two ? m[2] : m[1])); } catch (e) { return null; }
  return isFinite(out) ? out : null;
};
// classify from the formula when one is printed; fall back to the drawn curve
window.__duo.solveCurveKind = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase());
  if (!words.some(w => /linear|quadratic|exponential/.test(w))) {
    // same question, numeric choices: "select the value when x = 3"
    const o = this.solveOutputAt();
    if (o === null) return null;
    const i = ch.findIndex(e => Math.abs(parseFloat(this.flatLine(this.choiceLatex(e))) - o) < 1e-9);
    return i < 0 ? null : { i };
  }
  const F = this.formulaIn('x');
  let k = null;
  if (F) {
    const s = F.src.replace(/\s/g, '');
    k = /\^x|\^\{x/.test(s) ? 'exponential' : /x\^2|x\^\{2/.test(s) ? 'quadratic' : 'linear';
  } else k = this.curveKind();
  if (!k) return null;
  const i = words.findIndex(w => w.includes(k));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCurveKind', /select the (match|function type|value)|what (kind|type)/i]);
;'__duo ready';

// compile() only understood numeric exponents, so exponentials (10^x, 2^{x+1})
// never compiled. Normalize a variable exponent before handing it over.
(function () {
  const base = window.__duo.compile;
  window.__duo.compile = function (src) {
    if (typeof src === 'string' && /\^\s*[a-z{]/.test(src)) {
      const t = src.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/\^([a-z])/g, '^($1)');
      const g = base.call(this, t);
      if (g) return g;
    }
    return base.call(this, src);
  };
})();
// keep the printed formula even when it will not compile, so the function-type
// classifier can still read its shape
;'__duo ready';
