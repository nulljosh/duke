
// Two loop bugs that both looked like "the solver is stuck":
//  1. The blame banner LAGS — a single read made the loop bail with "noblame"
//     right after a correct answer. Poll for it.
//  2. A solved pairs question shows a CONTINUE; the pairs branch skipped it and
//     re-counted the same solved screen forever ("p3,p3,p3…" with the streak
//     frozen). Press CONTINUE after solving pairs.
window.__duo.blame = async function () {
  for (let k = 0; k < 4; k++) {
    const b = ((document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test || '').replace('blame blame-', '');
    if (b) return b;
    if (!document.querySelector('[data-test^="challenge "]')) return '';
    await this.sleep(600);
  }
  return '';
};

window.__duo.run2 = async function (n) {
  this.S = { running: true, log: [], done: 0 };
  let miss = 0, info = 0;
  for (let i = 0; i < n && this.S.running; i++) {
    const n0 = document.querySelector('[data-test="player-next"]');
    if (n0 && /CONTINUE/i.test(n0.innerText || '')) { this.tap(n0); await this.sleep(1400); continue; }

    let r = this.read();
    if (!r.type) { this.S.log.push('lessondone'); break; }
    if (this.plan()) { this.S.log.push('needdrag'); break; }
    if (!r.choices.length && !r.input) { await this.sleep(900); r = this.read(); }

    let acted = false;
    if (document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])').length >= 4 && !r.choices.length) {
      const p = await this.solvePairs();
      if (p && p.pairs) {
        this.S.log.push('p' + p.pairs); this.S.done++; await this.sleep(1200);
        const cn = document.querySelector('[data-test="player-next"]');
        if (cn && /CONTINUE/i.test(cn.innerText)) { this.tap(cn); await this.sleep(1400); }
        continue;
      }
    }
    if (r.choices.length) { const s = this.solveChoices();
      if (s && s.ok) { s.idx.forEach(j => this.tap(document.querySelectorAll('[data-test="challenge-choice"]')[j])); acted = true; } }
    else if (r.input) { acted = !!this.typeAnswer(); }
    if (!acted && n0 && !/disabled/i.test(n0.className)) {
      if (++info >= 3) { this.S.log.push('stuck:info-loop'); break; }
      this.tap(n0); await this.sleep(1500); this.S.log.push('info'); continue;
    }
    if (!acted) { this.S.log.push('stuck:' + r.type); break; }
    info = 0;

    await this.sleep(320);
    this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1400);
    const bl = await this.blame();
    this.S.log.push(bl || 'noblame');
    if (bl === 'correct') { this.S.done++; miss = 0; }
    else if (bl === 'incorrect' && ++miss >= 2) { this.S.log.push('halt:2wrong'); break; }
    const nx = document.querySelector('[data-test="player-next"]');
    if (nx && /CONTINUE/i.test(nx.innerText)) { this.tap(nx); await this.sleep(1400); }
  }
  this.S.running = false;
  return this.S;
};

// typed coefficient / constant / phrase answers


// ---- combining like terms and solving linear equations (unit 137) ----
Object.assign(window.__duo, {
  // \begin{aligned} packs several equations into ONE latex entry separated by \\
  // with & alignment markers — split them before parsing
  eqLines() {
    const out = [];
    for (const s of this.promptLatex()) {
      const t = this.ascii(s).replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
        .replace(/[{}]|mathbf|textbf|\\text/g, '');
      t.split(/\\\\|\\newline/).forEach(part => {
        const u = part.replace(/&/g, '').replace(/\\/g, '').replace(/\s/g, '');
        if (u.includes('=')) out.push(u);
      });
    }
    return out;
  },

  simplifySide(str) {
    let coef = 0, konst = 0, v = null, ok = true;
    str.split(/(?=[+-])/).filter(Boolean).forEach(term => {
      const mm = term.match(/^([+-]?)(\d*)([a-z])$/i);
      if (mm) { coef += (mm[1] === '-' ? -1 : 1) * (mm[2] === '' ? 1 : +mm[2]); v = mm[3]; return; }
      const cc = term.match(/^([+-]?\d+)$/); if (cc) { konst += +cc[1]; return; }
      ok = false;
    });
    return ok ? { coef, konst, v } : null;
  },

  fmtSide(s) {
    if (!s) return null;
    if (!s.v || s.coef === 0) return String(s.konst);
    const c = (s.coef === 1 ? '' : (s.coef === -1 ? '-' : String(s.coef))) + s.v;
    const k = s.konst === 0 ? '' : (s.konst > 0 ? '+' + s.konst : String(s.konst));
    return c + k;
  },

  // equations can have variables on BOTH sides — simplify each independently
  combineLike(str) {
    const t = this.ascii(str).replace(/\s|[{}\\]|mathbf|textbf|text/g, '');
    const m = t.match(/^(.*)=(.*)$/); if (!m) return null;
    const L = this.simplifySide(m[1]), R = this.simplifySide(m[2]);
    if (!L || !R) return null;
    const ls = this.fmtSide(L), rs = this.fmtSide(R);
    return (ls && rs) ? ls + '=' + rs : null;
  },

  solveLinear() {
    const L = this.eqLines();
    for (let i = L.length - 1; i >= 0; i--) {
      const m = L[i].match(/^(.*)=(.*)$/); if (!m) continue;
      const A = this.simplifySide(m[1]), B = this.simplifySide(m[2]);
      if (!A || !B) continue;
      const dc = A.coef - B.coef, dk = B.konst - A.konst;
      if (dc === 0) continue;
      const x = dk / dc; if (!isFinite(x)) continue;
      return +(Math.round(x * 10000) / 10000);
    }
    return null;
  },

  solveXValue() {
    const x = this.solveLinear(); if (x === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(x));
    return i < 0 ? { miss: x } : { i, want: x };
  },

  solveEquivalent() {
    const L = this.promptLatex().map(s => this.ascii(s).replace(/\s|[{}\\]|mathbf|textbf|text/g, ''));
    let want = null;
    for (let i = L.length - 1; i >= 0; i--) { const w = this.combineLike(L[i]); if (w) { want = w; break; } }
    if (!want) return null;
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')]
      .map(a => this.ascii(a.textContent).replace(/\s|[{}\\]|mathbf|textbf/g, ''));
    const i = tex.indexOf(want);
    return i < 0 ? { miss: want } : { i, want };
  },

  varPart(s) {
    const t = this.ascii(s).replace(/\s|\\|mathbf|textbf|\{|\}/g, '').toLowerCase();
    const m = t.match(/^-?\d*([a-z](\^\d+)?)$/); if (m) return m[1];
    if (/^-?\d+(\.\d+)?$/.test(t)) return '#';
    return null;
  },

  solveLikeTerms() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const parts = src.map(s => this.ascii(s).replace(/\s|\\|mathbf|textbf|\{|\}/g, '').split(/,|and/i).filter(Boolean));
    let i = parts.findIndex(p => p.length === 2 && this.varPart(p[0]) && this.varPart(p[0]) === this.varPart(p[1]));
    if (i >= 0) return { i, want: parts[i].join(',') };
    let expr = null;
    for (const s of this.promptLatex()) { const t = this.ascii(s).replace(/\s|\\|mathbf|textbf|\{|\}|text/g, '');
      if (/[a-z].*[+-]/i.test(t) && !/select|like|terms/i.test(t)) { expr = t; break; } }
    if (!expr) return null;
    const counts = {};
    expr.split(/(?=[+-])/).filter(Boolean).forEach(t => {
      const v = this.varPart(t.replace(/^\+/, '')); if (v) counts[v] = (counts[v] || 0) + 1; });
    const rep = Object.keys(counts).find(k => counts[k] > 1); if (!rep) return null;
    i = src.findIndex(s => this.varPart(s) === rep);
    return i < 0 ? { miss: rep } : { i, want: rep };
  },
});

// "11x + 9x = 80" must COMBINE to 20, not report the first coefficient — the
// naive match paired it with 13x=78 and only ever landed one pair
(function () {
  const prev = window.__duo.tokenExp;
  window.__duo.tokenExp = function (el) {
    let s = null;
    if (el && el.querySelector) { const a = el.querySelector('annotation'); if (a) s = a.textContent; }
    if (s === null) s = (typeof el === 'string') ? el : (el.innerText || '');
    const t = this.ascii(s).replace(/\s|[{}\\]|mathbf|textbf/g, '');
    const m = t.match(/^(.*?)=(-?\d+)$/);
    if (m && /[a-z]/i.test(m[1])) { const side = this.simplifySide(m[1]);
      if (side && side.v) return side.coef; }
    return prev.call(this, el);
  };
  // pattern rule can also be "combine like terms"
  const prevPat = window.__duo.solvePatternRule;
  window.__duo.solvePatternRule = function () {
    const r = prevPat.call(this); if (r && r.i >= 0) return r;
    const L = this.promptLatex().map(s => this.ascii(s).replace(/\s|[{}\\]|mathbf|textbf|text/g, ''));
    const q = L.findIndex(s => s === '?'); if (q < 1) return r;
    const want = this.combineLike(L[q - 1]); if (!want) return r;
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')]
      .map(a => this.ascii(a.textContent).replace(/\s|[{}\\]|mathbf|textbf/g, ''));
    const i = tex.indexOf(want);
    return i < 0 ? { miss: want } : { i, want };
  };
  const prevType = window.__duo.typeAnswer;
  window.__duo.typeAnswer = function () {
    if (/value of/i.test(this.prompt())) { const x = this.solveLinear();
      if (x !== null) { this.type(String(x)); return String(x); } }
    return prevType.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveLikeTerms', /like terms/i],
  ['solveEquivalent', /equivalent equation|simplif/i],
  ['solveXValue', /value of/i]);

;'__duo ready';

// ---- inequalities and number lines (unit 138) ----
Object.assign(window.__duo, {
  // \b fails between "e" and a digit, so "\le10" stayed "le10" — normalise the
  // symbols BEFORE stripping backslashes
  ineqNorm(s) {
    return this.ascii(s)
      .replace(/\\leq/g, '<=').replace(/\\geq/g, '>=')
      .replace(/\\le/g, '<=').replace(/\\ge/g, '>=')
      .replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/\s|\\|mathbf|textbf|\{|\}/g, '').toLowerCase();
  },

  // number-line labels can live in ANY of the stacked frames and sit in one row
  lineScale() {
    const frames = [...document.querySelectorAll('iframe')].filter(f => f.contentDocument);
    let best = null;
    for (const f of frames) {
      const d = f.contentDocument, fr = f.getBoundingClientRect();
      const labs = [...d.querySelectorAll('text,tspan')].map(e => { const r = e.getBoundingClientRect();
        return { v: +this.ascii(e.textContent.trim()).replace(/[−–]/g, '-'),
                 x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 }; })
        .filter(o => !isNaN(o.v) && o.x > 0);
      if (labs.length < 3) continue;
      const row = {}; labs.forEach(o => { const k = Math.round(o.y / 10) * 10; (row[k] = row[k] || []).push(o); });
      const grp = Object.values(row).sort((a, b) => b.length - a.length)[0];
      if (!grp || grp.length < 3) continue;
      if (!best || grp.length > best.length) best = grp;
    }
    if (!best) return null;
    const s = best.slice().sort((a, b) => a.v - b.v), lo = s[0], hi = s[s.length - 1];
    const u = (hi.x - lo.x) / (hi.v - lo.v); if (!isFinite(u) || !u) return null;
    return { px: v => Math.round(lo.x + (v - lo.v) * u), y: Math.round(lo.y), lo: lo.v, hi: hi.v, u };
  },

  // read the inequality from the PROMPT entries: tex() concatenates the choices,
  // turning "x >= 9" with choices 7,10,8 into "x>=97108"
  ineqFromPrompt() {
    for (const s of this.promptLatex()) {
      const m = this.ineqNorm(s).match(/^[a-z](<=|>=|<|>)(-?\d+)$/);
      if (m) return { op: m[1], n: +m[2] };
    }
    for (const s of this.promptLatex()) {
      const m = this.ineqNorm(s).match(/[a-z](<=|>=|<|>)(-?\d+)/);
      if (m) return { op: m[1], n: +m[2] };
    }
    return null;
  },

  // drag the number-line handle to the boundary value
  ineqPlan() {
    const q = this.ineqFromPrompt(); if (!q) return null;
    const sc = this.lineScale(); if (!sc || q.n < sc.lo || q.n > sc.hi) return null;
    const f = this.frameEl(); if (!f) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const th = d.querySelector('.slider1d-thumb,.slider2d-thumb'); if (!th) return null;
    const r = th.getBoundingClientRect();
    return { kind: 'ineq', v: q.n, op: q.op,
      from: [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)],
      to: [sc.px(q.n), Math.round(fr.top + r.top + r.height / 2)] };
  },

  // read an inequality OFF a number line: dot = boundary, filled = inclusive,
  // and the shaded segment's side gives the direction
  readIneqGraph() {
    const f = this.frameEl(); if (!f) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), sc = this.lineScale(); if (!sc) return null;
    const dot = [...d.querySelectorAll('circle,ellipse')].map(e => { const r = e.getBoundingClientRect();
      return { cx: fr.left + r.left + r.width / 2, w: r.width, fill: getComputedStyle(e).fill }; })
      .filter(o => o.w > 6).sort((a, b) => b.w - a.w)[0];
    if (!dot) return null;
    const v = Math.round((dot.cx - sc.px(0)) / sc.u);
    const filled = !/none|rgba\(0,\s*0,\s*0,\s*0\)|rgb\(255,\s*255,\s*255\)/i.test(dot.fill);
    const seg = [...d.querySelectorAll('line,path,rect')].map(e => { const r = e.getBoundingClientRect();
      return { x: fr.left + r.left, w: r.width, cls: String(e.getAttribute('class') || '') }; })
      .filter(o => o.w > 25 && !/axis/.test(o.cls)).sort((a, b) => b.w - a.w)[0];
    if (!seg) return null;
    const left = (seg.x + seg.w / 2) < dot.cx;
    return { v, op: left ? (filled ? '<=' : '<') : (filled ? '>=' : '>'), filled };
  },

  solveIneqMatch() {
    const g = this.readIneqGraph(); if (!g) return null;
    const want = 'x' + g.op + g.v;
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const i = src.findIndex(s => this.ineqNorm(s) === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // "x is at least/at most/no more than N" -> the right sign
  solveIneqPhrase() {
    const P = this.prompt().replace(/[,\s]+/g, ' ');
    const m = P.match(/([a-z])\s*is\s*(at least|at most|greater than or equal to|less than or equal to|no more than|no less than|more than|greater than|less than|fewer than)\s*(-?\d+)/i);
    if (!m) return null;
    const w = m[2].toLowerCase();
    const op = /at least|no less than|greater than or equal/.test(w) ? '>='
      : (/at most|no more than|less than or equal/.test(w) ? '<='
      : (/more than|greater than/.test(w) ? '>' : '<'));
    const want = m[1] + op + m[3];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const i = src.findIndex(s => this.ineqNorm(s) === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  solveIneqValue() {
    let q = this.ineqFromPrompt();
    if (!q) { const g = this.readIneqGraph(); if (g) q = { op: g.op, n: g.v }; }
    if (!q) return null;
    const ok = v => q.op === '<=' ? v <= q.n : (q.op === '>=' ? v >= q.n : (q.op === '<' ? v < q.n : v > q.n));
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => { const v = parseFloat(this.clean(e.innerText)); return !isNaN(v) && ok(v); });
    return i < 0 ? { miss: q } : { i, want: q.op + q.n };
  },
});

(function () {
  const b = window.__duo.plan;
  window.__duo.plan = function () {
    if (/inequality|solution set/i.test(this.tex())) { const p = this.ineqPlan(); if (p) return p; }
    return b.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveIneqPhrase', /inequality/i],
  ['solveIneqMatch', null],
  ['solveIneqValue', /solution value|is a solution/i]);

;'__duo ready';
