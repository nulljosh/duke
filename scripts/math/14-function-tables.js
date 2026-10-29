
// "Match the pairs" over function notation: pair "f(a) = b" with the loose number
// token it evaluates to. Try the output first, then the input, since either can be
// the intended half.
window.__duo.fnPairs = async function () {
  const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
  if (tk.length < 4) return null;
  const txt = tk.map(e => { const a = e.querySelector('annotation'); return a ? a.textContent : this.ascii(e.innerText); });
  const norm = txt.map(s => this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}/g, '').replace(/\s+/g, ''));
  const call = norm.map(s => { const m = s.match(/^[a-z]\((-?\d+)\)=(-?\d+)$/); return m ? { a: m[1], b: m[2] } : null; });
  const used = new Set(); let n = 0;
  for (let i = 0; i < tk.length; i++) {
    if (used.has(i) || !call[i]) continue;
    let j = norm.findIndex((s, k) => k !== i && !used.has(k) && !call[k] && s === call[i].b);
    if (j < 0) j = norm.findIndex((s, k) => k !== i && !used.has(k) && !call[k] && s === call[i].a);
    if (j < 0) continue;
    used.add(i); used.add(j); n++;
    this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
  }
  if (!n) return null;
  const left = tk.filter((e, k) => !used.has(k) && e.offsetParent !== null);
  if (left.length === 2) { this.tap(left[0]); await this.sleep(140); this.tap(left[1]); await this.sleep(320); n++; }
  return { pairs: n };
};

// chain it behind the inequality pairs solver that run2 already calls


// "Select the input" / "Select the output" for f(a) = b
window.__duo.solveInputOutput = function () {
  const P = this.prompt();
  const wantIn = /\binput\b/.test(P), wantOut = /\boutput\b/.test(P);
  if (!wantIn && !wantOut) return null;
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}/g, '').replace(/[~\s]+/g, '');
  const m = A.match(/[a-z]\((-?\d+)\)=(-?\d+)/); if (!m) return null;
  const want = wantIn ? +m[1] : +m[2];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
    .map(e => parseFloat(this.clean(e.innerText)));
  const i = ch.findIndex(x => x === want);
  return i < 0 ? { miss: want } : { i, want };
};
window.__duo.RULES.splice(2, 0, ['solveInputOutput', /select the (input|output)/i]);
;'__duo ready';

// ---- function tables ----
// Do NOT pick the frame by testing its text for "x": the header renders as the
// math-italic 𝑥 (U+1D465), so /\bx\b/ never matches. Pick by content shape instead.
Object.assign(window.__duo, {
  fnTable() {
    // guided lessons STACK one iframe per step; the live one is the last with
    // content, so scan in reverse or a solved step's graph answers the new question
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
      const d = f.contentDocument;
      const cells = [...d.querySelectorAll('text,tspan,td,div,span')].map(e => {
        const t = e.textContent.trim(); if (!t || e.children.length) return null;
        const r = e.getBoundingClientRect(); if (!r.width) return null;
        return { v: parseFloat(this.ascii(t)), x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }).filter(o => o && !isNaN(o.v));
      if (cells.length < 4) continue;
      // cluster by row, then read the first two columns — a blank cell would
      // otherwise shift every value one place left
      const rows = {};
      cells.forEach(c => { const k = Math.round(c.y / 8) * 8; (rows[k] = rows[k] || []).push(c); });
      const out = [];
      Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(k => {
        const r = rows[k].sort((a, b) => a.x - b.x);
        if (r.length >= 2) out.push([r[0].v, r[1].v]);
      });
      if (out.length) return out;
    }
    return null;
  },

  solveTableValue() {
    const m = this.ascii(this.promptLatex().join(' ')).match(/x\s*=\s*(-?\d+)/);
    if (!m) return null;
    const T = this.fnTable(); if (!T) return null;
    const hit = T.find(r => r[0] === +m[1]); if (!hit) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
      .map(e => parseFloat(this.clean(e.innerText)));
    const i = ch.findIndex(x => x === hit[1]);
    return i < 0 ? { miss: hit[1] } : { i, want: hit[1] };
  },
});
window.__duo.RULES.splice(2, 0, ['solveTableValue', /select the value when/i]);
;'__duo ready';

// the reverse table lookup: "select the value of x when f(x) = 6"
window.__duo.solveTableInverse = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}/g, '').replace(/[~\s]+/g, '');
  const m = A.match(/f\(x\)&?=(-?\d+)/); if (!m) return null;
  const T = this.fnTable(); if (!T) return null;
  const hit = T.find(r => r[1] === +m[1]); if (!hit) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
    .map(e => parseFloat(this.clean(e.innerText)));
  const i = ch.findIndex(x => x === hit[0]);
  return i < 0 ? { miss: hit[0] } : { i, want: hit[0] };
};
window.__duo.RULES.splice(2, 0, ['solveTableInverse', /value of .*when/i]);
;'__duo ready';

// typed table lookups: "Enter the value when x = 1"


// typeAnswer is now ~18 wrappers deep and the innermost one reads .value off the
// input element unguarded. When the screen has no text input that throws, and the
// exception escapes run2 and kills the whole lesson silently. Guard once, outermost.


// Table cells are not one element per value: a negative number arrives as a
// separate "−" glyph followed by its digits, so parsing element-by-element yields
// NaN and dropped rows. Cluster a row's glyphs into columns by x-gap first.
;'__duo ready';

// Read the table from TEXT NODES, not elements: a value like -7 is split across
// nodes ("-" then "7") that sit inside wrappers, so an element-level scan misses
// the digits entirely and every negative row is dropped. Skip <script>/<style> and
// any long node — the frame also carries the diagram library's inline source.
window.__duo.fnTable = function () {
  // scan in reverse: the live frame is the last one with content
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
      const nums = cols.map(c => parseFloat(c.t)).filter(v => !isNaN(v));
      if (nums.length >= 2) out.push([nums[0], nums[1]]);
    });
    if (out.length) return out;
  }
  return null;
};
;'__duo ready';

// Guided arithmetic steps ("multiply the terms", "combine", "simplify") show the
// current expression and offer rewrites of it. The right one is simply the choice
// that evaluates to the same value — no need to model the transformation.
window.__duo.solveEquivExpr = function () {
  const L = this.promptLatex().filter(s => !/duoblank|duodisplay/.test(s));
  let want = null;
  for (let i = L.length - 1; i >= 0; i--) {
    const v = this.evalExpr(L[i]);
    if (v !== null) { want = v; break; }
  }
  if (want === null) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const hits = [];
  S.forEach((s, i) => { const v = this.evalExpr(s); if (v !== null && Math.abs(v - want) < 1e-9) hits.push(i); });
  // only answer when exactly one choice matches, so an ambiguous screen falls
  // through to a more specific rule instead of guessing
  return hits.length === 1 ? { i: hits[0], want } : null;
};
window.__duo.RULES.splice(2, 0, ['solveEquivExpr', null]);
;'__duo ready';

// ---- rate of change / slope (unit 141) ----
// "Select the ratio of change in y to change in x" — read both deltas from the
// prompt and honour the order the sentence asks for, since the distractor is the
// same fraction inverted.
window.__duo.solveRatio = function () {
  const A = this.ascii(this.promptLatex().join(' '))
    .replace(/mathbf|textbf|text|\\|\{|\}/g, ' ').replace(/[~]/g, ' ');
  const dy = A.match(/change\s*in\s*y\s*=?\s*(-?\d+)/i);
  const dx = A.match(/change\s*in\s*x\s*=?\s*(-?\d+)/i);
  if (!dy || !dx) return null;
  const P = this.prompt();
  const yFirst = !/change in x to change in y/i.test(P);
  const top = yFirst ? dy[1] : dx[1], bot = yFirst ? dx[1] : dy[1];
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  // compare the fraction's parts, not the string: the choice is wrapped as
  // \mathbf{\frac{6}{2}} and stripping the command leaves a stray outer brace
  const parts = s => {
    const m = this.ascii(s).match(/frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(-?\d+)\s*\}/)
      || this.ascii(s).match(/(-?\d+)\s*\/\s*(-?\d+)/);
    return m ? [m[1], m[2]] : null;
  };
  const i = S.findIndex(s => { const q = parts(s); return q && q[0] === top && q[1] === bot; });
  return i < 0 ? { miss: top + '/' + bot } : { i, want: top + '/' + bot };
};
window.__duo.RULES.splice(2, 0, ['solveRatio', /ratio of change|change in y to change in x|change in x to change in y/i]);
;'__duo ready';

// ---- \duodisplay slider (unit 141, "create a rate of change of ...") ----
// A horizontal .slider2d-track drives the numerator of a displayed fraction. The
// px-per-unit is NOT the grid's, and the widget tracks movement relative to the
// grab point, so compute nothing up front: nudge, re-read \duodisplay's SECOND
// argument (the live state — the first is not the answer), and calibrate.
Object.assign(window.__duo, {
  async dragXY(el, f, from, to) {
    const d = f.contentDocument, fr = f.getBoundingClientRect(), W = f.contentWindow;
    const P = W.PointerEvent, M = W.MouseEvent;
    const fire = (tg, ty, x, y, C, b) => tg.dispatchEvent(new C(ty, {
      bubbles: true, cancelable: true, composed: true, view: W,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: b,
      clientX: x - fr.left, clientY: y - fr.top, screenX: x, screenY: y }));
    fire(el, 'pointerover', from[0], from[1], P, 0); fire(el, 'pointerenter', from[0], from[1], P, 0);
    fire(el, 'pointerdown', from[0], from[1], P, 1); fire(el, 'mousedown', from[0], from[1], M, 1);
    for (let i = 1; i <= 14; i++) {
      const x = from[0] + (to[0] - from[0]) * i / 14, y = from[1] + (to[1] - from[1]) * i / 14;
      fire(el, 'pointermove', x, y, P, 1); fire(d, 'pointermove', x, y, P, 1);
      fire(el, 'mousemove', x, y, M, 1); fire(d, 'mousemove', x, y, M, 1);
      await this.sleep(24);
    }
    fire(el, 'pointerup', to[0], to[1], P, 0); fire(el, 'mouseup', to[0], to[1], M, 0);
    await this.sleep(430); return true;
  },

  duoCur() {
    const t = this.duoTarget();
    if (!t) return null;
    const v = parseFloat(this.ascii(t.cur));
    return isNaN(v) ? null : v;
  },

  // what the prompt actually demands of the value
  duoGoal() {
    const P = this.prompt();
    const m = this.ascii(this.promptLatex().join(' ')).match(/rate of change of\s*(-?[\d.]+)/i);
    if (m) return { kind: 'eq', v: parseFloat(m[1]) };
    if (/negative/.test(P)) return { kind: 'neg' };
    if (/positive/.test(P)) return { kind: 'pos' };
    if (/zero|no rate of change/.test(P)) return { kind: 'eq', v: 0 };
    return null;
  },

  async solveDuoSlider() {
    const goal = this.duoGoal(); if (!goal) return false;
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.slider2d-thumb'));
    if (!f) return false;
    const ok = v => goal.kind === 'neg' ? v < 0 : (goal.kind === 'pos' ? v > 0 : Math.abs(v - goal.v) < 1e-6);
    let cur = this.duoCur(); if (cur === null) return false;
    if (ok(cur)) return true;

    const pos = () => {
      const th = f.contentDocument.querySelector('.slider2d-thumb');
      const fr = f.getBoundingClientRect(), r = th.getBoundingClientRect();
      return { el: th, x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 };
    };
    let px = 40;                                  // unknown step; calibrate from the first move
    for (let k = 0; k < 8; k++) {
      const p = pos(), before = this.duoCur();
      const target = goal.kind === 'neg' ? before - 1 : (goal.kind === 'pos' ? before + 1 : goal.v);
      const dx = (target - before) * px;
      if (!isFinite(dx) || !dx) return ok(this.duoCur());
      await this.dragXY(p.el, f, [p.x, p.y], [p.x + dx, p.y]);
      const after = this.duoCur();
      if (after === null) return false;
      if (ok(after)) return true;
      if (after !== before) px = Math.abs(dx / (after - before));   // calibrated
      else px *= 1.6;                                              // too small to register
    }
    return ok(this.duoCur());
  },
});

// let autoDrag reach it: this widget has no .slider1d-thumb, so the number-line
// path never fires


// and let run2 see it as a drag-shaped screen
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.slider2d-thumb'));
    if (f && this.duoGoal()) return { kind: 'duoslider', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// Two corrections to duoGoal: the target sits inside \emphasis{\mathbf{1.5}}, so
// strip the commands before matching; and that target is the value of the whole
// FRACTION while the slider moves only the numerator, so scale by the denominator
// in \frac{\duodisplay{..}{..}}{D}.
window.__duo.duoGoal = function () {
  const raw = this.promptLatex().join(' ');
  const A = this.ascii(raw)
    .replace(/emphasis|mathbf|textbf|text|\\/g, ' ')
    .replace(/[{}~]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const den = this.ascii(raw).match(/duodisplay\s*\{[^}]*\}\s*\{[^}]*\}\s*\}\s*\{\s*(-?\d+)\s*\}/);
  const D = den ? +den[1] : 1;
  const m = A.match(/rate of change of\s*(-?[\d.]+)/);
  if (m) return { kind: 'eq', v: parseFloat(m[1]) * (D || 1) };
  if (/negative/.test(A)) return { kind: 'neg' };
  if (/positive/.test(A)) return { kind: 'pos' };
  if (/zero rate|rate of change of zero|no rate of change/.test(A)) return { kind: 'eq', v: 0 };
  return null;
};
;'__duo ready';

// "Select the description of the rate of change": read the drawn line's real
// endpoints. A bounding box cannot tell "\" from "/", and the line is a <path>
// whose d is thousands of numbers — the first and last pairs are the endpoints.
Object.assign(window.__duo, {
  drawnSlope() {
    // guided lessons STACK one iframe per step; the live one is the last with
    // content, so scan in reverse or a solved step's graph answers the new question
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
      const p = [...f.contentDocument.querySelectorAll('path,line,polyline')].find(e => {
        const c = String(e.getAttribute('class') || '');
        if (/axis|grid/.test(c)) return null;
        const r = e.getBoundingClientRect();
        return r.width > 12 || r.height > 12;
      });
      if (!p) continue;
      let x1, y1, x2, y2;
      if (p.tagName.toLowerCase() === 'line') {
        x1 = +p.getAttribute('x1'); y1 = +p.getAttribute('y1');
        x2 = +p.getAttribute('x2'); y2 = +p.getAttribute('y2');
      } else {
        const n = String(p.getAttribute('d') || p.getAttribute('points') || '').match(/-?\d+(?:\.\d+)?/g);
        if (!n || n.length < 4) continue;
        x1 = +n[0]; y1 = +n[1]; x2 = +n[n.length - 2]; y2 = +n[n.length - 1];
      }
      if (![x1, y1, x2, y2].every(isFinite)) continue;
      const dx = x2 - x1, dy = -(y2 - y1);          // SVG y grows downward
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      if (Math.abs(dy) < 2) return 0;
      if (Math.abs(dx) < 2) return null;            // vertical: undefined slope
      return dy / dx;
    }
    return null;
  },

  solveRateDescription() {
    const s = this.drawnSlope(); if (s === null) return null;
    const want = s > 0 ? 'positive' : (s < 0 ? 'negative' : 'zero');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')]
      .map(e => this.ascii(e.innerText).toLowerCase());
    const i = ch.findIndex(c => c.includes(want));
    return i < 0 ? { miss: want } : { i, want };
  },
});
window.__duo.RULES.splice(2, 0, ['solveRateDescription', /description of the rate|rate of change is/i]);
;'__duo ready';
