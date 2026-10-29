
// ---- guided lessons stack iframes ----
// A guided lesson KEEPS EVERY PREVIOUS STEP'S IFRAME in the DOM (8 of them by
// the end), and the very last one is empty. querySelector('iframe') therefore
// returns a STALE table and every lookup silently answers the wrong question.
// Take the lowest iframe on the page that actually has content.
window.__duo.frameEl = function () {
  const cand = [...document.querySelectorAll('iframe')].filter(f => {
    if (!f.contentDocument) return false;
    const r = f.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return false;
    return [...f.contentDocument.querySelectorAll('*')]
      .filter(e => e.children.length === 0 && e.textContent.trim()).length > 3;
  });
  if (!cand.length) return null;
  return cand.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[cand.length - 1];
};

// In guided lessons latex[0] is the LESSON TITLE; the live question is the last
// \text{} instruction.
window.__duo.prompt = function () {
  const L = this.read().latex;
  for (let i = L.length - 1; i >= 0; i--) {
    const s = this.ascii(L[i]).replace(/[{}\\]|mathbf|textbf|text/g, '').replace(/~/g, ' ').trim();
    if (/[a-z]{4,}/i.test(s)) return s.toLowerCase();
  }
  return this.ascii(L[0] || '').toLowerCase();
};

Object.assign(window.__duo, {
  gridCells() {
    const f = this.frameEl(); if (!f) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const cells = [...d.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim())
      .map(e => { const r = e.getBoundingClientRect();
        return { t: this.ascii(e.textContent.trim()), x: fr.left + r.left + r.width / 2,
                 y: fr.top + r.top + r.height / 2, w: r.width, h: r.height }; })
      .filter(c => c.w > 0 && c.h > 0);
    if (cells.length < 6) return null;
    const cluster = (vals, tol) => { const s = [...vals].sort((a, b) => a - b), out = [];
      s.forEach(v => { const g = out.find(g => Math.abs(g[0] - v) < tol); if (g) g.push(v); else out.push([v]); });
      return out.map(g => g.reduce((a, b) => a + b, 0) / g.length); };
    const ys = cluster(cells.map(c => c.y), 14), xs = cluster(cells.map(c => c.x), 24);
    const near = (v, arr) => arr.reduce((b, a, i) => Math.abs(a - v) < Math.abs(arr[b] - v) ? i : b, 0);
    const grid = ys.map(() => xs.map(() => ''));
    cells.forEach(c => { grid[near(c.y, ys)][near(c.x, xs)] = c.t; });
    return { grid, xs, ys };
  },

  table() {
    const f = this.frameEl(); if (!f) return null;
    const ts = [...f.contentDocument.querySelectorAll('table')];
    const t = ts.length ? ts[ts.length - 1] : null;
    if (t) return [...t.rows].map(r => [...r.cells].map(c => this.ascii(c.textContent.trim())));
    const g = this.gridCells();
    return g ? g.grid.map(r => r.filter(v => v !== '')).filter(r => r.length) : null;
  },

  // Structured read for the status app's native preview (same idea as
  // ChessBoardView reading a FEN instead of a screenshot): prompt text +
  // the answer-choice pool + any table/pattern grid, all already-solved
  // reads (prompt(), table(), challenge-choice) reused as-is. Returns null
  // fields, never throws — a geometry/SVG/number-line widget with nothing
  // textual to show just yields {prompt, choices:null, table:null}, and the
  // status app falls back to a screenshot for those only.
  widget() {
    let prompt = null; try { prompt = this.prompt(); } catch {}
    const choices = [...document.querySelectorAll('[data-test="challenge-choice"]')]
      .map(e => e.innerText.replace(/\n/g, ' ').trim()).filter(Boolean);
    let table = null; try { table = this.table(); } catch {}
    return { prompt, choices: choices.length ? choices : null, table };
  },

  grandTotal() {
    const T = this.table(); if (!T || T.length < 2) return null;
    const body = T.slice(1);
    const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
    const tot = body.find(r => /total/i.test(String(r[0])));
    if (tot) return tot.slice(1).reduce((a, v) => a + (num(v) || 0), 0);
    return body.reduce((a, r) => a + r.slice(1).reduce((b, v) => b + (num(v) || 0), 0), 0);
  },

  // joint relative frequency = cell / GRAND total; conditional uses a row/column total
  solveRelFreq() {
    const g = this.grandTotal(); if (!g) return null;
    const joint = /joint/i.test(this.tex());
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const den = s => { const m = s.replace(/\s/g, '').match(/frac\{?(\d+)\}?\{?(\d+)\}?/i); return m ? +m[2] : null; };
    const i = joint ? src.findIndex(s => den(s) === g)
                    : src.findIndex(s => den(s) !== null && den(s) !== g);
    return i < 0 ? null : { i, want: src[i] };
  },

  solveTableCell() {
    const T = this.table(); if (!T || T.length < 2) return null;
    const L0 = this.prompt();
    const head = T[0], body = T.slice(1);
    const off = body.length ? body[0].length - head.length : 0;
    let col = -1; head.forEach((h, i) => { if (this.hdrMatch(h, L0)) col = i; });
    let row = null; body.forEach(r => { if (this.hdrMatch(r[0], L0)) row = r; });
    if (!row || col < 0) return null;
    const v = row[col + off];
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(v));
    return i < 0 ? { miss: v } : { i, want: v };
  },
});

// guided steps: read the table cell, the grand total, or a plain lookup


window.__duo.RULES.splice(2, 0, ['solveRelFreq', /relative frequency/i]);

;'__duo ready';

// read().latex includes the CHOICES' annotations, so prompt()/phantom() must
// exclude them or they return an answer option instead of the question
Object.assign(window.__duo, {
  promptLatex() {
    return [...document.querySelectorAll('[data-test^="challenge "] annotation')]
      .filter(a => !a.closest('[data-test="challenge-choice"]'))
      .map(a => a.textContent);
  },

  prompt() {
    const L = this.promptLatex();
    for (let i = L.length - 1; i >= 0; i--) {
      const s = this.ascii(L[i]).replace(/[{}\\]|mathbf|textbf|text/g, '').replace(/~/g, ' ').trim();
      if (/[a-z]{4,}/i.test(s)) return s.toLowerCase();
    }
    const H = document.querySelector('[data-test="challenge-header"]');
    return this.ascii(H ? H.innerText : (L[0] || '')).toLowerCase();
  },

  phantom() {
    const L = this.promptLatex().join(' ');
    const i = L.indexOf('\\phantom{'); if (i < 0) return null;
    let j = i + 9, dep = 1, out = '';
    while (j < L.length && dep > 0) { const ch = L[j];
      if (ch === '{') dep++; else if (ch === '}') { dep--; if (!dep) break; }
      out += ch; j++; }
    return out;
  },

  // joint       = CELL / grand total
  // marginal    = MARGINAL TOTAL / grand total   (also over the grand total!)
  // conditional = cell / a marginal total
  // Treating "not joint" as "not over the grand total" cost two answers, and
  // the choices arrive SIMPLIFIED (40/64 shown as 5/8) so compare by VALUE.
  solveRelFreq() {
    const T = this.table(); if (!T) return null;
    const g = this.grandTotal(); if (!g) return null;
    const P = this.prompt();
    const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
    const head = T[0], body = T.slice(1);
    const off = body.length ? body[0].length - head.length : 0;
    const totRow = body.find(r => /total/i.test(String(r[0])));
    const kind = /marginal/i.test(P) ? 'marginal' : (/conditional/i.test(P) ? 'conditional' : 'joint');
    let target = null;
    if (kind === 'marginal') {
      head.forEach((h, i) => { if (!this.hdrMatch(h, P)) return;
        const v = totRow ? num(totRow[i + off])
          : body.filter(r => !/total/i.test(String(r[0]))).reduce((a, r) => a + (num(r[i + off]) || 0), 0);
        if (v) target = v / g; });
      if (target === null) body.forEach(r => { if (/total/i.test(String(r[0]))) return;
        if (this.hdrMatch(r[0], P)) { const s = r.slice(1).reduce((a, v) => a + (num(v) || 0), 0); if (s) target = s / g; } });
    } else {
      let col = -1; head.forEach((h, i) => { if (this.hdrMatch(h, P)) col = i; });
      let row = null; body.forEach(r => { if (this.hdrMatch(r[0], P)) row = r; });
      if (row && col >= 0) { const cell = num(row[col + off]);
        if (kind === 'joint') target = cell / g;
        else { const colTot = totRow ? num(totRow[col + off]) : null;
          const rowTot = row.slice(1).reduce((a, v) => a + (num(v) || 0), 0);
          target = cell / (colTot || rowTot); } }
    }
    if (target === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const val = s => { const m = s.replace(/\s/g, '').match(/frac\{?(\d+)\}?\{?(\d+)\}?/i);
      if (m) return +m[1] / +m[2];
      const p = parseFloat(s.replace(/[^\d.]/g, '')); return isNaN(p) ? null : p; };
    const i = src.findIndex(s => { const v = val(s); return v !== null && Math.abs(v - target) < 0.01; });
    return i < 0 ? { miss: target, kind } : { i, want: target, kind };
  },

  solveGrandTotal() {
    const v = this.grandTotal(); if (!v) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(v));
    return i < 0 ? { miss: v } : { i, want: v };
  },

  // use prompt() (the live step), not latex[0] (the lesson title)
  solveTableTotal() {
    const T = this.table(); if (!T || T.length < 2) return null;
    const L0 = this.prompt();
    const head = T[0], body = T.slice(1);
    const num = s => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(v) ? null : v; };
    const off = body.length ? body[0].length - head.length : 0;
    const totalRow = body.find(r => /total/i.test(String(r[0])));
    let want = null;
    head.forEach((h, i) => { if (!this.hdrMatch(h, L0)) return;
      if (totalRow) { const v = num(totalRow[i + off]); if (v !== null) want = v; }
      else { const s = body.filter(r => !/total/i.test(String(r[0])))
        .reduce((a, r) => a + (num(r[i + off]) || 0), 0); if (s) want = s; } });
    if (want === null) body.forEach(r => { if (/total/i.test(String(r[0]))) return;
      if (this.hdrMatch(r[0], L0)) { const s = r.slice(1).reduce((a, v) => a + (num(v) || 0), 0); if (s) want = s; } });
    if (want === null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },
});



window.__duo.RULES.splice(2, 0,
  ['solveGrandTotal', /grand total|total number of/i],
  ['solveTableTotal', /marginal total|total frequency for|total for/i]);

;'__duo ready';

// relative-frequency choices may be a fraction, a decimal, OR a percentage
(function () {
  const prev = window.__duo.solveRelFreq;
  window.__duo.solveRelFreq = function () {
    const r = prev.call(this);
    if (!r || r.i >= 0) return r;
    const target = r.miss; if (typeof target !== 'number') return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const val = s => { const t = s.replace(/\s|\\|mathbf|textbf|\{|\}/g, '');
      const f = t.match(/frac(\d+)(\d+)/); if (f) return +f[1] / +f[2];
      const p = t.match(/(-?\d+(?:\.\d+)?)%/); if (p) return +p[1] / 100;
      const n = parseFloat(t); return isNaN(n) ? null : n; };
    const i = src.findIndex(s => { const v = val(s); return v !== null && Math.abs(v - target) < 0.005; });
    return i < 0 ? r : { i, want: target, kind: r.kind };
  };
  // typed relative frequency wants a decimal (placeholder reads "Example: 0.2")
  const prevType = window.__duo.typeAnswer;
  window.__duo.typeAnswer = function () {
    const P = this.prompt();
    if (/relative frequency/i.test(P)) {
      const r = this.solveRelFreq();
      const v = r && (r.want !== undefined ? r.want : r.miss);
      if (typeof v === 'number' && isFinite(v)) { const t = String(+v.toFixed(4)); this.type(t); return t; }
    }
    return prevType.call(this);
  };
})();

;'__duo ready';

// ---- exponent laws (unit 136) ----
Object.assign(window.__duo, {
  // x^a·x^b = x^(a+b); x^a/x^b = x^(a-b); (x^a)^b = x^(ab). Any base, not just x.
  expValue(s) {
    const t = this.ascii(s).replace(/\s/g, '').replace(/[\\{}]|mathbf|textbf|left|right/g, '').replace(/[⋅·]/g, 'cdot');
    let m = t.match(/^([a-z])\^?(-?\d+)cdot\1\^?(-?\d+)$/i); if (m) return (+m[2]) + (+m[3]);
    m = t.match(/^frac([a-z])\^?(-?\d+)\1\^?(-?\d+)$/i); if (m) return (+m[2]) - (+m[3]);
    m = t.match(/^\(?([a-z])\^?(-?\d+)\)?\^(-?\d+)$/i); if (m) return (+m[2]) * (+m[3]);
    m = t.match(/^([a-z])\^?(-?\d+)$/i); if (m) return +m[2];
    return null;
  },

  // compound expressions: simplify EACH term and compare the per-base signature
  expSig(s) {
    const t = this.ascii(s).replace(/\s/g, '').replace(/[\\{}]|mathbf|textbf|left|right/g, '').replace(/[⋅·]/g, 'cdot');
    const terms = t.split(/(?=[+-])/).filter(Boolean), sig = [];
    for (const term of terms) {
      const u = term.replace(/^[+-]/, '');
      let m = u.match(/^([a-z])\^?(-?\d+)cdot\1\^?(-?\d+)$/i);
      if (m) { sig.push(m[1].toLowerCase() + ':' + ((+m[2]) + (+m[3]))); continue; }
      m = u.match(/^frac([a-z])\^?(-?\d+)\1\^?(-?\d+)$/i);
      if (m) { sig.push(m[1].toLowerCase() + ':' + ((+m[2]) - (+m[3]))); continue; }
      m = u.match(/^\(?([a-z])\^?(-?\d+)\)?\^(-?\d+)$/i);
      if (m) { sig.push(m[1].toLowerCase() + ':' + ((+m[2]) * (+m[3]))); continue; }
      m = u.match(/^([a-z])\^?(-?\d+)$/i);
      if (m) { sig.push(m[1].toLowerCase() + ':' + (+m[2])); continue; }
      return null;
    }
    return sig.length ? sig.join('|') : null;
  },

  solveExpLaw() {
    let target = null;
    for (const s of this.promptLatex()) { const v = this.expValue(s); if (v !== null) { target = v; break; } }
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    if (target !== null) {
      let i = src.findIndex(s => this.expValue(s) === target);
      // choices may be EXPANSIONS (x·x·x…) rather than powers
      if (i < 0) { const count = e => (this.norm(this.ascii(e.innerText)).match(/[a-z]/gi) || []).length;
        i = c.findIndex(e => count(e) === target); }
      if (i >= 0) return { i, want: target };
    }
    // compound: match the per-base signature
    let sig = null;
    for (const s of this.promptLatex()) { const v = this.expSig(s); if (v) { sig = v; break; } }
    if (!sig) return null;
    const i = src.findIndex(s => this.expSig(s) === sig);
    return i < 0 ? { miss: sig } : { i, want: sig };
  },

  // "Complete the pattern": the missing cell shows as "?" — take the entry
  // before it. The right column is either the expansion or the symbolic sum.
  solveExpandPattern() {
    const L = this.promptLatex().map(s => this.ascii(s).replace(/\s/g, '').replace(/[\\{}]|mathbf|textbf/g, ''));
    const q = L.findIndex(s => s === '?' || /\?/.test(s));
    const src = q > 0 ? L[q - 1] : null; if (!src) return null;
    const ex = [...src.matchAll(/([a-z])\^?(-?\d+)/gi)].map(m => +m[2]);
    if (ex.length < 2) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const count = e => (this.norm(this.ascii(e.innerText)).match(/[a-z]/gi) || []).length;
    let i = c.findIndex(e => count(e) === ex[0] + ex[1]);
    if (i >= 0) return { i, want: ex[0] + ex[1] };
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const want = new RegExp('\\^\\{?' + ex[0] + '\\+' + ex[1] + '\\}?');
    i = tex.findIndex(s => want.test(s.replace(/\s/g, '')));
    if (i < 0) i = tex.findIndex(s => /\+/.test(s));
    return i < 0 ? null : { i, want: ex[0] + '+' + ex[1] };
  },

  // match-the-pairs: a rendered fraction has no slash in innerText, so read the
  // token's own LaTeX
  tokenExp(el) {
    let s = null;
    if (el && el.querySelector) { const a = el.querySelector('annotation'); if (a) s = a.textContent; }
    if (s === null) s = (typeof el === 'string') ? el : (el.innerText || '');
    return this.expValue(s);
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
          this.tap(tok[i]); await this.sleep(320); this.tap(tok[j]); await this.sleep(420); n++; break; }
      }
    }
    return { pairs: n, vals };
  },
});

// run2 must also handle match-the-pairs (tap tokens; no choices, no input)

window.__duo.RULES.splice(2, 0,
  ['solveExpandPattern', /complete the pattern/i],
  ['solveExpLaw', null]);

;'__duo ready';
