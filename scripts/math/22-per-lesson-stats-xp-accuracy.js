
// ---- per-lesson stats (XP, accuracy) ----
// Reads totalXp from the user API either side of the lesson and records the delta,
// so each finished lesson gets a line: unit/level, correct, wrong, XP gained.
(function () {
  const base = window.__duo.autoLesson;
  window.__duo.autoLesson = async function () {
    const uid = (() => {
      try {
        const m = document.cookie.match(/jwt_token=([^;]+)/);
        return m ? JSON.parse(atob(m[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub : null;
      } catch (e) { return null; }
    })();
    const xp = async () => {
      if (!uid) return null;
      try {
        const r = await fetch('/2017-06-30/users/' + uid + '?fields=totalXp,streak', { credentials: 'include' });
        const j = await r.json();
        return { xp: j.totalXp, streak: j.streak };
      } catch (e) { return null; }
    };
    const st0 = JSON.parse(localStorage.getItem('duoAuto'));
    const before = await xp();
    const r = await base.call(this);
    const after = await xp();
    const wrong = this.S.log.filter(x => x === 'incorrect').length;
    const rec = {
      unit: st0.unit, level: st0.level,
      correct: this.S.done, wrong,
      xp: (before && after) ? (after.xp - before.xp) : null,
      totalXp: after ? after.xp : null,
      streak: after ? after.streak : null,
      done: r.ok, at: new Date().toISOString().slice(11, 19),
    };
    const st = JSON.parse(localStorage.getItem('duoAuto'));
    st.stats = (st.stats || []).concat([rec]).slice(-60);
    localStorage.setItem('duoAuto', JSON.stringify(st));
    return Object.assign(r, { rec });
  };
})();
window.__duo.statsLine = function () {
  const st = JSON.parse(localStorage.getItem('duoAuto') || '{}');
  const s = st.stats || [];
  const tot = s.reduce((a, r) => a + (r.xp || 0), 0);
  return s.slice(-8).map(r =>
    'u' + r.unit + 'l' + r.level + ' ' + r.correct + '✓/' + r.wrong + '✗'
    + ' +' + (r.xp === null ? '?' : r.xp) + 'xp' + (r.done ? '' : ' (halted)')
  ).join('\n') + '\nsession XP total: ' + tot
    + (s.length && s[s.length - 1].totalXp ? ' | lifetime ' + s[s.length - 1].totalXp : '')
    + (s.length && s[s.length - 1].streak ? ' | streak ' + s[s.length - 1].streak : '');
};
;'__duo ready';

// ---- radicals as fractional exponents (unit 150) ----
// \sqrt[8]{b} == b^{1/8}. Teach compile() the n-th root form, then match choices by
// evaluating both at sample bases.
(function () {
  const base = window.__duo.compile;
  window.__duo.compile = function (src) {
    let t = this.ascii(src);
    // \sqrt[n]{expr} -> (expr)**(1/n)   (do this before the plain \sqrt rule)
    for (let i = 0; i < 4; i++) {
      t = t.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, '(($2)**(1/($1)))');
    }
    return base.call(this, t);
  };
})();
window.__duo.solveRadicalMatch = function () {
  let want = null;
  for (const s of this.promptLatex().slice().reverse()) {
    if (/select|match|which/i.test(this.ascii(s)) && !/sqrt|\^/.test(this.ascii(s))) continue;
    const f = this.compile(s);
    if (!f) continue;
    try { const a = f(2), b = f(3); if (isFinite(a) && isFinite(b)) { want = a + '|' + b; break; } } catch (e) {}
  }
  if (!want) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const hits = [];
  S.forEach((s, i) => {
    const f = this.compile(s); if (!f) return;
    try {
      const a = f(2), b = f(3);
      if (isFinite(a) && isFinite(b) && Math.abs(a - +want.split('|')[0]) < 1e-9
          && Math.abs(b - +want.split('|')[1]) < 1e-9) hits.push(i);
    } catch (e) {}
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.splice(2, 0, ['solveRadicalMatch', null]);
;'__duo ready';

// compile() is a function of x, but the questions use whatever letter they like
// (b, n, t). Rewrite any lone single letter to x before compiling; letters inside
// Math.sqrt / Math.abs are safe because they sit next to other letters.
(function () {
  const base = window.__duo.compile;
  window.__duo.compile = function (src) {
    const f = base.call(this, src);
    if (f) return f;
    const t = this.ascii(src).replace(/(?<![A-Za-z.])[a-z](?![A-Za-z])/g, 'x');
    return t === this.ascii(src) ? null : base.call(this, t);
  };
})();
;'__duo ready';

// typed answers where \duoblank{} holds the value — including a fraction, which is
// typed as "3/10" rather than as LaTeX


// ---- simplify radicals (unit 150 L4) ----
// Guided steps: largest perfect-square factor, then the split, then the result.
Object.assign(window.__duo, {
  radicand() {
    for (const s of this.promptLatex().slice().reverse()) {
      const m = this.ascii(s).replace(/[~\s]/g, '').match(/\\sqrt\{(\d+)\}/);
      if (m) return +m[1];
    }
    return null;
  },
  largestSquareFactor(n) {
    let best = 1;
    for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) best = k * k;
    return best;
  },
  solveRadicalStep() {
    const n = this.radicand(); if (!n) return null;
    // the instruction sits in an earlier latex line; prompt() returns the last
    // text-bearing one, which here is the list of factors
    const P = this.ascii(this.promptLatex().join(' '))
      .replace(/mathbf|textbf|text|\\|\{|\}|~/g, ' ').toLowerCase();
    const sq = this.largestSquareFactor(n);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const num = s => { const v = parseFloat(this.clean(s)); return isNaN(v) ? null : v; };

    if (/perfect square factor/i.test(P)) {
      const i = S.findIndex(s => num(s) === sq);
      return i < 0 ? { miss: sq } : { i, want: sq };
    }
    if (/square root of|take the square root/i.test(P)) {
      const i = S.findIndex(s => num(s) === Math.sqrt(sq));
      return i < 0 ? { miss: Math.sqrt(sq) } : { i, want: Math.sqrt(sq) };
    }
    // otherwise: match a choice that equals sqrt(n) numerically
    const hits = [];
    S.forEach((s, i) => {
      const f = this.compile(s);
      if (!f) return;
      try { const v = f(1); if (isFinite(v) && Math.abs(v - Math.sqrt(n)) < 1e-9) hits.push(i); } catch (e) {}
    });
    return hits.length === 1 ? { i: hits[0] } : null;
  },
});
window.__duo.RULES.splice(2, 0, ['solveRadicalStep', /radical|perfect square|square root/i]);
;'__duo ready';

// Guided radical steps: gate on the SHAPE of the choices, not on the prompt text —
// the text accumulates across steps, so "largest perfect square factor" is still
// present when the question has moved on to the split.
window.__duo.solveRadicalStep = function () {
  const n = this.radicand(); if (!n) return null;
  const sq = this.largestSquareFactor(n);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/[~\s]/g, ''));

  // a·b split: pick the pair containing the largest perfect square
  if (S.every(s => /\\cdot|·|\*/.test(s))) {
    const i = S.findIndex(s => {
      const ns = (s.match(/\d+/g) || []).map(Number);
      return ns.includes(sq) && ns.length >= 2 && ns.reduce((a, b) => a * b, 1) % n === 0;
    });
    return i < 0 ? { miss: 'split' + sq } : { i, want: 'split' + sq };
  }
  // plain integers: the perfect-square factor, or its root
  if (S.every(s => /^-?\d+$/.test(s.replace(/[{}]/g, '')))) {
    const vals = S.map(s => parseFloat(s.replace(/[{}]/g, '')));
    let i = vals.indexOf(sq);
    if (i < 0) i = vals.indexOf(Math.sqrt(sq));
    return i < 0 ? { miss: sq } : { i, want: sq };
  }
  // otherwise pick whatever evaluates to sqrt(n)
  const hits = [];
  S.forEach((s, i) => {
    const f = this.compile(s); if (!f) return;
    try { const v = f(1); if (isFinite(v) && Math.abs(v - Math.sqrt(n)) < 1e-9) hits.push(i); } catch (e) {}
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
;'__duo ready';

// implicit multiplication before a function call: "4\sqrt{3}" becomes
// "4Math.sqrt(3)", which is a syntax error and made every coefficient-times-radical
// choice uncompilable
(function () {
  const base = window.__duo.compile;
  window.__duo.compile = function (src) {
    const f = base.call(this, src);
    if (f) return f;
    let t = this.ascii(src)
      .replace(/\\times|\\cdot/g, '*')
      .replace(/(\d)\s*(\\sqrt|\\frac)/g, '$1*$2');
    return t === this.ascii(src) ? null : base.call(this, t);
  };
})();
;'__duo ready';

// radicand() scanned in reverse and so picked the \sqrt{3} from the working rather
// than the \sqrt{12} the question started from. Take the FIRST one.
window.__duo.radicand = function () {
  for (const s of this.promptLatex()) {
    const m = this.ascii(s).replace(/[~\s]/g, '').match(/\\sqrt\{(\d+)\}/);
    if (m) return +m[1];
  }
  return null;
};
;'__duo ready';

// ---- combine like radicals (unit 151) ----
// "4\sqrt{11} + 5\sqrt{11}" -> "(4 + 5)\sqrt{11}". The distractor changes the
// radicand, so the answer is the choice that keeps the LIVE expression's radicand
// (the guided text also contains an earlier worked example — take the last match).
window.__duo.solveLikeRadicals = function () {
  const lines = this.promptLatex().map(s => this.ascii(s).replace(/[~\s]/g, ''));
  let r = null;
  for (const s of lines) {
    const m = s.match(/(-?\d*)\\sqrt\{(\d+)\}[+-](-?\d*)\\sqrt\{(\d+)\}/);
    if (m && m[2] === m[4]) r = m[2];
  }
  if (!r) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const hits = [];
  S.forEach((s, i) => { if (new RegExp('\\\\sqrt\\{' + r + '\\}').test(this.ascii(s).replace(/[~\s]/g, ''))) hits.push(i); });
  return hits.length === 1 ? { i: hits[0], want: r } : null;
};
window.__duo.RULES.splice(2, 0, ['solveLikeRadicals', null]);
;'__duo ready';

// "largest perfect square factor" where the choices carry variables: a term is a
// perfect square when its coefficient is one AND every exponent is even.
window.__duo.solvePerfectSquareTerm = function () {
  const A = this.ascii(this.promptLatex().join(' ')).toLowerCase();
  if (!/perfect square/.test(A)) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
    .map(s => this.ascii(s).replace(/\\(mathbf|textbf|text)\s*/g, '').replace(/[~\s{}]/g, ''));
  const isSquare = s => {
    const co = s.match(/^(\d+)/);
    if (co && Math.sqrt(+co[1]) % 1 !== 0) return false;
    const exps = [...s.matchAll(/\^(-?\d+)/g)].map(m => +m[1]);
    if (exps.some(e => e % 2 !== 0)) return false;
    // a bare variable with no exponent is x^1, not a square
    if (/[a-z](?!\^)/.test(s.replace(/\^\d+/g, ''))) return false;
    return true;
  };
  const hits = []; S.forEach((s, i) => { if (isSquare(s)) hits.push(i); });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.splice(2, 0, ['solvePerfectSquareTerm', /perfect square/i]);
;'__duo ready';

// "Complete the pattern" where the rule is standard form -> slope-intercept
(function () {
  const base = window.__duo.solveSlopePattern;
  window.__duo.solveSlopePattern = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const L = this.promptLatex().map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~/g, '').replace(/\s+/g, ''));
    const qi = L.findIndex(s => s === '?' || s === '');
    if (qi < 1) return r;
    const mb = this.lineMB(this.promptLatex()[qi - 1]);
    if (!mb) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const i = S.findIndex(s => {
      const v = this.lineMB(s);
      return v && Math.abs(v[0] - mb[0]) < 1e-9 && Math.abs(v[1] - mb[1]) < 1e-9;
    });
    return i < 0 ? r : { i, want: mb.join(',') };
  };
})();
;'__duo ready';

// ---- polynomial sum via the token-slot widget (unit 154) ----
// A third mathDiagram shape: `entries` is a flat list of slots and the tokens hang
// off `tokenBank.tokenSlots` as slot.__token. Drops go through
// handleCellDrop(index, value, tokenEl), the same call the real drag makes.
Object.assign(window.__duo, {
  bankTokens() {
    const d = this.diagram(); if (!d || !d.M.tokenBank) return [];
    let slots = d.M.tokenBank.tokenSlots;
    slots = Array.isArray(slots) ? slots : [...slots];
    return slots.map(s => ({ el: s.__token, t: this.ascii(String((s.__token && s.__token.textContent) || '')).trim() }))
      .filter(o => o.el && o.t);
  },

  // "(6x^2 + 4x + 3) + (x^2 + 5x + 5)" -> {2:7, 1:9, 0:8}
  polySum() {
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|~/g, '').replace(/\s+/g, '');
    const groups = A.match(/\(([^()]*)\)/g);
    if (!groups || groups.length < 2) return null;
    const acc = {};
    for (const g of groups) {
      const body = g.slice(1, -1);
      const terms = body.match(/[+-]?[^+-]+/g) || [];
      for (const raw of terms) {
        const t = raw.replace(/\s/g, ''); if (!t) continue;
        // the variable is not always x — these questions use y, t, n as well
        const v = (body.match(/[a-z]/) || ['x'])[0];
        const m = t.match(new RegExp('^([+-]?)(\\d*)(?:' + v + '(?:\\^(\\d+))?)?$'));
        if (!m) return null;
        const sign = m[1] === '-' ? -1 : 1;
        const coef = m[2] === '' ? 1 : +m[2];
        const deg = new RegExp(v).test(t) ? (m[3] ? +m[3] : 1) : 0;
        acc[deg] = (acc[deg] || 0) + sign * coef;
      }
    }
    return acc;
  },

  async solvePolySum() {
    const d = this.diagram(); if (!d || !d.M.entries || !d.M.handleCellDrop) return false;
    const acc = this.polySum(); if (!acc) return false;
    const degs = Object.keys(acc).map(Number).filter(k => acc[k] !== 0).sort((a, b) => b - a);
    const va = (this.ascii(this.promptLatex().join(' ')).match(/\(([^()]*)\)/) || [])[1] || '';
    const v = (va.match(/[a-z]/) || ['x'])[0];
    const fmt = k => (k === 0 ? String(acc[k]) : (acc[k] === 1 ? '' : String(acc[k])) + v + (k > 1 ? String(k) : ''));
    const want = [];
    degs.forEach((k, i) => { if (i) want.push('+'); want.push(fmt(k)); });
    if (want.length !== d.M.entries.length) return false;
    const used = new Set();
    for (let i = 0; i < want.length; i++) {
      if (d.M.entries[i] !== null) continue;
      const tok = this.bankTokens().find((o, j) => !used.has(o.el) && o.t === want[i]);
      if (!tok) return false;
      used.add(tok.el);
      try { d.M.handleCellDrop(i, tok.t, tok.el); } catch (e) { return false; }
      await this.sleep(320);
    }
    return d.M.entries.every(e => e !== null);
  },
});
(function () {
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const d = this.diagram();
    if (d && d.M.entries && d.M.entries.some(e => e === null) && this.polySum()) {
      if (await this.solvePolySum()) return true;
    }
    return await baseDrag.call(this);
  };
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    const d = this.diagram();
    if (d && d.M.entries && d.M.entries.some(e => e === null) && this.polySum())
      return { kind: 'polysum', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// IMPORTANT: writing the model directly (handleCellDrop / setCellValue) fills
// `entries` and even updates the DOM, but the answer is still graded WRONG — the
// grader reads state that only a genuine drag produces. Drag the token element onto
// the cell element instead, reusing dragXY (the same mechanism that works for
// sliders and points).
;'__duo ready';
