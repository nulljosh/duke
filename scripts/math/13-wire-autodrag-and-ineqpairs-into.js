
// ---- wire autoDrag and ineqPairs into run2 ----
// Earlier versions patched run2 by matching MINIFIED source text, which silently
// no-ops against the pretty-printed copy in this file: run2 kept logging
// 'needdrag' and stopping even though both solvers were present. Match on a
// whitespace-tolerant regex and assert the patch actually applied.
(function () {
  let s = String(window.__duo.run2);
  const before = s;

  s = s.replace(/const\s+p\s*=\s*await\s+this\.solvePairs\(\);/,
    'const p = (await this.ineqPairs()) || await this.solvePairs();');

  s = s.replace(/if\s*\(\s*this\.plan\(\)\s*\)\s*\{\s*this\.S\.log\.push\('needdrag'\);\s*break;\s*\}/,
    `if (this.plan()) {
      if (await this.autoDrag()) {
        this.S.log.push('drag'); await this.sleep(300);
        this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1500);
        const b2 = await this.blame(); this.S.log.push(b2 || 'noblame');
        if (b2 === 'correct') { this.S.done++; miss = 0; }
        else if (b2 === 'incorrect' && ++miss >= 2) { this.S.log.push('halt:2wrong'); break; }
        const c2 = document.querySelector('[data-test="player-next"]');
        if (c2 && /CONTINUE/i.test(c2.innerText)) { this.tap(c2); await this.sleep(1400); }
        info = 0; continue;
      }
      this.S.log.push('needdrag'); break;
    }`);

  if (s === before) console.warn('[duo] run2 patch did not apply');
  else window.__duo.run2 = eval('(' + s + ')');
})();
;'__duo ready';

// ---- compound inequalities (unit 139) ----
// The inequality is DRAWN, not written: the prompt carries only the header, and
// the condition lives in the number-line graph as one or two shaded bands.
Object.assign(window.__duo, {
  readCompound() {
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('g.point'));
    if (!f) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), sc = this.lineScale();
    if (!sc) return null;
    // shaded bands are <line class="line normal">; axis lines carry "axis" in the class
    const segs = [...d.querySelectorAll('line,rect,path')].map(e => {
      const c = String(e.getAttribute('class') || '');
      if (!/\bline\b/.test(c) || /axis/.test(c)) return null;
      const r = e.getBoundingClientRect(); if (r.width < 8) return null;
      return { x1: fr.left + r.left, x2: fr.left + r.left + r.width };
    }).filter(Boolean);
    if (!segs.length) return null;
    // "hidden" points are off-screen placeholders, not endpoints
    const ends = [...d.querySelectorAll('g.point')].map(p => {
      const c = String(p.getAttribute('class') || ''); if (/hidden/.test(c)) return null;
      const r = p.getBoundingClientRect();
      return { v: Math.round((fr.left + r.left + r.width / 2 - sc.px(0)) / sc.u), open: /open/.test(c) };
    }).filter(Boolean);
    const sat = v => {
      const px = sc.px(v);
      if (!segs.some(s => px >= s.x1 - 2 && px <= s.x2 + 2)) return false;
      const e = ends.find(o => o.v === v);
      return !(e && e.open);
    };
    return { sat, segs: segs.length, ends };
  },

  solveCompound() {
    const c = this.readCompound(); if (!c) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = parseFloat(this.clean(e.innerText)); return !isNaN(v) && c.sat(v); });
    return i < 0 ? { miss: 'none-sat' } : { i };
  },
});
window.__duo.RULES.splice(2, 0, ['solveCompound', /compound inequality/i]);
;'__duo ready';

// "Select the match": choices are compound expressions, the graph is the truth.
// Rather than pattern-match the text, build a predicate per choice and keep the
// one that agrees with the drawn graph at every integer on the axis.
Object.assign(window.__duo, {
  predOf(s) {
    // \b fails between "9" and "or" — both are word characters, the same trap that
    // once left "\le10" as "le10". Replace "and" first so "or" cannot split it.
    const t = this.ineqNorm(s).replace(/and/g, '&').replace(/or/g, '|');
    const join = t.includes('|') ? '|' : (t.includes('&') ? '&' : null);
    const parts = t.split(/[|&]/).map(p => this.solveOne(p)).filter(Boolean);
    if (!parts.length) return null;
    const one = w => {
      const m = w.match(/^[a-z](<=|>=|<|>)(-?[\d.]+)$/); if (!m) return null;
      const op = m[1], n = +m[2];
      return v => op === '<=' ? v <= n : (op === '>=' ? v >= n : (op === '<' ? v < n : v > n));
    };
    const ps = parts.map(one); if (ps.some(p => !p)) return null;
    if (ps.length === 1) return ps[0];
    return join === '&' ? (v => ps.every(p => p(v))) : (v => ps.some(p => p(v)));
  },

  solveCompoundMatch() {
    const c = this.readCompound(); if (!c) return null;
    const sc = this.lineScale(); if (!sc) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const xs = []; for (let v = sc.lo; v <= sc.hi; v++) xs.push(v);
    const i = S.findIndex(s => { const p = this.predOf(s); return p && xs.every(v => p(v) === c.sat(v)); });
    return i < 0 ? { miss: S.map(s => this.ineqNorm(s)) } : { i };
  },
});
window.__duo.RULES.splice(2, 0, ['solveCompoundMatch', /select the match|matches the graph/i]);
;'__duo ready';

// a compound inequality can also arrive as plain text with no graph at all
window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveCompoundValue');
window.__duo.RULES.splice(2, 0, ['solveCompoundValue', /select a solution|is a solution|solution value/i]);
;'__duo ready';

// ---- two-thumb compound graphs ----
// "Graph the solution set" for a compound inequality gives TWO thumbs, one per
// endpoint. dragSynth() grabs whichever thumb it finds first, so it can only ever
// place one of them; these helpers address a specific thumb.
Object.assign(window.__duo, {
  thumbs() {
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.slider1d-thumb'));
    if (!f) return [];
    const fr = f.getBoundingClientRect();
    return [...f.contentDocument.querySelectorAll('.slider1d-thumb')].map(e => {
      const r = e.getBoundingClientRect();
      return { el: e, f, x: Math.round(fr.left + r.left + r.width / 2), y: Math.round(fr.top + r.top + r.height / 2) };
    }).sort((a, b) => a.x - b.x);
  },

  async dragEl(t, dx) {
    const d = t.f.contentDocument, fr = t.f.getBoundingClientRect(), W = t.f.contentWindow, th = t.el;
    const P = W.PointerEvent, M = W.MouseEvent;
    const fire = (tg, ty, x, y, C, b) => tg.dispatchEvent(new C(ty, {
      bubbles: true, cancelable: true, composed: true, view: W,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: b,
      clientX: x - fr.left, clientY: y - fr.top, screenX: x, screenY: y }));
    fire(th, 'pointerover', t.x, t.y, P, 0); fire(th, 'pointerenter', t.x, t.y, P, 0);
    fire(th, 'pointerdown', t.x, t.y, P, 1); fire(th, 'mousedown', t.x, t.y, M, 1);
    for (let i = 1; i <= 14; i++) {
      const x = t.x + dx * i / 14;
      fire(th, 'pointermove', x, t.y, P, 1); fire(d, 'pointermove', x, t.y, P, 1);
      fire(th, 'mousemove', x, t.y, M, 1); fire(d, 'mousemove', x, t.y, M, 1);
      await this.sleep(24);
    }
    fire(th, 'pointerup', t.x + dx, t.y, P, 0); fire(th, 'mouseup', t.x + dx, t.y, M, 0);
    await this.sleep(420); return true;
  },

  endsNow() {
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('g.point'));
    const sc = this.lineScale(); if (!f || !sc) return [];
    const fr = f.getBoundingClientRect();
    return [...f.contentDocument.querySelectorAll('g.point')].map(p => {
      const c = String(p.getAttribute('class') || ''); if (/hidden/.test(c)) return null;
      const r = p.getBoundingClientRect();
      return { v: Math.round((fr.left + r.left + r.width / 2 - sc.px(0)) / sc.u), open: /open/.test(c) };
    }).filter(Boolean).sort((a, b) => a.v - b.v);
  },

  compoundTargets() {
    for (const s of this.promptLatex().filter(x => !/duodisplay/.test(x))) {
      const t = this.ineqNorm(s).replace(/and/g, '&').replace(/or/g, '|');
      if (!/[|&]/.test(t)) continue;
      const ns = t.split(/[|&]/).map(p => this.solveOne(p)).filter(Boolean)
        .map(w => { const m = w.match(/^[a-z](<=|>=|<|>)(-?[\d.]+)$/); return m ? +m[2] : null; })
        .filter(v => v !== null);
      if (ns.length === 2) return ns.sort((a, b) => a - b);
    }
    return null;
  },

  // move one thumb per pass and re-read: dragging both from stale coordinates
  // puts the second one in the wrong place
  async compoundDrag() {
    const want = this.compoundTargets(); if (!want) return false;
    const sc = this.lineScale(); if (!sc) return false;
    for (let k = 0; k < 4; k++) {
      const now = this.endsNow(), th = this.thumbs();
      if (now.length !== 2 || th.length !== 2) return false;
      if (now[0].v === want[0] && now[1].v === want[1]) return true;
      let moved = false;
      for (let i = 0; i < 2; i++) {
        const dx = sc.px(want[i]) - sc.px(now[i].v);
        if (dx) { await this.dragEl(this.thumbs()[i], dx); moved = true; break; }
      }
      if (!moved) return false;
    }
    const n = this.endsNow();
    return n.length === 2 && n[0].v === want[0] && n[1].v === want[1];
  },
});



// chained form "5 <= x <= 9" is a third notation: neither an "and" nor an "or" join
(function () {
  const base = window.__duo.predOf;
  window.__duo.predOf = function (s) {
    const m = this.ineqNorm(s).match(/^(-?[\d.]+)(<=|<)([a-z])(<=|<)(-?[\d.]+)$/);
    if (m) {
      const lo = +m[1], hi = +m[5], lc = m[2], rc = m[4];
      return v => (lc === '<=' ? v >= lo : v > lo) && (rc === '<=' ? v <= hi : v < hi);
    }
    return base.call(this, s);
  };
})();

// gating on /(and|or)/ skipped the chained form entirely — try any line with a relation
window.__duo.solveCompoundValue = function () {
  const L = this.promptLatex().filter(s => !/duodisplay/.test(s));
  let p = null;
  for (const s of L) {
    if (!/[<>]/.test(this.ineqNorm(s))) continue;
    const q = this.predOf(s); if (q) { p = q; break; }
  }
  if (!p) { const c = this.readCompound(); if (c) p = c.sat; }
  if (!p) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = parseFloat(this.clean(e.innerText)); return !isNaN(v) && p(v); });
  return i < 0 ? { miss: 'none' } : { i };
};
;'__duo ready';

// the chained form has to be taught to the two-thumb planner as well, not just predOf
(function () {
  const base = window.__duo.compoundTargets;
  window.__duo.compoundTargets = function () {
    for (const s of this.promptLatex().filter(x => !/duodisplay/.test(x))) {
      const m = this.ineqNorm(s).match(/^(-?[\d.]+)(?:<=|<)([a-z])(?:<=|<)(-?[\d.]+)$/);
      if (m) return [+m[1], +m[3]].sort((a, b) => a - b);
    }
    return base.call(this);
  };
})();
;'__duo ready';

// ---- function notation (unit 140) ----
// Guided steps ask which SUBSTITUTION is right ("4^2 + 2" vs "4(2) + 2") while
// \duoblank{} carries the final value. Evaluating each choice against that value
// picks the right one without parsing the algebra.
Object.assign(window.__duo, {
  evalExpr(s) {
    let t = this.ascii(s)
      .replace(/\\cdot|\\times/g, '*')
      // "16\pi" vs "\pi r^2": pi cancels on both sides, so drop it.
      .replace(/\\pi/g, '(3.141592653589793)')
      .replace(/\\left|\\right/g, '')
      .replace(/mathbf|textbf|text|\\|\{|\}/g, '')
      .replace(/\s+/g, '')
      .replace(/\^/g, '**')
      .replace(/(\d|\))(\()/g, '$1*$2');       // implicit multiplication: 4(2)
    // whitelist before eval — never hand arbitrary page text to Function()
    if (!/^[-+*/().0-9]+$/.test(t.replace(/\*\*/g, '*'))) return null;
    try { const v = Function('"use strict";return (' + t + ')')(); return isFinite(v) ? v : null; }
    catch (e) { return null; }
  },

  // in a guided lesson the LaTeX accumulates, so the LAST blank is the live step
  blankValue() {
    const m = this.promptLatex().join(' ').match(/duoblank\{([^}]*)\}/g);
    if (!m) return null;
    const v = parseFloat(this.ascii(m[m.length - 1].match(/duoblank\{([^}]*)\}/)[1]));
    return isNaN(v) ? null : v;
  },

  solveEvalChoice() {
    const want = this.blankValue(); if (want === null) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const i = S.findIndex(s => { const v = this.evalExpr(s); return v !== null && Math.abs(v - want) < 1e-9; });
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solveEvalChoice', null]);
;'__duo ready';

// Guided function lessons stack every step's LaTeX, so the live step is always the
// LAST \duoblank{} — and that blank holds the answer verbatim (it may be an
// expression, not a number). Reading any earlier blank answers a solved step and
// is graded wrong; this is the same accumulation trap that once cost 5 in a row.
window.__duo.lastBlank = function () {
  const all = this.promptLatex().join(' ').match(/duoblank\{([^}]*)\}/g);
  if (!all) return null;
  return this.ascii(all[all.length - 1].match(/duoblank\{([^}]*)\}/)[1]).replace(/\s+/g, '');
};


// "First, substitute 4 for x" wants the substituted expression, not the final value
window.__duo.substStep = function () {
  const A = this.ascii(this.promptLatex().join(' '));
  const m = A.match(/substitute\s*(-?\d+)\s*for/i); if (!m) return null;
  const n = m[1];
  const f = A.match(/f\(x\)\s*&?=\s*([^\\]+?)\s*\\\\/) || A.match(/f\(x\)\s*&?=\s*([^\\]+)/);
  if (!f) return null;
  const body = f[1].replace(/mathbf|textbf|text|\{|\}/g, '').trim();
  return body.replace(/x/g, +n < 0 ? '(' + n + ')' : n).replace(/\s+/g, '');
};
;'__duo ready';

// "function or not a function": a relation is a function iff no input maps to two
// different outputs. Pairs arrive either as g(4) = 0 lines or as ordered pairs.
Object.assign(window.__duo, {
  relPairs() {
    const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}/g, '');
    const out = [];
    let m, re = /[a-z]\(\s*(-?\d+)\s*\)\s*&?=\s*(-?\d+)/g;
    while ((m = re.exec(A))) out.push([+m[1], +m[2]]);
    if (!out.length) {
      re = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
      while ((m = re.exec(A))) out.push([+m[1], +m[2]]);
    }
    return out;
  },

  isFunction() {
    const p = this.relPairs(); if (p.length < 2) return null;
    const seen = new Map();
    for (const [x, y] of p) { if (seen.has(x) && seen.get(x) !== y) return false; seen.set(x, y); }
    return true;
  },

  solveIsFunction() {
    const f = this.isFunction(); if (f === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
      .map(e => this.ascii(e.innerText).toLowerCase());
    if (!ch.some(s => /function/.test(s))) return null;
    const i = ch.findIndex(s => f ? (/function/.test(s) && !/not/.test(s)) : /not/.test(s));
    return i < 0 ? { miss: f } : { i, want: f ? 'function' : 'not a function' };
  },
});
window.__duo.RULES.splice(2, 0, ['solveIsFunction', null]);
;'__duo ready';

// the relation can also arrive as a formula rather than as pairs
(function () {
  const base = window.__duo.isFunction;
  window.__duo.isFunction = function () {
    const r = base.call(this); if (r !== null && r !== undefined) return r;
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/mathbf|textbf|text|\\|\{|\}/g, '').replace(/[~\s]+/g, '');
    // no (?:^|[^a-z]) guard here: the header runs straight into the formula
    // ("Selectthematchf(x)=sqrtx"), so the preceding char is a letter
    const m = A.match(/(f\(x\)|g\(x\)|y)=(.+)$/i);
    if (!m) return null;
    if (/pm|±/.test(m[2])) return false;   // ± gives two outputs
    if (/y\^?2=/.test(A)) return false;    // y^2 = x is not single-valued
    return true;
  };
})();
;'__duo ready';

// "Complete the pattern" over function notation: rows read "f(a) = b" followed by
// an answer. Whether that answer is the INPUT or the OUTPUT is only knowable from
// the worked example row, so infer it there and apply it to the query row.
window.__duo.solveFnPattern = function () {
  const L = this.promptLatex().map(s => this.ascii(s)
    .replace(/mathbf|textbf|text|\\|\{|\}/g, '').replace(/\s+/g, ''));
  const rows = [];
  for (let i = 0; i < L.length - 1; i++) {
    const m = L[i].match(/^[a-z]\((-?\d+)\)=(-?\d+)$/);
    if (m) rows.push({ a: +m[1], b: +m[2], ans: L[i + 1] });
  }
  if (rows.length < 2) return null;
  const ex = rows.find(r => /^-?\d+$/.test(r.ans));
  const q = rows.find(r => r.ans === '?' || r.ans === '');
  if (!ex || !q) return null;
  const v = +ex.ans;
  const want = v === ex.a ? q.a : (v === ex.b ? q.b : null);
  if (want === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
    .map(e => parseFloat(this.clean(e.innerText)));
  const i = ch.findIndex(x => x === want);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveFnPattern', /complete the pattern/i]);
;'__duo ready';
