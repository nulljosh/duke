
// ---- "Create an equivalent expression": distribute a leading minus ----
// "3y^2 - (y + 5)" -> 3y^2, -, y, +, -5   (the bank decides whether the third term
// is written as "+ -5" or "- 5", so try both spellings against the tokens).
Object.assign(window.__duo, {
  expandExpr() {
    // strip the wrapper braces too, or the trailing "}" defeats the $ anchor
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/mathbf|textbf|text|\\|~/g, '').replace(/[{}]/g, ' ').replace(/\s+/g, '');
    const m = A.match(/([^=]*?)([+-])\(([^()]*)\)\s*$/);
    if (!m) return null;
    const head = m[1].replace(/^.*?(?=[\d a-z])/, ''), sign = m[2] === '-' ? -1 : 1;
    const inner = m[3];
    const terms = (inner.match(/[+-]?[^+-]+/g) || []).map(t => t.trim()).filter(Boolean);
    const out = [head];
    for (const t of terms) {
      const neg = t.startsWith('-');
      const body = t.replace(/^[+-]/, '');
      const flip = (sign < 0) !== neg;      // resulting sign
      out.push({ sign: flip ? '-' : '+', body });
    }
    return out;
  },

  async solveEquivExpand() {
    const d = this.diagram(); if (!d || !d.M.entries) return false;
    const parts = this.expandExpr(); if (!parts || parts.length < 2) return false;
    const toks = this.bankTokens();
    const has = t => toks.find(o => o.t === t && o.el.isConnected);

    // build the slot sequence, preferring "+ -5" when a signed token exists
    const seq = [String(parts[0]).replace(/[^0-9a-z^]/g, '')];
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const signed = (p.sign === '-' ? '-' : '') + p.body;
      if (p.sign === '-' && has('-') && has(p.body)) { seq.push('-', p.body); }
      else if (has('+') && has(signed)) { seq.push('+', signed); }
      else if (has(p.sign) && has(p.body)) { seq.push(p.sign, p.body); }
      else return false;
    }
    if (seq.length !== d.M.entries.length) return false;

    const fr = () => d.f.getBoundingClientRect();
    const centre = el => {
      const r = el.getBoundingClientRect(), f = fr();
      return [Math.round(f.left + r.left + r.width / 2), Math.round(f.top + r.top + r.height / 2)];
    };
    for (let i = 0; i < seq.length; i++) {
      if (d.M.entries[i] !== null) continue;
      const tok = this.bankTokens().find(o => o.t === seq[i] && o.el.isConnected);
      // the widget drops into its first empty slot, not the cell under the pointer,
      // so aim at that one and feed the tokens strictly in order
      const idx = d.M.entries.indexOf(null);
      const cell = d.M.cellElements && d.M.cellElements[idx < 0 ? i : idx];
      if (!tok || !cell) return false;
      await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
      await this.sleep(350);
    }
    return d.M.entries.every(e => e !== null);
  },
});
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const d = this.diagram();
    if (d && d.M.entries && d.M.entries.some(e => e === null)) {
      if (this.polySum() && await this.solvePolySum()) return true;
      if (await this.solveEquivExpand()) return true;
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    const d = this.diagram();
    if (d && d.M.entries && d.M.entries.some(e => e === null)) return { kind: 'tokenslots', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// expandExpr must read the EXPRESSION line only — joining all prompt lines puts the
// header text into the leading term. Also drop "^" so "3y^2" matches the token "3y2".
window.__duo.expandExpr = function () {
  for (const line of this.promptLatex().slice().reverse()) {
    const A = this.ascii(line)
      .replace(/mathbf|textbf|text|\\|~/g, '').replace(/[{}]/g, ' ').replace(/\s+/g, '');
    const m = A.match(/^([^=]*?)([+-])\(([^()]*)\)$/);
    if (!m) continue;
    const sign = m[2] === '-' ? -1 : 1;
    const terms = (m[3].match(/[+-]?[^+-]+/g) || []).map(t => t.trim()).filter(Boolean);
    const out = [m[1].replace(/\^/g, '')];
    for (const t of terms) {
      const neg = t.startsWith('-');
      out.push({ sign: ((sign < 0) !== neg) ? '-' : '+', body: t.replace(/^[+-]/, '').replace(/\^/g, '') });
    }
    return out;
  }
  return null;
};
;'__duo ready';

// polySum only handled "(A) + (B)". Generalise to any signed sequence of groups,
// e.g. "(2x^2 + 7x + 1) - (x^2 + 3x + 4)" -> x^2 + 4x - 3.
window.__duo.polySum = function () {
  for (const line of this.promptLatex().slice().reverse()) {
    const A = this.ascii(line)
      .replace(/mathbf|textbf|text|\\|~/g, '').replace(/[{}]/g, '').replace(/\s+/g, '');
    const groups = [...A.matchAll(/([+-])?\(([^()]*)\)/g)];
    if (groups.length < 2) continue;
    const acc = {}; let bad = false;
    groups.forEach((g, gi) => {
      const gs = (gi === 0 ? 1 : (g[1] === '-' ? -1 : 1));
      for (const raw of (g[2].match(/[+-]?[^+-]+/g) || [])) {
        const t = raw.trim(); if (!t) continue;
        const v = (g[2].match(/[a-z]/) || ['x'])[0];
        const m = t.match(new RegExp('^([+-]?)(\\d*)(?:' + v + '(?:\\^?(\\d+))?)?$'));
        if (!m) { bad = true; return; }
        const sign = m[1] === '-' ? -1 : 1;
        const coef = m[2] === '' ? 1 : +m[2];
        const deg = new RegExp(v).test(t) ? (m[3] ? +m[3] : 1) : 0;
        acc[deg] = (acc[deg] || 0) + gs * sign * coef;
      }
    });
    if (!bad && Object.keys(acc).length) return acc;
  }
  return null;
};

// build the slot sequence from the combined polynomial, using "-" when the bank has
// one (the tokens decide whether a negative term is "+ -3" or "- 3")
;'__duo ready';

// ---- factor pairs (unit 155) ----
// "Find the factor pairs of 15" with choices like "3 and 5" — usually multi-select,
// so return every pair whose product matches.
window.__duo.solveFactorPairs = function () {
  const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
  const m = A.match(/factor pairs? of\s*(-?\d+)/i) || A.match(/factors? of\s*(-?\d+)/i);
  if (!m) return null;
  const n = Math.abs(+m[1]);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ch.map(e => this.ascii(e.innerText));
  const idx = [];
  S.forEach((s, i) => {
    const ns = (s.match(/\d+/g) || []).map(Number);
    // innerText is doubled, so take the first two numbers
    if (ns.length >= 2 && ns[0] * ns[1] === n) idx.push(i);
  });
  return idx.length ? { ok: true, idx } : null;
};


// choice innerText is doubled ("(x+3)(x+5)" comes back twice), which broke the
// \duoblank string match whenever the choices had no LaTeX annotations
(function () {
  const half = s => {
    const t = String(s);
    return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2))
      ? t.slice(0, t.length / 2) : t;
  };
  const base = window.__duo.solveBlankChoice;
  window.__duo.solveBlankChoice = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const raw = this.blankRaw(); if (!raw) return r;
    const norm = s => half(this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/[~\s{}]/g, ''));
    const want = norm(raw);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const i = ch.findIndex(e => norm(e.innerText) === want);
    return i < 0 ? r : { i, want };
  };
})();
;'__duo ready';

// The guided text accumulates, so "Find the factor pairs of 15" was still present
// when the question had moved on to writing the factored form — and the factor-pair
// branch hijacked it. Gate on the CHOICES looking like "a and b".


// \duoblank{} carries the answer verbatim, so when it resolves to exactly one choice
// it must WIN over everything else. An older multi-select path was returning
// idx:[0,1] here — selecting both, which toggles down to the wrong one.


// ---- algebraic equivalence (unit 155: expand / factor) ----
// Any "which of these equals this expression" question — factored vs expanded,
// either direction — is answered by evaluating both at a few sample values and
// comparing. One rule instead of a solver per form.
window.__duo.solveAlgEquiv = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const half = s => {
    const t = String(s).replace(/\s/g, '');
    return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t;
  };
  const S = ann.length === ch.length ? ann : ch.map(e => half(this.ascii(e.innerText)));

  const sample = f => { try { return [f(2), f(3), f(5)].map(v => Math.round(v * 1e6) / 1e6).join('|'); } catch (e) { return null; } };
  const fns = S.map(s => this.compile(s));
  if (fns.filter(Boolean).length < 2) return null;
  const sigs = fns.map(f => f ? sample(f) : null);

  // the source expression: the last prompt line that compiles and is not a choice
  let want = null;
  for (const line of this.promptLatex().slice().reverse()) {
    const t = this.ascii(line);
    if (!/[a-z]/.test(t) || /select|which|choose|match/i.test(t)) continue;
    const f = this.compile(line); if (!f) continue;
    const sg = sample(f); if (!sg) continue;
    // ignore a line that is itself one of the choices
    if (sigs.includes(sg) && sigs.filter(x => x === sg).length === 1 && S.some(s => this.ascii(s).replace(/\s/g,'') === t.replace(/\s/g,''))) continue;
    want = sg; break;
  }
  if (!want) return null;
  const hits = [];
  sigs.forEach((s, i) => { if (s && s === want) hits.push(i); });
  return hits.length === 1 ? { i: hits[0], want } : null;
};
window.__duo.RULES.splice(2, 0, ['solveAlgEquiv', null]);
;'__duo ready';

// "Create the standard form" of a product: expand (x+4)(x+6) -> x^2 + 10x + 24 and
// fill the token slots. Reuses the slot-filling logic; only the coefficients differ.
window.__duo.polyExpand = function () {
  for (const line of this.promptLatex().slice().reverse()) {
    const A = this.ascii(line)
      .replace(/mathbf|textbf|text|\\|~/g, '').replace(/[{}]/g, '').replace(/\s+/g, '');
    const m = A.match(/^\(([^()]*)\)\(([^()]*)\)$/);
    if (!m) continue;
    const v = (A.match(/[a-z]/) || ['x'])[0];
    const lin = s => {
      const mm = s.match(new RegExp('^([+-]?\\d*)' + v + '([+-]\\d+)?$'));
      if (!mm) return null;
      const a = mm[1] === '' || mm[1] === '+' ? 1 : (mm[1] === '-' ? -1 : +mm[1]);
      return { a, b: mm[2] ? +mm[2] : 0 };
    };
    const p = lin(m[1]), q = lin(m[2]);
    if (!p || !q) continue;
    return { 2: p.a * q.a, 1: p.a * q.b + p.b * q.a, 0: p.b * q.b, v };
  }
  return null;
};
(function () {
  const base = window.__duo.polySum;
  window.__duo.polySum = function () {
    const r = base.call(this);
    if (r) return r;
    const e = this.polyExpand();
    if (!e) return null;
    const { v, ...acc } = e;
    return acc;
  };
})();
;'__duo ready';

// adjacent groups "(x+4)(x+6)" are a PRODUCT; the sum parser was matching them as
// "(A) (B)" and returning A+B. Expansion must be tried first.
(function () {
  const base = window.__duo.polySum;
  window.__duo.polySum = function () {
    const e = this.polyExpand();
    if (e) { const { v, ...acc } = e; return acc; }
    return base.call(this);
  };
})();
;'__duo ready';

// With REAL drags the token lands in the slot under the pointer, so aim at the
// intended slot (cellElements[i]) — not at "the first empty one", which reorders
// the answer as earlier slots fill.
window.__duo.solvePolySum = async function () {
  const d = this.diagram(); if (!d || !d.M.entries) return false;
  const acc = this.polySum(); if (!acc) return false;
  const degs = Object.keys(acc).map(Number).filter(k => acc[k] !== 0).sort((a, b) => b - a);
  if (!degs.length) return false;
  let v = 'x';
  for (const line of this.promptLatex().slice().reverse()) {
    const g = this.ascii(line).match(/\(([^()]*)\)/);
    if (g) { v = (g[1].match(/[a-z]/) || ['x'])[0]; break; }
  }
  const term = k => {
    const c = Math.abs(acc[k]);
    return k === 0 ? String(c) : (c === 1 ? '' : String(c)) + v + (k > 1 ? String(k) : '');
  };
  const toks = () => this.bankTokens();
  const has = t => toks().some(o => o.t === t && o.el.isConnected);
  const seq = [(acc[degs[0]] < 0 ? '-' : '') + term(degs[0])];
  for (let i = 1; i < degs.length; i++) {
    const k = degs[i], neg = acc[k] < 0;
    if (neg && has('-') && has(term(k))) seq.push('-', term(k));
    else if (has('+') && has((neg ? '-' : '') + term(k))) seq.push('+', (neg ? '-' : '') + term(k));
    else if (has(neg ? '-' : '+') && has(term(k))) seq.push(neg ? '-' : '+', term(k));
    else return false;
  }
  if (seq.length !== d.M.entries.length) return false;

  const centre = el => {
    const r = el.getBoundingClientRect(), f = d.f.getBoundingClientRect();
    return [Math.round(f.left + r.left + r.width / 2), Math.round(f.top + r.top + r.height / 2)];
  };
  for (let i = 0; i < seq.length; i++) {
    if (d.M.entries[i] !== null) continue;
    const tok = toks().find(o => o.t === seq[i] && o.el.isConnected);
    const cell = d.M.cellElements && d.M.cellElements[i];
    if (!tok || !cell) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
    await this.sleep(340);
  }
  return d.M.entries.every(e => e !== null);
};
;'__duo ready';

// "Find factors of 12 that add to 7" — pair choices like (2,6) / (3,4). Needs both
// the product AND the sum, so the plain factor-pair rule picks the wrong one.
window.__duo.solveFactorSum = function () {
  const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ');
  const mp = A.match(/factors of\s*(-?\d+)/i) || A.match(/ac\s*=\s*(-?\d+)/i);
  const ms = A.match(/add(?:s)? to\s*(-?\d+)/i) || A.match(/b\s*=\s*(-?\d+)/i);
  if (!mp || !ms) return null;
  const prod = +mp[1], sum = +ms[1];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const i = ch.findIndex(e => {
    const ns = (half(this.ascii(e.innerText)).match(/-?\d+/g) || []).map(Number);
    return ns.length >= 2 && ns[0] * ns[1] === prod && ns[0] + ns[1] === sum;
  });
  return i < 0 ? { miss: prod + '/' + sum } : { i, want: prod + '/' + sum };
};
window.__duo.RULES.splice(2, 0, ['solveFactorSum', null]);
;'__duo ready';

// ---- second differences (unit 156: quadratic sequences) ----
// "Select the constant second difference between the outputs": read the output
// column from the table and difference it twice.
window.__duo.solveSecondDiff = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  const wantSecond = /second difference/.test(A);
  const wantFirst = /first difference/.test(A);
  if (!wantSecond && !wantFirst) return null;
  let ys = null;
  const T = this.fnTable();
  if (T && T.length >= 3) ys = T.map(r => r[1]);
  if (!ys) {
    const d = this.diagram();
    if (d && d.M.rows) ys = d.M.rows.map(r => parseFloat(this.ascii(String(r[1]))));
  }
  if (!ys || ys.length < 3 || ys.some(v => isNaN(v))) return null;
  const d1 = ys.slice(1).map((v, i) => v - ys[i]);
  const want = wantFirst ? d1[0] : d1.slice(1).map((v, i) => v - d1[i])[0];
  if (want === undefined || !isFinite(want)) return null;
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => parseFloat(half(this.ascii(e.innerText))) === want);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveSecondDiff', /difference/i]);
;'__duo ready';

// "Select the differences between the outputs" — the choice is the whole list of
// first differences, not a single value.
window.__duo.solveDiffList = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/differences? between the outputs|the differences/.test(A)) return null;
  const T = this.fnTable(); if (!T || T.length < 3) return null;
  const ys = T.map(r => r[1]);
  const second = /second difference/.test(A);
  let d = ys.slice(1).map((v, i) => v - ys[i]);
  if (second) d = d.slice(1).map((v, i) => v - d[i]);
  const key = a => a.join(',');
  const want = key(d);
  const half = s => { const t = s.replace(/\s/g, ''); return (t.length % 2 === 0 && t.slice(0, t.length / 2) === t.slice(t.length / 2)) ? t.slice(0, t.length / 2) : t; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => {
    const ns = (half(this.ascii(e.innerText)).match(/-?\d+/g) || []).map(Number);
    return key(ns) === want;
  });
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveDiffList', /difference/i]);
;'__duo ready';
