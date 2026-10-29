
// typed evaluation of a drawn piecewise function ("Enter the value when x = -1")


// reverse piecewise lookup: "Enter the input for f(x) = 2" — search each piece for
// the x that produces the target y


// ---- written piecewise: \begin{cases} expr & cond \\ expr & cond \end{cases} ----
Object.assign(window.__duo, {
  casesOf(src) {
    const raw = this.ascii(src);
    const m = raw.match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
    if (!m) return null;
    return m[1].split(/\\\\/).map(row => {
      // the separator is & in some renderings and \textbf{if} / \text{if} in others
      const parts = row.split(/&|\\(?:text|textbf)\{if\}/);
      if (parts.length < 2) return null;
      const f = this.compile(parts[0]);
      // the label can be \textbf{if\,} — the thin space lives INSIDE the braces, so
      // the split leaves "if" glued to the condition after normalisation
      const c = this.ineqNorm(parts[1]).replace(/^if/, '');
      const q = c.match(/^[a-z](<=|>=|<|>)(-?[\d.]+)$/);
      if (!f || !q) return null;
      const op = q[1], n = parseFloat(q[2]);
      const test = x => op === '<=' ? x <= n : (op === '>=' ? x >= n : (op === '<' ? x < n : x > n));
      return { f, test };
    }).filter(Boolean);
  },

  solveCasesEval() {
    let rows = null;
    for (const s of this.promptLatex()) { rows = this.casesOf(s); if (rows && rows.length) break; }
    if (!rows || !rows.length) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
      .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
    let x = null;
    const pm = this.ascii(this.promptLatex().join(' ')).replace(/[~\s]/g, '').match(/f\((-?[\d.]+)\)/);
    if (pm) x = parseFloat(pm[1]);
    if (x === null) for (const s of S) { const q = s.match(/f\((-?[\d.]+)\)/); if (q) { x = parseFloat(q[1]); break; } }
    if (x === null) return null;
    const row = rows.find(r => r.test(x)); if (!row) return null;
    const want = row.f(x);
    if (!isFinite(want)) return null;
    const i = S.findIndex(s => {
      const q = s.match(/f\((-?[\d.]+)\)=(-?[\d.]+)/);
      return q && parseFloat(q[1]) === x && Math.abs(parseFloat(q[2]) - want) < 1e-6;
    });
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solveCasesEval', null]);

// |x| shows up as \left\vert x \right\vert (or \lvert / bare pipes)
(function () {
  const base = window.__duo.compile;
  window.__duo.compile = function (src) {
    let t = this.ascii(src)
      .replace(/\\left\\vert([\s\S]*?)\\right\\vert/g, '\\abs{$1}')
      .replace(/\\lvert([\s\S]*?)\\rvert/g, '\\abs{$1}')
      .replace(/\|([^|]*)\|/g, '\\abs{$1}');
    if (/\\abs\{/.test(t)) {
      for (let i = 0; i < 4; i++) t = t.replace(/\\abs\{([^{}]*)\}/g, 'ABS($1)');
      const f = base.call(this, t.replace(/ABS\(/g, 'abs('));
      if (f) return f;
    }
    return base.call(this, src);
  };
})();
;'__duo ready';

// "Complete the table" for a written piecewise: the blank is a typed f(x) for a
// given x, which comes from the table row rather than the prompt text


// fnTable drops any row without two numbers — but in "complete the table" the row
// we need is exactly the one with a blank cell. Expose the raw rows too.
window.__duo.fnTableRows = function () {
  for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
    const d = f.contentDocument;
    const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
    const glyphs = []; let n;
    while ((n = w.nextNode())) {
      const t = n.textContent.trim();
      if (!t || t.length > 8) continue;
      if (n.parentElement && /SCRIPT|STYLE|TEMPLATE/.test(n.parentElement.tagName)) continue;
      const r = d.createRange(); r.selectNodeContents(n);
      const b = r.getBoundingClientRect(); if (!b.width) continue;
      glyphs.push({ t: this.ascii(t), x: b.left, x2: b.right, y: b.top + b.height / 2 });
    }
    if (glyphs.length < 4) continue;
    const rows = {};
    glyphs.forEach(g => { const k = Math.round(g.y / 8) * 8; (rows[k] = rows[k] || []).push(g); });
    const out = [];
    Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(k => {
      const gs = rows[k].sort((a, b) => a.x - b.x);
      const cols = []; let cur = null;
      for (const g of gs) {
        if (cur && g.x - cur.x2 < 14) { cur.t += g.t; cur.x2 = Math.max(cur.x2, g.x2); }
        else { cur = { t: g.t, x2: g.x2 }; cols.push(cur); }
      }
      out.push(cols.map(c => parseFloat(c.t)).filter(v => !isNaN(v)));
    });
    if (out.length) return out;
  }
  return null;
};


// The choice-screen deadlock has a typed twin: when no rule produces an answer the
// loop presses CHECK with an empty box, gets no verdict, and spins. Type something
// so the answer is graded and the question is replaced. Capped, like the guess.


// ---- "Complete the table" cell widget ----
// No text input and no choices: the frame holds table cells (.empty-cell) and the
// page has a maths keypad. Click a blank cell, then tap the digits.
Object.assign(window.__duo, {
  keypad(ch) {
    const want = ch === '-' ? ['-', '−'] : [ch];
    const b = [...document.querySelectorAll('button')]
      .find(x => want.includes(String(x.textContent).trim()));
    if (!b) return false;
    this.tap(b); return true;
  },

  tableCells() {
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
      const d = f.contentDocument, fr = f.getBoundingClientRect();
      const cells = [...d.querySelectorAll('[class*="table-cell"],[class*="cell-started"]')].map(e => {
        const r = e.getBoundingClientRect();
        return { el: e, empty: /empty-cell/.test(String(e.getAttribute('class') || '')),
                 t: String(e.textContent).trim(),
                 x: fr.left + r.left, y: fr.top + r.top };
      });
      if (cells.length >= 4) return { f, cells };
    }
    return null;
  },

  async solveTableFill() {
    const T = this.tableCells(); if (!T) return false;
    let rows = null;
    for (const s of this.promptLatex()) { rows = this.casesOf(s); if (rows && rows.length) break; }
    if (!rows || !rows.length) return false;
    const byRow = {};
    T.cells.forEach(c => { const k = Math.round(c.y / 10) * 10; (byRow[k] = byRow[k] || []).push(c); });
    let did = 0;
    for (const k of Object.keys(byRow).map(Number).sort((a, b) => a - b)) {
      const row = byRow[k].sort((a, b) => a.x - b.x);
      const blank = row.find(c => c.empty); if (!blank) continue;
      const src = row.find(c => !c.empty && c.t !== ''); if (!src) continue;
      const x = parseFloat(this.ascii(src.t)); if (isNaN(x)) continue;
      const rule = rows.find(r => r.test(x)); if (!rule) continue;
      const v = rule.f(x); if (!isFinite(v)) continue;
      this.tap(blank.el); await this.sleep(350);
      for (const chr of String(Math.round(v * 100) / 100)) { this.keypad(chr); await this.sleep(160); }
      await this.sleep(250); did++;
    }
    return did > 0;
  },
});

(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    const T = this.tableCells();
    if (T && T.cells.some(c => c.empty)) return { kind: 'tablefill', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// Clicking a cell INSIDE the frame needs the frame's own event constructors and
// view — exactly the rule that makes dragSynth work. tap() uses the top window's,
// so the cell never focuses and the keypad types into nothing.
window.__duo.tapIn = function (el, f) {
  if (!el || !f) return false;
  const W = f.contentWindow, fr = f.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;      // frame-local
  const P = W.PointerEvent, M = W.MouseEvent;
  const o = { bubbles: true, cancelable: true, composed: true, view: W,
    clientX: x, clientY: y, screenX: fr.left + x, screenY: fr.top + y, button: 0 };
  el.dispatchEvent(new P('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }, o)));
  el.dispatchEvent(new M('mousedown', Object.assign({ buttons: 1 }, o)));
  el.dispatchEvent(new P('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 }, o)));
  el.dispatchEvent(new M('mouseup', Object.assign({ buttons: 0 }, o)));
  el.dispatchEvent(new M('click', Object.assign({ buttons: 0 }, o)));
  return true;
};
(function () {
  const base = window.__duo.solveTableFill;
  window.__duo.solveTableFill = async function () {
    const T = this.tableCells(); if (!T) return false;
    let rows = null;
    for (const s of this.promptLatex()) { rows = this.casesOf(s); if (rows && rows.length) break; }
    if (!rows || !rows.length) return false;
    const byRow = {};
    T.cells.forEach(c => { const k = Math.round(c.y / 10) * 10; (byRow[k] = byRow[k] || []).push(c); });
    let did = 0;
    for (const k of Object.keys(byRow).map(Number).sort((a, b) => a - b)) {
      const row = byRow[k].sort((a, b) => a.x - b.x);
      const blank = row.find(c => c.empty); if (!blank) continue;
      const src = row.find(c => !c.empty && c.t !== ''); if (!src) continue;
      const x = parseFloat(this.ascii(src.t)); if (isNaN(x)) continue;
      const rule = rows.find(r => r.test(x)); if (!rule) continue;
      const v = rule.f(x); if (!isFinite(v)) continue;
      this.tapIn(blank.el, T.f); await this.sleep(400);
      for (const chr of String(Math.round(v * 100) / 100)) { this.keypad(chr); await this.sleep(180); }
      await this.sleep(300);
      if (String(blank.el.textContent).trim() !== '') did++;
    }
    return did > 0;
  };
})();
;'__duo ready';

// KNOWN LIMIT — "complete the table" cell widget (unit 144 L4)
// The frame holds .empty-cell table cells and the page has a maths keypad, but the
// keypad renders at y~1400 while the viewport is 907 tall, the document does not
// scroll (body.scrollHeight is 24 — the app lays out at a fixed size) and there is
// no scrollable ancestor. So the keys cannot be reached at this window size:
//   - synthetic clicks do nothing, in either the top window's or the frame's event
//     constructors, and synthetic KeyboardEvents are ignored too
//   - a real click via the computer tool lands outside the viewport
//   - page-zoom shortcuts are not available to the automation
// Fix is environmental: give Chrome a TALLER window (roughly 1500px of viewport)
// and these questions become reachable. Everything below is ready for that.
;'__duo ready';

// autoLesson resets S.log/done but not the guess counters, so after three guesses
// anywhere in a run every later unsolved screen deadlocks again instead of guessing
(function () {
  const base = window.__duo.autoLesson;
  window.__duo.autoLesson = async function () {
    this.S.guesses = 0; this.S.typeGuesses = 0;
    return base.call(this);
  };
})();

// "Select the match" can offer the SAME output for different inputs
// (f(1.5)=5, f(3.5)=5, f(5)=5): evaluate the drawn function at each choice's own x
// instead of taking x from the first choice and testing only that one.
(function () {
  const base = window.__duo.solvePiecewiseEval;
  window.__duo.solvePiecewiseEval = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    if (!this.pieces()) return r;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const S = (ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText)))
      .map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, ''));
    const hits = [];
    S.forEach((s, i) => {
      const q = s.match(/f\((-?[\d.]+)\)=(-?[\d.]+)/); if (!q) return;
      const y = this.pieceAt(parseFloat(q[1]));
      if (y !== null && Math.abs(y - parseFloat(q[2])) < 0.15) hits.push(i);
    });
    return hits.length === 1 ? { i: hits[0] } : r;
  };
})();
;'__duo ready';

// same typed lookup under more phrasings: "Enter the output when x = 2"


// "Enter the slope when x = 5": the slope of the piece containing that x


// At a step boundary two pieces contain x. Steps are drawn left-closed, so the
// value belongs to the piece that STARTS at x, not the one that ends there —
// taking the first match makes every boundary question wrong.
(function () {
  const base = window.__duo.pieceAt;
  window.__duo.pieceAt = function (x) {
    const P = this.pieces(); if (!P) return base.call(this, x);
    const starts = P.find(q => Math.abs(q.lo[0] - x) < 0.02);
    if (starts && starts.slope !== null) return starts.lo[1];
    return base.call(this, x);
  };
})();

// "Select the output when x = 2.0" — same lookup, choice form
window.__duo.solveOutputChoice = function () {
  const A = this.ascii(this.promptLatex().join(' ')).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '');
  const m = A.match(/x&?=(-?[\d.]+)/); if (!m) return null;
  const y = this.pieceAt(parseFloat(m[1])); if (y === null) return null;
  const want = Math.round(y * 100) / 100;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const i = ch.findIndex(e => { const v = parseFloat(this.clean(e.innerText)); return !isNaN(v) && Math.abs(v - want) < 0.02; });
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveOutputChoice', /select the (output|value) when/i]);
;'__duo ready';
