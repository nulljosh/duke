
// ---- TIMED match-the-pairs lessons ----
// Two things matter here:
//  1. Pairs AUTO-ADVANCE when all are matched — there is no CHECK to press and
//     no blame to read, so the normal run2 loop bails out with "noblame".
//  2. The default ~350ms sleeps are far too slow for a 2-minute timer; the
//     first attempt solved 20 pairs and still ran out. ~90/130ms lands the star.
Object.assign(window.__duo, {
  // pairs can be plain ARITHMETIC (5·4 = 20) as well as exponent laws
  tokenExp(el) {
    let s = null;
    if (el && el.querySelector) { const a = el.querySelector('annotation'); if (a) s = a.textContent; }
    if (s === null) s = (typeof el === 'string') ? el : (el.innerText || '');
    const v = this.expValue(s); if (v !== null) return v;
    const t = this.ascii(s).replace(/\s/g, '').replace(/[\\{}]|mathbf|textbf|left|right/g, '')
      .replace(/cdot|[⋅·×]/g, '*').replace(/[÷]/g, '/');
    if (!/^[-+*/^().\d]+$/.test(t)) return null;
    try { const r = Function('"use strict";return(' + t.replace(/(\d+)\^(\d+)/g, 'Math.pow($1,$2)') + ')')();
      return typeof r === 'number' && isFinite(r) ? r : null; } catch (e) { return null; }
  },

  async solvePairs() {
    const tok = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    if (tok.length < 4) return null;
    const vals = tok.map(e => this.tokenExp(e));
    const used = new Set(); let n = 0;
    for (let i = 0; i < tok.length; i++) {
      if (used.has(i) || vals[i] === null) continue;
      for (let j = i + 1; j < tok.length; j++) {
        if (used.has(j) || vals[j] === null) continue;
        if (vals[i] === vals[j]) { used.add(i); used.add(j);
          this.tap(tok[i]); await this.sleep(90); this.tap(tok[j]); await this.sleep(130); n++; break; }
      }
    }
    return { pairs: n, vals };
  },

  async runPairs(n) {
    this.S = { running: true, log: [], done: 0 };
    for (let i = 0; i < n && this.S.running; i++) {
      const tok = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
      if (tok.length >= 4) { const p = await this.solvePairs();
        this.S.log.push('p' + (p ? p.pairs : 0)); this.S.done++; await this.sleep(650); continue; }
      const r = this.read();
      if (!r.type) { this.S.log.push('done'); break; }
      let acted = false;
      if (r.choices.length) { const s = this.solveChoices();
        if (s && s.ok) { s.idx.forEach(j => this.tap(document.querySelectorAll('[data-test="challenge-choice"]')[j])); acted = true; } }
      else if (r.input) { acted = !!this.typeAnswer(); }
      const n0 = document.querySelector('[data-test="player-next"]');
      if (!acted && n0 && !/disabled/i.test(n0.className)) { this.tap(n0); await this.sleep(700); this.S.log.push('i'); continue; }
      if (!acted) { this.S.log.push('stuck'); break; }
      await this.sleep(160);
      this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(900);
      const bl = ((document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test || '').replace('blame blame-', '');
      this.S.log.push(bl ? bl[0] : '-');
      const nx = document.querySelector('[data-test="player-next"]');
      if (nx && /CONTINUE/i.test(nx.innerText)) { this.tap(nx); await this.sleep(800); }
    }
    this.S.running = false;
    return this.S;
  },
});

;'__duo ready';

// ---- word phrases to algebra (unit 137) ----
Object.assign(window.__duo, {
  // "Translate the next part." is a generic instruction — the phrase to
  // translate is the last CONTENT line that isn't an instruction or praise
  phraseSource() {
    const L = this.promptLatex().map(s =>
      this.ascii(s).replace(/[{}\\]|mathbf|textbf|text/g, '').replace(/~/g, ' ').trim());
    const skip = /^(translate|select|great|right|awesome|nice|let'?s|you just|write an equation)/i;
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i];
      if (!s || skip.test(s)) continue;
      if (/[a-z]{3,}/i.test(s)) return s.toLowerCase();
    }
    return this.prompt();
  },

  term(s) {
    const t = this.ascii(s).toLowerCase().replace(/\s+/g, '').replace(/\.$/, '');
    if (/^twice.*number$|^double.*number$/.test(t)) return '2x';
    if (/^anumber$|^x$/.test(t)) return 'x';
    if (/^\d+x$/.test(t)) return t;
    if (/^-?\d+(\.\d+)?$/.test(t)) return t;
    const m = t.match(/^(\d+)timesanumber$/); if (m) return m[1] + 'x';
    return null;
  },

  phraseExpr(P) {
    const t = this.ascii(P).toLowerCase().replace(/\s+/g, ' ').trim();
    // "the sum/difference/product/quotient of A and B"
    let m = t.match(/\b(sum|difference|product|quotient) of (.+?) and (.+?)\.?$/);
    if (m) { const A = this.term(m[2]), B = this.term(m[3]);
      if (A && B) return A + { sum: '+', difference: '-', product: '*', quotient: '/' }[m[1]] + B; }
    // word multipliers
    if (/\btwice\b|\bdouble\b/.test(t)) return '2x';
    if (/\btriple\b|\bthrice\b/.test(t)) return '3x';
    if (/\bhalf\b/.test(t)) return 'x/2';
    if (/\bsquare(d)?\b/.test(t)) return 'x^2';
    // "N less/more than <expr>" REVERSES the order: 8 less than 4x -> 4x-8
    m = t.match(/(-?\d+(?:\.\d+)?)\s*(less than|more than|greater than)\s*(.+)/);
    if (m) { const n = m[1], rest = m[3].replace(/\s+/g, '')
        .replace(/timesanumber/, 'x').replace(/anumber/, 'x');
      return /less/.test(m[2]) ? (rest + '-' + n) : (rest + '+' + n); }
    const n = (t.match(/(-?\d+(?:\.\d+)?)/) || [])[1];
    if (n === undefined) return null;
    if (/times|product|multiplied/.test(t)) return n + 'x';
    if (/divided by|quotient/.test(t)) return /number divided by/.test(t) ? ('x/' + n) : (n + '/x');
    if (/more than|increased by|added to|sum|plus/.test(t)) return 'x+' + n;
    if (/less than|decreased by|subtracted from|fewer|minus/.test(t)) return 'x-' + n;
    return null;
  },

  // full sentence: "<expr> is N" is an EQUATION; "at most/least" an inequality
  phraseEq(P) {
    const t = this.ascii(P).toLowerCase().replace(/\s+/g, ' ').trim();
    const m = t.match(/^(.*?)\s+(is at most|is at least|is less than|is greater than|is|equals)\s+(-?\d+(?:\.\d+)?)\s*\.?$/);
    if (!m) return null;
    const lhs = this.phraseExpr(m[1]); if (!lhs) return null;
    const op = { 'is': '=', 'equals': '=', 'is at most': '<=', 'is at least': '>=',
                 'is less than': '<', 'is greater than': '>' }[m[2]];
    return lhs + op + m[3];
  },

  solvePhrase() {
    const P = this.phraseSource();
    const want = this.phraseEq(P) || this.phraseExpr(P); if (!want) return null;
    const norm = s => this.ascii(s).replace(/\s|\\|mathbf|textbf|\{|\}|cdot|left|right/g, '')
      .replace(/leq/g, '<=').replace(/geq/g, '>=').toLowerCase();
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.norm(this.ascii(e.innerText)));
    let i = src.findIndex(s => norm(s) === want.replace(/\*/g, ''));
    if (i < 0) i = src.findIndex(s => norm(s) === want);
    return i < 0 ? { miss: want } : { i, want };
  },
});

window.__duo.RULES.splice(2, 0, ['solvePhrase', null]);

;'__duo ready';

// "N fewer than EXPR" reverses like "less than" — without it the generic branch
// loses the coefficient (gave x-8 where the answer was 6x-8)
(function () {
  const prev = window.__duo.phraseExpr;
  window.__duo.phraseExpr = function (P) {
    const t = this.ascii(P).toLowerCase().replace(/\s+/g, ' ').trim();
    const m = t.match(/(-?\d+(?:\.\d+)?)\s*(fewer than|less than|more than|greater than)\s*(.+)/);
    if (m) { const rest = m[3].replace(/\s+/g, '').replace(/timesanumber/, 'x').replace(/anumber/, 'x');
      return /fewer|less/.test(m[2]) ? (rest + '-' + m[1]) : (rest + '+' + m[1]); }
    return prev.call(this, P);
  };
})();

Object.assign(window.__duo, {
  // "Select the variable term / coefficient of x / constant" — the coefficient
  // must come from the EXPRESSION, not just any number among the choices
  solveTermPart() {
    const P = this.prompt();
    const kind = /variable term/i.test(P) ? 'var' : (/coefficient/i.test(P) ? 'coef' : (/constant/i.test(P) ? 'const' : null));
    if (!kind) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const N = s => this.ascii(s).replace(/\s|\\|mathbf|textbf|\{|\}/g, '');
    if (kind === 'var') { const i = src.findIndex(s => /\d*[a-z]/i.test(N(s)));
      return i < 0 ? null : { i, want: N(src[i]) }; }
    let expr = null;
    for (const s of this.promptLatex()) { const t = N(s);
      if (/[a-z]/i.test(t) && /\d/.test(t) && !/select|the|of/i.test(t)) { expr = t; break; } }
    if (!expr) return null;
    let want = null;
    if (kind === 'coef') { const m = expr.match(/(-?\d*)[a-z]/i);
      if (m) want = (m[1] === '' || m[1] === '+') ? 1 : (m[1] === '-' ? -1 : +m[1]); }
    else { const m = expr.match(/[a-z]\s*([+-]\s*\d+)/i); if (m) want = +m[1].replace(/\s/g, ''); }
    if (want === null) return null;
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  // generic table pattern: infer the rule from the completed rows, apply to "?"
  solvePatternRule() {
    const L = this.promptLatex().map(s => this.ascii(s).replace(/\s|[{}\\]|mathbf|textbf|text/g, ''));
    const q = L.findIndex(s => s === '?'); if (q < 1) return null;
    const src = L[q - 1];
    const pairs = [];
    for (let i = 1; i < L.length - 1; i++) { if (i === q || i === q - 1) continue;
      if (/^-?\d+$/.test(L[i + 1]) && /[a-z]/i.test(L[i])) pairs.push([L[i], +L[i + 1]]); }
    const coef = s => { const m = s.match(/(-?\d*)[a-z]/i);
      return m ? ((m[1] === '' || m[1] === '+') ? 1 : (m[1] === '-' ? -1 : +m[1])) : null; };
    const konst = s => { const m = s.match(/[a-z]\s*([+-]\s*\d+)/i); return m ? +m[1].replace(/\s/g, '') : null; };
    const rhs = s => { const m = s.match(/=(-?\d+)/); return m ? +m[1] : null; };
    for (const fn of [coef, konst, rhs]) {
      if (pairs.length && pairs.every(([inp, out]) => fn(inp) === out)) {
        const want = fn(src); if (want === null) continue;
        const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = c.findIndex(e => this.clean(e.innerText) === String(want));
        if (i >= 0) return { i, want };
      }
    }
    return null;
  },
});

// pairs can also match an EQUATION to its coefficient (-9x+18=0 -> -9)


window.__duo.RULES.splice(2, 0,
  ['solveTermPart', /variable term|constant|coefficient/i],
  ['solvePatternRule', /complete the pattern/i]);

;'__duo ready';
