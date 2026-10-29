
// Reading the curve at a single nearest sample is fragile on a steep
// exponential. Fit y = a * b^x over many samples and use the fit instead.
window.__duo.fitCurveExp = function () {
  const c = this.curvePath(); if (!c) return null;
  const P = []; for (let i = 0; i <= 60; i++) { const p = c.at(i / 60); if (isFinite(p[0]) && p[1] > 0) P.push(p); }
  if (P.length < 6) return null;
  // least squares on ln y = ln a + x ln b
  let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = P.length;
  for (const [x, y] of P) { const l = Math.log(y); sx += x; sy += l; sxx += x * x; sxy += x * l; }
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const b0 = (sy - m * sx) / n;
  const a = Math.exp(b0), r = Math.exp(m);
  if (!isFinite(a) || !isFinite(r)) return null;
  for (const [x, y] of P) if (Math.abs(a * Math.pow(r, x) - y) > 0.35 + 0.1 * Math.abs(y)) return null;
  return { a: Math.round(a * 100) / 100, r: Math.round(r * 100) / 100 };
};


// \frac{1}{2} survives only in the raw LaTeX — flatLine strips the braces and
// turns it into "frac12". Compile the raw text first.
window.__duo.choiceValue = function (el) {
  const raw = this.choiceLatex(el).split('=').pop()
    .replace(/\\mathbf|\\textbf|\\text/g, '').replace(/\\cdot|\\times/g, '*');
  const g = this.compile(raw);
  if (g) { try { const v = g(0); if (isFinite(v)) return v; } catch (e) {} }
  const t = this.flatLine(this.choiceLatex(el)).split('=').pop();
  const h = t.replace(/frac(-?\d+(?:\.\d+)?)(-?\d+(?:\.\d+)?)$/, '($1)/($2)');
  const g2 = this.compile(h);
  if (g2) { try { const v = g2(0); if (isFinite(v)) return v; } catch (e) {} }
  const n = parseFloat(t);
  return isFinite(n) ? n : null;
};
;'__duo ready';

// "Complete the pattern": rows alternate formula / its base, one base missing.
// The blank follows its own formula, so read the base out of that formula.
window.__duo.solvePattern = function () {
  if (!/complete the pattern/.test(this.curInstruction())) return null;
  const L = this.promptLatex();
  let want = null;
  for (let i = 0; i < L.length; i++) {
    if (this.flatLine(L[i]) !== '') continue;
    const prev = this.ascii(L[i - 1] || '');
    const m = prev.match(/\\left\((.+?)\\right\)\s*\^/) || prev.match(/\(([^()]+)\)\s*\^/);
    if (!m) continue;
    const g = this.compile(m[1]);
    if (g) { try { const v = g(0); if (isFinite(v)) { want = v; break; } } catch (e) {} }
  }
  if (want === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-9; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePattern', /complete the pattern/i]);
;'__duo ready';

// Transformations: "Graph g(x) = f(x) + 2" against a display line
// "g(x) = f(x) + \duodisplay{-2}{0}" — the slider holds the shift, and the
// wanted value is the constant in the instruction.
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveShiftSlider()) return true;
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// the goal line reads "Graphg(x)=f(x)+2" after flattening, so anchoring at ^ failed
;'__duo ready';

// Two curves drawn (f and g): measure the constant vertical gap between them
// and pick the transformation choice that states it.
window.__duo.allCurves = function () {
  const g = this.grid2D(); if (!g) return [];
  const doc = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  return [...doc.querySelectorAll('path,polyline')]
    .filter(p => String(p.getAttribute('class') || '').split(/\s+/).includes('line'))
    .map(p => {
      let L = 0; try { L = p.getTotalLength(); } catch (e) { return null; }
      const m = p.getScreenCTM(); if (!L || !m) return null;
      return t => { const q = p.getPointAtLength(t * L);
        return g.toXY(fr.left + m.a * q.x + m.c * q.y + m.e, fr.top + m.b * q.x + m.d * q.y + m.f); };
    }).filter(Boolean);
};
window.__duo.solveTransform = function () {
  if (!/transformation/.test(this.curInstruction())) return null;
  let k = this.curveGap();
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (k === null) return null;
  const val = e => { const m = this.flatLine(this.choiceLatex(e)).match(/\(x\)([+-])(\d+(?:\.\d+)?)/);
    return m ? (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) : null; };
  // the gap sign depends on which path the DOM lists first; accept either
  let i = ch.findIndex(e => val(e) === k);
  if (i < 0) i = ch.findIndex(e => val(e) === -k);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveTransform', /transformation/i]);
;'__duo ready';

// \left( \right) survive flatLine as the words "left"/"right", so "g(x)=f(x)+3"
// never matched. Strip the LaTeX sizing/spacing words before pattern matching.
window.__duo.solveShiftSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  for (const line of this.promptLatex()) {
    const t = this.plainMath(line);
    const m = t.match(/([a-z])\(x\)=([a-z])\(x\)([+-])(\d+(?:\.\d+)?)/);
    if (m && m[1] !== m[2]) return await this.setSlider2d((m[3] === '-' ? -1 : 1) * parseFloat(m[4]));
    const h = t.match(/([a-z])\(x\)=([a-z])\(x([+-])(\d+(?:\.\d+)?)\)/);
    if (h && h[1] !== h[2]) return await this.setSlider2d((h[3] === '-' ? -1 : 1) * parseFloat(h[4]));
  }
  return false;
};
;'__duo ready';

// Several autoDrag wrappers each set the slider in turn, so a later one undid
// the correct value set by an earlier one. Single dispatcher: first hit wins.
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d()) {
      for (const fn of ['solveShiftSlider', 'solveSliderTarget', 'solveGraphBase']) {
        if (await this[fn]()) return true;
      }
    }
    if (await this.solveGraphPoint()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// curveGap was nearest-sample matching with a tight tolerance and often gave up.
// Sample densely and interpolate the second curve at the first curve's x values.
window.__duo.curveGap = function () {
  const C = this.allCurves(); if (C.length !== 2) return null;
  const dense = at => { const P = []; for (let i = 0; i <= 200; i++) { const p = at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); } return P.sort((a, b) => a[0] - b[0]); };
  const A = dense(C[0]), B = dense(C[1]);
  if (A.length < 10 || B.length < 10) return null;
  const interp = (P, x) => {
    if (x < P[0][0] || x > P[P.length - 1][0]) return null;
    for (let i = 1; i < P.length; i++) if (P[i][0] >= x) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return null;
  };
  const ds = [];
  for (let i = 0; i < A.length; i += 4) { const y = interp(B, A[i][0]); if (y !== null) ds.push(y - A[i][1]); }
  if (ds.length < 8) return null;
  ds.sort((a, b) => a - b);
  const med = ds[Math.floor(ds.length / 2)];
  const good = ds.filter(d => Math.abs(d - med) < 0.35);
  if (good.length < ds.length * 0.7) return null;
  return Math.round(med);
};
;'__duo ready';

// Transformed functions stated in the prompt: f(x) = 7x - 5, g(x) = f(x) + 3.
// Build g from f and answer questions about g (its value, or its equation).
window.__duo.solveTransformedValue = function () {
  const T = this.transformed(); if (!T) return null;
  const ins = this.curInstruction();
  const m = ins.match(new RegExp(T.gname + '\\s*\\(\\s*(-?[\\d.]+)\\s*\\)'));
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (m) {
    let want; try { want = T.g(parseFloat(m[1])); } catch (e) { return null; }
    if (!isFinite(want)) return null;
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-9; });
    return i < 0 ? null : { i };
  }
  // "select the equation for g(x)": test each candidate against g
  if (/equation/.test(ins)) {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ok = [];
    ch.forEach((e, i) => {
      const c = this.compile(this.flatLine(this.choiceLatex(e)).split('=').pop().replace(/cdot/g, '*'));
      if (!c) return;
      let bad = 0;
      for (const x of xs) { try { if (Math.abs(c(x) - T.g(x)) > 1e-6) bad++; } catch (err) { bad++; } }
      if (!bad) ok.push(i);
    });
    return ok.length === 1 ? { i: ok[0] } : null;
  }
  // "select the vertical shift from f to g"
  if (/shift/.test(ins) && T.k.out !== undefined) {
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - T.k.out) < 1e-9; });
    return i < 0 ? null : { i };
  }
  return null;
};
window.__duo.RULES.unshift(['solveTransformedValue', /value of|equation for|shift from/i]);
;'__duo ready';

// an aligned block puts both definitions on one flattened line:
// "f(x)=7x-5g(x)=f(x)+3" — split before each "<letter>(x)=" before parsing
window.__duo.mathParts = function () {
  const out = [];
  for (const line of this.promptLatex()) {
    for (const part of this.plainMath(line).split(/(?=[a-z]\(x\)=)/)) {
      const t = part.trim(); if (t) out.push(t);
    }
  }
  return out;
};
window.__duo.transformed = function () {
  let f = null, k = null, gname = 'g';
  for (const t of this.mathParts()) {
    const q = t.match(/^([a-z])\(x\)=([^=]+)$/); if (!q) continue;
    const s = q[2].match(/^([a-z])\(x\)([+-])(\d+(?:\.\d+)?)$/);
    const m = q[2].match(/^([a-z])\(x([+-])(\d+(?:\.\d+)?)\)$/);
    if (s) { gname = q[1]; k = { out: (s[2] === '-' ? -1 : 1) * parseFloat(s[3]) }; continue; }
    if (m) { gname = q[1]; k = { in: (m[2] === '-' ? -1 : 1) * parseFloat(m[3]) }; continue; }
    const g = this.compile(q[2].replace(/cdot|times/g, '*')); if (g) f = g;
  }
  if (!f || !k) return null;
  const g = k.out !== undefined ? (x => f(x) + k.out) : (x => f(x + k.in));
  return { f, g, k, gname };
};
;'__duo ready';

// stripping the bare word "vert" also ate the "vert" inside "vertical".
// Remove the LaTeX words only where they stand alone as commands.
window.__duo.plainMath = function (line) {
  return this.ascii(line)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right|vert|cdot|times|begin|end)\b/g,
             m => (m === '\\cdot' || m === '\\times') ? '*' : '')
    .replace(/\{aligned\}|\{array\}|[{}&~,\s\\]/g, '')
    .replace(/^[^A-Za-z0-9(-]+/, '');
};
;'__duo ready';

// shifts are also stated in words: "g(x) is 12 units above f(x)"
window.__duo.statedShift = function () {
  for (const t of this.mathParts().concat([this.curInstruction()])) {
    const m = t.replace(/\s/g, '').match(/is(-?\d+(?:\.\d+)?)unitsa?(above|below|up|down)/i);
    if (m) return (/below|down/i.test(m[2]) ? -1 : 1) * parseFloat(m[1]);
  }
  return null;
};


// "Create the transformation of f(x) to g(x)" with token slots: assemble
// g(x) = f(x) + 12 from the bank (which also holds decoys like h(x)).
window.__duo.solveBuildTransform = async function () {
  const d = this.diagram(); if (!d || !d.M.entries || d.M.entries.length !== 5) return false;
  const k = this.statedShift(); if (k === null) return false;
  const names = (this.mathParts().join(' ').match(/([a-z])\(x\)/g) || [])
    .map(s => s[0]).filter((v, i, a) => a.indexOf(v) === i);
  if (names.length < 2) return false;
  const [gn, fn] = names;                        // "g(x) is 12 units above f(x)"
  const seq = [gn + '(x)', '=', fn + '(x)', k < 0 ? '-' : '+', String(Math.abs(k))];
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (let i = 0; i < seq.length; i++) {
    if (d.M.entries[i] !== null) continue;
    const tok = this.bankTokens().find(o => o.t.replace(/\s/g, '') === seq[i] && o.el.isConnected);
    const cell = d.M.cellElements && d.M.cellElements[i];
    if (!tok || !cell) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
    await this.sleep(320);
  }
  return d.M.entries.every(e => e !== null);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveBuildTransform()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// name order must come from the shift sentence ("g(x) is 12 units above f(x)"),
// not from the title line, which lists f first and built the equation backwards
window.__duo.shiftNames = function () {
  for (const t of this.mathParts().concat([this.curInstruction()])) {
    const s = t.replace(/\s/g, '');
    const m = s.match(/([a-z])\(x\)is-?\d+(?:\.\d+)?unitsa?(?:above|below|up|down)([a-z])\(x\)/i);
    if (m) return [m[1], m[2]];
  }
  return null;
};
(function () {
  const base = window.__duo.solveBuildTransform;
  window.__duo.solveBuildTransform = async function () {
    const d = this.diagram(); if (!d || !d.M.entries || d.M.entries.length !== 5) return false;
    const k = this.statedShift(); const N = this.shiftNames();
    if (k === null || !N) return await base.call(this);
    const seq = [N[0] + '(x)', '=', N[1] + '(x)', k < 0 ? '-' : '+', String(Math.abs(k))];
    const fr = d.f.getBoundingClientRect();
    const centre = el => { const r = el.getBoundingClientRect();
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
    for (let i = 0; i < seq.length; i++) {
      if (d.M.entries[i] !== null) continue;
      const tok = this.bankTokens().find(o => o.t.normalize('NFKC').replace(/\s/g, '') === seq[i] && o.el.isConnected);
      const cell = d.M.cellElements && d.M.cellElements[i];
      if (!tok || !cell) return false;
      await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
      await this.sleep(320);
    }
    return d.M.entries.every(e => e !== null);
  };
})();
;'__duo ready';

// If autoDrag runs twice on one screen the second drag moves the thumb again and
// undoes a correct answer (and CHECK goes back to aria-disabled). Read the
// current value first and do nothing when it already matches.
window.__duo.sliderValue = function () {
  const S = this.slider2d(); if (!S) return null;
  const tx = +S.thumb.getAttribute('x') + (+S.thumb.getAttribute('width') || 0) / 2;
  let bi = 0, bd = Infinity;
  S.notches.forEach((n, i) => { const d = Math.abs(+n.getAttribute('cx') - tx); if (d < bd) { bd = d; bi = i; } });
  return S.s.min + bi * S.s.step;
};
(function () {
  const base = window.__duo.setSlider2d;
  window.__duo.setSlider2d = async function (want) {
    const cur = this.sliderValue();
    if (cur !== null && Math.abs(cur - want) < 1e-9) return true;
    return await base.call(this, want);
  };
})();
;'__duo ready';

// solveShiftSlider walked raw lines, but both definitions often share one line;
// mathParts already splits them.
window.__duo.solveShiftSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  for (const t of this.mathParts()) {
    const m = t.match(/^([a-z])\(x\)=([a-z])\(x\)([+-])(\d+(?:\.\d+)?)$/);
    if (m && m[1] !== m[2]) return await this.setSlider2d((m[3] === '-' ? -1 : 1) * parseFloat(m[4]));
    const h = t.match(/^([a-z])\(x\)=([a-z])\(x([+-])(\d+(?:\.\d+)?)\)$/);
    if (h && h[1] !== h[2]) return await this.setSlider2d((h[3] === '-' ? -1 : 1) * parseFloat(h[4]));
  }
  const k = this.statedShift();
  return k === null ? false : await this.setSlider2d(k);
};
;'__duo ready';

// The no-op guard left CHECK disabled: the widget only enables it after a real
// pointer interaction. Always drag; guard against re-solving the same screen by
// remembering a fingerprint of it instead.
window.__duo.setSlider2d = async function (want) {
  const S = this.slider2d(); if (!S) return false;
  const i = Math.round((want - S.s.min) / S.s.step);
  if (i < 0 || i >= S.notches.length) return false;
  const fr = S.d.f.getBoundingClientRect();
  const svg = S.thumb.ownerSVGElement;
  const scr = (lx, ly) => { const p = svg.createSVGPoint(); p.x = lx; p.y = ly;
    const q = p.matrixTransform(svg.getScreenCTM());
    return [Math.round(fr.left + q.x), Math.round(fr.top + q.y)]; };
  const n = S.notches[i];
  const from = scr(+S.thumb.getAttribute('x') + (+S.thumb.getAttribute('width') || 0) / 2,
                   +S.thumb.getAttribute('y') + (+S.thumb.getAttribute('height') || 0) / 2);
  const to = scr(+n.getAttribute('cx'), +n.getAttribute('cy'));
  await this.dragXY(S.thumb, S.d.f, from, to);
  await this.sleep(320);
  return true;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const key = this.promptLatex().join('|').slice(0, 200);
    if (this.__dragKey === key && this.__dragOk) return true;   // already solved
    const r = await base.call(this);
    this.__dragKey = key; this.__dragOk = r;
    return r;
  };
})();
;'__duo ready';

// run2 only reaches autoDrag when plan() is truthy, but slider2d / draggable
// point screens produce no plan, so those lessons stalled with the drag solvers
// never called. Make plan() report those interactive widgets too.
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    if (this.slider2d()) return { kind: 'slider2d', from: [0, 0], to: [0, 0] };
    if (this.gridPoints().length === 1) return { kind: 'gridpoint', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';
