
// ---- synthetic slider drags: removes the manual `computer` tool from the loop ----
// Earlier notes said slider drags REQUIRE a real left_click_drag. That was wrong, and
// it was the single biggest throughput limit. Three things have to be right at once:
//   1. construct events with the IFRAME's own PointerEvent/MouseEvent (not the top
//      window's) and pass view: iframe.contentWindow
//   2. dispatch on the thumb element itself, not on elementFromPoint
//   3. send pointer AND mouse moves, to both the thumb and the iframe document
// Miss any one and the thumb silently does not move.
Object.assign(window.__duo, {
  async dragSynth(from, to) {
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.slider1d-thumb,.slider2d-thumb'));
    if (!f) return false;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), W = f.contentWindow;
    const th = d.querySelector('.slider1d-thumb,.slider2d-thumb'); if (!th) return false;
    const P = W.PointerEvent, M = W.MouseEvent;
    const fire = (tgt, type, x, y, C, btn) => tgt.dispatchEvent(new C(type, {
      bubbles: true, cancelable: true, composed: true, view: W,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: btn,
      clientX: x - fr.left, clientY: y - fr.top, screenX: x, screenY: y }));
    fire(th, 'pointerover', from[0], from[1], P, 0);
    fire(th, 'pointerenter', from[0], from[1], P, 0);
    fire(th, 'pointerdown', from[0], from[1], P, 1);
    fire(th, 'mousedown', from[0], from[1], M, 1);
    const n = 14;
    for (let i = 1; i <= n; i++) {
      const x = from[0] + (to[0] - from[0]) * i / n, y = from[1] + (to[1] - from[1]) * i / n;
      fire(th, 'pointermove', x, y, P, 1); fire(d, 'pointermove', x, y, P, 1);
      fire(th, 'mousemove', x, y, M, 1);  fire(d, 'mousemove', x, y, M, 1);
      await this.sleep(28);
    }
    fire(th, 'pointerup', to[0], to[1], P, 0);
    fire(th, 'mouseup', to[0], to[1], M, 0);
    await this.sleep(500);
    return true;
  },

  // always verify the widget landed where planned BEFORE pressing CHECK
  async autoDrag() {
    const p = this.plan(); if (!p || !p.from || !p.to) return false;
    if (!await this.dragSynth(p.from, p.to)) return false;
    if (p.kind === 'ineq') { const g = this.readIneqGraph(); if (!g || g.v !== p.v || g.op !== p.op) return false; }
    return true;
  },

  // an open endpoint is still painted a solid colour, so computed `fill` cannot tell
  // open from closed — the state lives in the parent <g class="point ... open|closed">
  readIneqGraph() {
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.static-points circle,.slider1d-thumb'));
    if (!f) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), sc = this.lineScale();
    if (!sc) return null;
    const c = [...d.querySelectorAll('.static-points circle,circle')].map(e => {
      const r = e.getBoundingClientRect(); return { e, cx: fr.left + r.left + r.width / 2, w: r.width };
    }).filter(o => o.w > 6).sort((a, b) => b.w - a.w)[0];
    if (!c) return null;
    const v = Math.round((c.cx - sc.px(0)) / sc.u);
    const cls = String((c.e.closest('g.point') || c.e.parentElement || {}).getAttribute
      ? (c.e.closest('g.point') || c.e.parentElement).getAttribute('class') || '' : '');
    const filled = /closed|filled|solid/.test(cls) || !/open/.test(cls);
    const ov = d.querySelector('.slider-axis-overlay'); if (!ov) return null;
    const r = ov.getBoundingClientRect();
    const left = (fr.left + r.left + r.width / 2) < c.cx;
    return { v, op: left ? (filled ? '<=' : '<') : (filled ? '>=' : '>'), filled, cls };
  },

  // an empty <tspan> coerces to 0 (not NaN) and injected a bogus v=0 label cluster,
  // which silently broke every number-line scale
  lineScale() {
    const frames = [...document.querySelectorAll('iframe')].filter(f => f.contentDocument);
    let best = null;
    for (const f of frames) {
      const d = f.contentDocument, fr = f.getBoundingClientRect();
      const labs = [...d.querySelectorAll('text,tspan')].map(e => {
        const t = e.textContent.trim(); if (!t) return null;
        const r = e.getBoundingClientRect();
        return { v: +this.ascii(t).replace(/[−–]/g, '-'),
                 x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 };
      }).filter(o => o && !isNaN(o.v) && o.x > 0);
      if (labs.length < 3) continue;
      const row = {}; labs.forEach(o => { const k = Math.round(o.y / 10) * 10; (row[k] = row[k] || []).push(o); });
      const grp = Object.values(row).sort((a, b) => b.length - a.length)[0];
      if (!grp || grp.length < 3 || new Set(grp.map(o => o.v)).size < 3) continue;
      if (!best || grp.length > best.length) best = grp;
    }
    if (!best) return null;
    const s = best.slice().sort((a, b) => a.v - b.v), lo = s[0], hi = s[s.length - 1];
    const u = (hi.x - lo.x) / (hi.v - lo.v); if (!isFinite(u) || !u) return null;
    return { px: v => Math.round(lo.x + (v - lo.v) * u), y: Math.round(lo.y), lo: lo.v, hi: hi.v, u };
  },

  // frameEl() returns the last frame, which in a guided lesson is the EMPTY one —
  // find whichever frame actually holds the thumb
  ineqPlan() {
    const q = this.ineqFromPrompt(); if (!q) return null;
    const sc = this.lineScale(); if (!sc || q.n < sc.lo || q.n > sc.hi) return null;
    // guided lessons STACK one iframe per step; the live one is the last with
    // content, so scan in reverse or a solved step's graph answers the new question
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument).reverse()) {
      const th = f.contentDocument.querySelector('.slider1d-thumb'); if (!th) continue;
      const fr = f.getBoundingClientRect(), r = th.getBoundingClientRect();
      const y = Math.round(fr.top + r.top + r.height / 2);
      return { kind: 'ineq', v: q.n, op: q.op,
        from: [Math.round(fr.left + r.left + r.width / 2), y], to: [sc.px(q.n), y] };
    }
    return null;
  },

  // any value satisfying the inequality
  __ineqType() {
    let q = this.ineqFromPrompt();
    if (!q) { const g = this.readIneqGraph(); if (g) q = { op: g.op, n: g.v }; }
    if (!q) return null;
    return (q.op === '<=' || q.op === '>=') ? q.n : (q.op === '<' ? q.n - 1 : q.n + 1);
  },
});

// typed answers never consult RULES — they go through typeAnswer


// run2 used to log 'needdrag' and stop dead; now it drags, verifies, and submits itself
(function () {
  const src = String(window.__duo.run2);
  const patched = src.replace(
    "if(this.plan()){this.S.log.push('needdrag');break;}",
    "if(this.plan()){if(await this.autoDrag()){this.S.log.push('drag');await this.sleep(300);"
    + "this.tap(document.querySelector('[data-test=\"player-next\"]'));await this.sleep(1500);"
    + "const b2=await this.blame();this.S.log.push(b2||'noblame');"
    + "if(b2==='correct'){this.S.done++;miss=0;}"
    + "else if(b2==='incorrect'&&++miss>=2){this.S.log.push('halt:2wrong');break;}"
    + "const c2=document.querySelector('[data-test=\"player-next\"]');"
    + "if(c2&&/CONTINUE/i.test(c2.innerText)){this.tap(c2);await this.sleep(1400);}"
    + "info=0;continue;}this.S.log.push('needdrag');break;}");
  if (patched !== src) window.__duo.run2 = eval('(' + patched + ')');
})();

;'__duo ready';

// ---- general linear inequality solving (unit 138 L3) ----
// Pattern-matching "ax OP b" with regexes kept failing as the forms multiplied
// (constant-first "9-3x>-12", brackets "3(2x+1)>4x+11", variables both sides,
// and "-x > 0" which is really x < 0). One small recursive-descent parser replaces
// all of them: reduce each side to {a,b} for a*x+b, then divide, flipping on a<0.
Object.assign(window.__duo, {
  flipOp(o) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[o] || o; },

  linear(t, v) {
    let i = 0; const S = t;
    const eat = c => { if (S[i] === c) { i++; return true; } return false; };
    function mul(x, y) {
      if (x.a && y.a) return null;                 // no quadratics here
      if (x.a) return { a: x.a * y.b, b: x.b * y.b };
      if (y.a) return { a: y.a * x.b, b: x.b * y.b };
      return { a: 0, b: x.b * y.b };
    }
    function factor() {
      if (eat('-')) { const q = factor(); return { a: -q.a, b: -q.b }; }
      if (eat('(')) { const q = expr(); eat(')'); return q; }
      let n = ''; while (/[0-9]/.test(S[i] || '')) n += S[i++];
      if (S[i] === v) { i++; return { a: n === '' ? 1 : +n, b: 0 }; }
      // consuming nothing here spins term()'s loop forever and hangs the renderer
      if (n === '') throw 'stuck';
      return { a: 0, b: +n };
    }
    function term() {
      let r = factor();
      for (;;) {
        if (eat('*')) { const q = factor(); r = mul(r, q); }
        else if (S[i] === '(' || /[a-z0-9]/.test(S[i] || '')) { const q = factor(); r = mul(r, q); }
        else return r;
      }
    }
    function expr() {
      let r = term();
      for (;;) {
        if (eat('+')) { const q = term(); r = { a: r.a + q.a, b: r.b + q.b }; }
        else if (eat('-')) { const q = term(); r = { a: r.a - q.a, b: r.b - q.b }; }
        else return r;
      }
    }
    let r; try { r = expr(); } catch (e) { return null; }
    return (i === S.length && r && isFinite(r.a) && isFinite(r.b)) ? r : null;
  },

  // one inequality -> its solved form, e.g. "3(2x+1)>4x+11" -> "x>4"
  solveOne(s) {
    const t = this.ineqNorm(s);
    // \frac{x}{d} + c OP b — ineqNorm collapses this to "fracxd+cOPb"
    const f = t.match(/^frac([a-z])(\d+)([+-]\d+)?(<=|>=|<|>)(-?\d+)$/);
    if (f) {
      const d = +f[2], c = f[3] ? +f[3] : 0, b = +f[5]; if (!d) return null;
      const v = (b - c) * d;
      return f[1] + f[4] + (Number.isInteger(v) ? v : +v.toFixed(4));
    }
    const m = t.match(/^(.+?)(<=|>=|<|>)(.+)$/); if (!m) return null;
    const v = (t.match(/[a-z]/) || [])[0]; if (!v) return null;
    const L = this.linear(m[1], v), R = this.linear(m[3], v); if (!L || !R) return null;
    const a = L.a - R.a, b = R.b - L.b; if (!a) return null;
    const op = a < 0 ? this.flipOp(m[2]) : m[2];
    const x = b / a; if (!isFinite(x)) return null;
    return v + op + (Number.isInteger(x) ? x : +x.toFixed(4));
  },

  // `~` non-breaking spaces and \emphasis{} silently broke every match here
  ineqNorm(s) {
    return this.ascii(s)
      .replace(/\\leq/g, '<=').replace(/\\geq/g, '>=')
      .replace(/\\le/g, '<=').replace(/\\ge/g, '>=')
      .replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/~|\\,/g, '')
      .replace(/emphasis|mathbf|textbf|text|emph/g, '')
      .replace(/\s|\\|\{|\}/g, '').toLowerCase();
  },

  // the prompt must be SOLVED, not pattern-matched: "-x > 0" graphs as x < 0.
  // \duodisplay lines are the widget's current state, never the target.
  ineqFromPrompt() {
    const L = this.promptLatex().filter(s => !/duodisplay/.test(s));
    for (const s of L) {
      const w = this.solveOne(s);
      if (w) { const m = w.match(/^[a-z](<=|>=|<|>)(-?[\d.]+)$/); if (m) return { op: m[1], n: +m[2] }; }
    }
    for (const s of L) { const m = this.ineqNorm(s).match(/[a-z](<=|>=|<|>)(-?\d+)/); if (m) return { op: m[1], n: +m[2] }; }
    return null;
  },

  solveIneqSolve() {
    const N = this.promptLatex().filter(s => !/duodisplay/.test(s)).map(s => this.ineqNorm(s));
    const qi = N.findIndex(s => s === '?');
    let want = qi > 0 ? this.solveOne(N[qi - 1]) : null;
    if (!want) for (const s of N) { const w = this.solveOne(s); if (w && s !== w) { want = w; break; } }
    if (!want) return null;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(x => x.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const i = S.findIndex(s => this.ineqNorm(s) === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // pairs of "ax OP b" against their solved forms — the stock pairs solver matches
  // identical text and never fires on these
  async ineqPairs() {
    const tk = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    if (tk.length < 4) return null;
    const txt = tk.map(e => { const a = e.querySelector('annotation'); return a ? a.textContent : this.ascii(e.innerText); });
    const norm = txt.map(s => this.ineqNorm(s)), sol = txt.map(s => this.solveOne(s));
    const used = new Set(); let n = 0;
    for (let i = 0; i < tk.length; i++) {
      if (used.has(i) || !sol[i]) continue;
      const j = norm.findIndex((s, k) => k !== i && !used.has(k) && s === sol[i]);
      if (j < 0) continue;
      used.add(i); used.add(j); n++;
      this.tap(tk[i]); await this.sleep(140); this.tap(tk[j]); await this.sleep(320);
    }
    if (!n) return null;
    const left = tk.filter(e => !/disabled|used|selected/i.test(String(e.className)) && e.offsetParent !== null);
    if (left.length === 2) { this.tap(left[0]); await this.sleep(140); this.tap(left[1]); await this.sleep(320); n++; }
    return { pairs: n };
  },

  // a plan can produce NaN coords, or a zero-length drag when the widget already
  // sits on the answer — neither is a failure
  async autoDrag() {
    const p = this.plan(); if (!p || !p.from || !p.to) return false;
    if (![p.from[0], p.from[1], p.to[0], p.to[1]].every(Number.isFinite)) return false;
    const match = () => { const q = this.readIneqGraph(); return q && q.v === p.v && q.op === p.op; };
    if (p.kind === 'ineq' && match()) return true;
    if (!await this.dragSynth(p.from, p.to)) return false;
    return p.kind === 'ineq' ? match() : true;
  },
});

// plan() only tried ineqPlan when the text said "inequality"/"solution set", so a
// prompt reading "Graph x < -1" fell through and the loop stalled on needdrag
(function () {
  const b = window.__duo.__planBase || window.__duo.plan;
  window.__duo.__planBase = b;
  window.__duo.plan = function () {
    if (this.ineqFromPrompt() && this.lineScale()) { const p = this.ineqPlan(); if (p) return p; }
    return b.call(this);
  };
})();



window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveIneqSolve');
window.__duo.RULES.splice(2, 0,
  ['solveIneqSolve', /complete the pattern|solve the inequality|select the solution/i]);

// walk levels unattended; state in localStorage so it survives navigation
window.__duo.autoLesson = async function () {
  const st = JSON.parse(localStorage.getItem('duoAuto'));
  this.S.busy = false; this.S.wrong = 0; this.S.log = []; this.S.done = 0;
  await this.run2(60);
  const tail = this.S.log.slice(-3).join(',');
  st.log.push('u' + st.unit + 'l' + st.level + ':' + this.S.done + '(' + tail + ')');
  const ok = /lessondone/.test(this.S.log.join(','));
  if (ok) { st.level++; if (st.level > 4) { st.level = 1; st.unit++; } } else { st.stuck = (st.stuck || 0) + 1; }
  localStorage.setItem('duoAuto', JSON.stringify(st));
  return { ok, done: this.S.done, tail, next: 'u' + st.unit + 'l' + st.level, stuck: st.stuck || 0 };
};

;'__duo ready';

// ---- core helpers ----
// These used to live in a bootstrap that was injected separately, so duo.js was
// never self-contained: losing the cached copy in the page lost `ascii` and `tap`
// while all 188 other members loaded fine. Defined here, and only if absent, so
// the file can rebuild the whole solver on its own.
(function () {
  const D = window.__duo;

  // Duolingo renders maths in the Unicode math-alphanumeric blocks (𝑥, 𝗑) and uses
  // U+2212 for minus. NFKC folds the alphabets back to ASCII; the rest is spacing.
  if (typeof D.ascii !== 'function') D.ascii = function (s) {
    return String(s == null ? '' : s).normalize('NFKC')
      .replace(/[−–—]/g, '-')
      .replace(/[    ]/g, ' ');
  };

  // A bare .click() is ignored by the sliders and tile banks; the full pointer +
  // mouse sequence works and does not need the window focused.
  if (typeof D.tap !== 'function') D.tap = function (el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const o = { bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }, o)));
    el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ buttons: 1 }, o)));
    el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 }, o)));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({ buttons: 0 }, o)));
    el.dispatchEvent(new MouseEvent('click', Object.assign({ buttons: 0 }, o)));
    return true;
  };

  if (typeof D.sleep !== 'function') D.sleep = ms => new Promise(r => setTimeout(r, ms));

  if (typeof D.keys !== 'function') D.keys = function () {
    return document.querySelectorAll('[data-test="challenge-keypad"] button, button[aria-label]');
  };

  // typed answers go through the on-screen maths keypad, not the DOM value
  if (typeof D.type !== 'function') D.type = function (s) {
    const inp = document.querySelector('[data-test="challenge-text-input"]');
    if (inp) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(inp, ''); inp.dispatchEvent(new Event('input', { bubbles: true }));
      set.call(inp, String(s)); inp.dispatchEvent(new Event('input', { bubbles: true }));
      return String(s);
    }
    for (const ch of String(s)) {
      const b = [...this.keys()].find(k => (k.getAttribute('aria-label') || k.textContent).trim() === (ch === '-' ? '−' : ch));
      if (b) this.tap(b);
    }
    return String(s);
  };

  if (!D.S) D.S = { log: [], done: 0, running: false, busy: false, wrong: 0, noop: 0 };
})();
;'__duo ready';
