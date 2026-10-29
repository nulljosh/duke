
// "Create the expression for g(x)" from a token bank: slots are
// [g(x)] [=] [term] [op] [term]. Brute-force the three right-hand tokens and
// keep the combination that matches g numerically — no algebra needed.
window.__duo.solveBuildExpression = async function () {
  const d = this.diagram(); if (!d || !d.M.entries || d.M.entries.length !== 5) return false;
  if (!d.M.entries.every(e => e === null)) return false;
  const T = this.transformed(); if (!T) return null;
  const toks = this.bankTokens();
  const lhs = toks.find(o => o.t.normalize('NFKC').replace(/\s/g, '') === T.gname + '(x)');
  const eq = toks.find(o => o.t.trim() === '=');
  if (!lhs || !eq) return false;
  const rest = toks.filter(o => o !== lhs && o !== eq);
  const val = o => { const g = this.compile(o.t.normalize('NFKC').replace(/\s/g, '')); return g || null; };
  const xs = [-2, -1, 0, 1, 2, 3];
  let hit = null;
  for (const a of rest) { const fa = val(a); if (!fa) continue;
    for (const op of rest) { const s = op.t.trim(); if (s !== '+' && s !== '-') continue;
      for (const b of rest) { if (b === a || b === op) continue;
        const fb = val(b); if (!fb) continue;
        let ok = true;
        for (const x of xs) { try {
          const v = s === '+' ? fa(x) + fb(x) : fa(x) - fb(x);
          if (Math.abs(v - T.g(x)) > 1e-6) { ok = false; break; }
        } catch (e) { ok = false; break; } }
        if (ok) { hit = [lhs, eq, a, op, b]; break; }
      } if (hit) break; } if (hit) break; }
  if (!hit) return false;
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (let i = 0; i < hit.length; i++) {
    const cell = d.M.cellElements && d.M.cellElements[i];
    if (!cell || !hit[i].el.isConnected) return false;
    await this.dragXY(hit[i].el, d.f, centre(hit[i].el), centre(cell));
    await this.sleep(320);
  }
  return d.M.entries.every(e => e !== null);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveBuildExpression()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// typed variants: "enter the vertical shift from f to g",
// "enter the output of g when x = 6"


// "Translate the graph right by 2" against a template g(x) = f(x - <slider>).
// The template already carries the sign, so right maps to +2 there; when the
// template reads f(x + <slider>) it maps to -2. Same idea for up/down.
window.__duo.solveTranslate = async function () {
  const S = this.slider2d(); if (!S) return false;
  const ins = this.curInstruction().replace(/\s/g, '');
  const m = ins.match(/(right|left|up|down)by(-?\d+(?:\.\d+)?)/i);
  if (!m) return false;
  const n = parseFloat(m[2]);
  const dir = m[1].toLowerCase();
  const tpl = this.mathParts().find(t => /duodisplay/.test(t)) || '';
  let want;
  if (dir === 'right' || dir === 'left') {
    const minusInside = /x-duodisplay/.test(tpl);
    want = (dir === 'right' ? 1 : -1) * n * (minusInside ? 1 : -1);
  } else {
    const minusOutside = /\)-duodisplay/.test(tpl);
    want = (dir === 'up' ? 1 : -1) * n * (minusOutside ? -1 : 1);
  }
  return await this.setSlider2d(want);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveTranslate()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// same translation, other wording: "graph a left shift of 2"
(function () {
  const base = window.__duo.solveTranslate;
  window.__duo.solveTranslate = async function () {
    if (await base.call(this)) return true;
    const S = this.slider2d(); if (!S) return false;
    const ins = this.curInstruction().replace(/\s/g, '');
    const m = ins.match(/(right|left|up|down)shiftof(-?\d+(?:\.\d+)?)/i) ||
              ins.match(/shift(?:the\w*)?(right|left|up|down)(?:by)?(-?\d+(?:\.\d+)?)/i);
    if (!m) return false;
    const n = parseFloat(m[2]), dir = m[1].toLowerCase();
    const tpl = this.mathParts().find(t => /duodisplay/.test(t)) || '';
    let want;
    if (dir === 'right' || dir === 'left') {
      want = (dir === 'right' ? 1 : -1) * n * (/x-duodisplay/.test(tpl) ? 1 : -1);
    } else {
      want = (dir === 'up' ? 1 : -1) * n * (/\)-duodisplay/.test(tpl) ? -1 : 1);
    }
    return await this.setSlider2d(want);
  };
})();
;'__duo ready';

// horizontal shift between two drawn curves: the h that best aligns them
window.__duo.curveShiftX = function () {
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
  let best = null, bestErr = Infinity;
  for (let h = -8; h <= 8; h += 0.5) {
    let n = 0, err = 0;
    for (let i = 0; i < A.length; i += 4) {
      const y = interp(B, A[i][0] + h);
      if (y === null) continue;
      err += Math.abs(y - A[i][1]); n++;
    }
    if (n < 8) continue;
    const e = err / n;
    if (e < bestErr) { bestErr = e; best = h; }
  }
  return bestErr < 0.25 ? Math.round(best) : null;
};


// g(x) = f(x - 9) is a shift of +9: the shift is the negation of the constant
// inside the argument.


// "Select the output of g when x = 3" — same computation as the typed form,
// just matched against the choices.


// g(x) = f(x + 2) against a template f(x - <slider>) needs the slider at -2:
// the template's own sign decides, exactly as in solveTranslate.


// Without a \duodisplay template the slider carries no sign convention, so
// guessing is a coin flip. Set a value, then check the drawn curve against the
// expected g(x) and flip if it does not match.
window.__duo.curveMatches = function (fn) {
  for (const at of this.allCurves()) {
    let n = 0, bad = 0;
    for (let i = 0; i <= 40; i++) {
      const [x, y] = at(i / 40);
      if (!isFinite(x) || !isFinite(y)) continue;
      let v; try { v = fn(x); } catch (e) { continue; }
      if (!isFinite(v)) continue;
      n++; if (Math.abs(v - y) > 0.3) bad++;
    }
    if (n >= 10 && bad <= n * 0.1) return true;
  }
  return false;
};
(function () {
  const base = window.__duo.solveShiftSlider;
  window.__duo.solveShiftSlider = async function () {
    const S = this.slider2d(); if (!S) return false;
    const T = this.transformed();
    const ok = await base.call(this);
    if (!ok || !T) return ok;
    await this.sleep(250);
    if (this.curveMatches(T.g)) return true;
    const cur = this.sliderValue();
    if (cur === null) return true;
    await this.setSlider2d(-cur);                 // wrong sign convention; flip
    await this.sleep(250);
    return true;
  };
})();
;'__duo ready';

// Transformation choices now include horizontal shifts and dilations
// (f(3x), f(x-3), f(x)+3). Score each candidate by rebuilding it from the drawn
// f and testing it against the drawn g — no need to classify the wording.
window.__duo.solveTransform = function () {
  const ins = this.curInstruction();
  if (!/transformation/.test(ins)) return null;
  const C = this.allCurves();
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  // formula route first: both f and g stated
  const T = this.transformed();
  if (T) {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ok = [];
    ch.forEach((e, i) => {
      const t = this.plainMath(this.choiceLatex(e));
      const m = t.match(/^[a-z]\(x\)=[a-z]\((.+)\)$/) || t.match(/^[a-z]\(x\)=[a-z]\(x\)([+-].+)$/);
      if (!m) return;
      let cand;
      if (/^[+-]/.test(m[1])) { const k = parseFloat(m[1]); cand = x => T.f(x) + k; }
      else { const inner = this.compile(m[1]); if (!inner) return; cand = x => T.f(inner(x)); }
      let bad = 0;
      for (const x of xs) { try { if (Math.abs(cand(x) - T.g(x)) > 1e-6) bad++; } catch (err) { bad++; } }
      if (!bad) ok.push(i);
    });
    if (ok.length === 1) return { i: ok[0] };
  }
  if (C.length !== 2) return null;
  const k = this.curveGap();
  if (k !== null && k !== 0) {
    const val = e => { const m = this.plainMath(this.choiceLatex(e)).match(/\(x\)([+-])(\d+(?:\.\d+)?)$/);
      return m ? (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) : null; };
    let i = ch.findIndex(e => val(e) === k);
    if (i < 0) i = ch.findIndex(e => val(e) === -k);
    if (i >= 0) return { i };
  }
  const h = this.curveShiftX();
  if (h !== null && h !== 0) {
    const val = e => { const m = this.plainMath(this.choiceLatex(e)).match(/\(x([+-])(\d+(?:\.\d+)?)\)$/);
      return m ? (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) : null; };
    let i = ch.findIndex(e => val(e) === -h);
    if (i < 0) i = ch.findIndex(e => val(e) === h);
    if (i >= 0) return { i };
  }
  return null;
};


// Unit 166: dilations. "Create a vertical stretch of 2" sets the slider that
// multiplies the function; a compression of n means a factor of 1/n.
window.__duo.statedDilation = function () {
  const t = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const m = t.match(/(vertical|horizontal)(stretch|compression|shrink)o?f?(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?/i);
  if (!m) return null;
  let n = parseFloat(m[3]); if (m[4]) n = n / parseFloat(m[4]);
  const shrink = /compression|shrink/i.test(m[2]);
  return { axis: m[1].toLowerCase(), k: shrink ? 1 / n : n };
};
window.__duo.solveDilation = async function () {
  const S = this.slider2d(); if (!S) return false;
  const D = this.statedDilation(); if (!D) return false;
  const want = D.k;
  if (want < S.s.min || want > S.s.max) {
    const inv = 1 / D.k;                       // template may hold the reciprocal
    if (inv >= S.s.min && inv <= S.s.max) return await this.setSlider2d(inv);
    return false;
  }
  return await this.setSlider2d(want);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveDilation()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the vertical stretch value from f(x) to g(x)": the ratio g/f, read
// from the stated formulas or measured off the two drawn curves.
window.__duo.stretchFactor = function () {
  for (const t of this.mathParts()) {
    const m = t.match(/^([a-z])\(x\)=(\d+(?:\.\d+)?)(?:\*|cdot)?([a-z])\(x\)$/);
    if (m && m[1] !== m[3]) return parseFloat(m[2]);
    const fr = t.match(/^([a-z])\(x\)=frac(\d+)(\d+)([a-z])\(x\)$/);
    if (fr && fr[1] !== fr[4]) return parseFloat(fr[2]) / parseFloat(fr[3]);
  }
  const C = this.allCurves(); if (C.length !== 2) return null;
  const dense = at => { const P = []; for (let i = 0; i <= 200; i++) { const p = at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); } return P.sort((a, b) => a[0] - b[0]); };
  const A = dense(C[0]), B = dense(C[1]);
  const interp = (P, x) => { if (x < P[0][0] || x > P[P.length - 1][0]) return null;
    for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return null; };
  const rs = [];
  for (let i = 0; i < A.length; i += 4) {
    const y = interp(B, A[i][0]);
    if (y === null || Math.abs(A[i][1]) < 0.5) continue;
    rs.push(y / A[i][1]);
  }
  if (rs.length < 8) return null;
  rs.sort((a, b) => a - b);
  const med = rs[Math.floor(rs.length / 2)];
  if (rs.filter(r => Math.abs(r - med) < 0.15).length < rs.length * 0.7) return null;
  return Math.round(med * 100) / 100;
};
(function () {
  const RE = /stretch|compress|shrink|dilation/i;
  const base = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const k = this.stretchFactor();
      if (k !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - k) < 0.05; });
        if (i >= 0) return { i };
      }
    }
    return base.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const k = this.stretchFactor(); if (k !== null) return k; }
    return bo.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// transformed() only knew shifts. Teach it dilations: g(x)=2f(x) (vertical) and
// g(x)=f(2x) (horizontal), so every g-question works off one builder.
window.__duo.transformed = function () {
  let f = null, k = null, gname = 'g';
  for (const t of this.mathParts()) {
    const q = t.match(/^([a-z])\(x\)=([^=]+)$/); if (!q) continue;
    const r = q[2];
    let m;
    if ((m = r.match(/^([a-z])\(x\)([+-])(\d+(?:\.\d+)?)$/)))
      { gname = q[1]; k = { out: (m[2] === '-' ? -1 : 1) * parseFloat(m[3]) }; continue; }
    if ((m = r.match(/^([a-z])\(x([+-])(\d+(?:\.\d+)?)\)$/)))
      { gname = q[1]; k = { in: (m[2] === '-' ? -1 : 1) * parseFloat(m[3]) }; continue; }
    if ((m = r.match(/^(-?\d+(?:\.\d+)?)(?:\*|cdot)?([a-z])\(x\)$/)))
      { gname = q[1]; k = { mul: parseFloat(m[1]) }; continue; }
    if ((m = r.match(/^frac(\d+)(\d+)([a-z])\(x\)$/)))
      { gname = q[1]; k = { mul: parseFloat(m[1]) / parseFloat(m[2]) }; continue; }
    if ((m = r.match(/^([a-z])\((-?\d+(?:\.\d+)?)x\)$/)))
      { gname = q[1]; k = { inmul: parseFloat(m[2]) }; continue; }
    const g = this.compile(r.replace(/cdot|times/g, '*')); if (g) f = g;
  }
  if (!f || !k) return null;
  const g = k.out !== undefined ? (x => f(x) + k.out)
          : k.in !== undefined ? (x => f(x + k.in))
          : k.mul !== undefined ? (x => k.mul * f(x))
          : (x => f(k.inmul * x));
  return { f, g, k, gname };
};
;'__duo ready';

// Choices span shifts AND dilations (f(x)+2, 2f(x), f(2x)). With two curves
// drawn, rebuild each candidate from the drawn f and keep the one that matches
// the drawn g. Works without any formula in the prompt.
window.__duo.solveTransformFromCurves = function () {
  const C = this.allCurves(); if (C.length < 2) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const dense = at => { const P = []; for (let i = 0; i <= 200; i++) { const p = at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); } return P.sort((a, b) => a[0] - b[0]); };
  const interp = P => x => { if (x < P[0][0] || x > P[P.length - 1][0]) return null;
    for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return null; };
  const cand = e => {
    const t = this.plainMath(this.choiceLatex(e));
    let m;
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\(x\)([+-])(\d+(?:\.\d+)?)$/)))
      { const k = (m[1] === '-' ? -1 : 1) * parseFloat(m[2]); return (F, x) => { const v = F(x); return v === null ? null : v + k; }; }
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\(x([+-])(\d+(?:\.\d+)?)\)$/)))
      { const k = (m[1] === '-' ? -1 : 1) * parseFloat(m[2]); return (F, x) => F(x + k); }
    if ((m = t.match(/^[a-z]\(x\)=(-?\d+(?:\.\d+)?)(?:\*|cdot)?[a-z]\(x\)$/)))
      { const k = parseFloat(m[1]); return (F, x) => { const v = F(x); return v === null ? null : k * v; }; }
    if ((m = t.match(/^[a-z]\(x\)=[a-z]\((-?\d+(?:\.\d+)?)x\)$/)))
      { const k = parseFloat(m[1]); return (F, x) => F(k * x); }
    return null;
  };
  // any drawn curve may be f or g (screens sometimes draw a third), so try
  // every ordered pair and accept only an unambiguous single match
  const pairs = [];
  for (let a = 0; a < C.length; a++) for (let b = 0; b < C.length; b++) if (a !== b) pairs.push([a, b]);
  for (const [fi, gi] of pairs) {
    const F = interp(dense(C[fi])), G = interp(dense(C[gi]));
    const hits = [];
    ch.forEach((e, i) => {
      const fn = cand(e); if (!fn) return;
      let n = 0, bad = 0;
      for (let x = -4; x <= 4; x += 0.25) {
        const want = G(x); if (want === null) continue;
        const got = fn(F, x); if (got === null) continue;
        n++; if (Math.abs(got - want) > 0.3) bad++;
      }
      if (n >= 10 && bad <= n * 0.1) hits.push(i);
    });
    if (hits.length === 1) return { i: hits[0] };
  }
  return null;
};
(function () {
  const base = window.__duo.solveTransform;
  window.__duo.solveTransform = function () {
    const r = base.call(this); if (r) return r;
    return /transformation/.test(this.curInstruction()) ? this.solveTransformFromCurves() : null;
  };
})();
;'__duo ready';

// "Create a compression factor of 0.5" states the factor itself, whereas
// "a vertical compression of 3" means a factor of 1/3. A value below 1 is
// already a factor; only whole-number compressions get inverted.
window.__duo.statedDilation = function () {
  const t = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const m = t.match(/(vertical|horizontal)?(stretch|compression|shrink|dilation)(factor)?o?f?(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?/i);
  if (!m) return null;
  let n = parseFloat(m[4]); if (m[5]) n = n / parseFloat(m[5]);
  const shrink = /compression|shrink/i.test(m[2]);
  const k = (shrink && n > 1) ? 1 / n : n;
  return { axis: (m[1] || 'vertical').toLowerCase(), k };
};
;'__duo ready';

// "The value of k in g(x) = k * f(x) is ___" — k is the stretch factor, read
// from the curves or the stated dilation.
(function () {
  const RE = /value of k|k in g\(x\)/i;
  const base = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const D = this.statedDilation();
      const k = this.stretchFactor() !== null ? this.stretchFactor() : (D ? D.k : null);
      if (k !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - k) < 0.02; });
        if (i >= 0) return { i };
      }
    }
    return base.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';
