
// ---- parallel lines and angles (unit 129) ----
Object.assign(window.__duo, {
  // latex writes \degree, the choice renders ° — drop both before comparing
  clean(s) {
    return this.norm(this.ascii(s).replace(/\\degree|°/g, '').replace(/\\|mathbf|textbf|text|\{|\}/g, ''));
  },
  // ascii() maps the math-italic CAPITAL block to lowercase, so uppercase first
  letter(s) { return this.norm(this.ascii(s).replace(/\s/g, '').toUpperCase()); },

  // The angle labels and the given value ARE in the iframe as <text> — an
  // over-tight filter hid them. Group into the two intersections by y, then
  // assign each a quadrant: 0=UL 1=UR 2=LR 3=LL.
  angleMap() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const items = [...d.querySelectorAll('text,tspan')].map(e => { const r = e.getBoundingClientRect();
      return { t: this.ascii(e.textContent.trim()).toUpperCase().replace('°', ''),
               x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 }; })
      .filter(o => o.t && (/^[A-Z]$/.test(o.t) || /^\d+$/.test(o.t)));
    if (items.length < 4) return null;
    const ys = items.map(o => o.y), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    const grp = o => o.y < mid ? 0 : 1, cent = {};
    [0, 1].forEach(g => { const m = items.filter(o => grp(o) === g); if (!m.length) return;
      cent[g] = [m.reduce((s, o) => s + o.x, 0) / m.length, m.reduce((s, o) => s + o.y, 0) / m.length]; });
    items.forEach(o => { const c = cent[grp(o)]; if (!c) return;
      const right = o.x > c[0], below = o.y > c[1];
      o.g = grp(o); o.q = !below && !right ? 0 : (!below && right ? 1 : (below && right ? 2 : 3)); });
    return items;
  },

  // With parallel lines the rule is pure parity: quadrants differing by an EVEN
  // number are equal, ODD are supplementary. No degree label at all means the
  // diagram carries right-angle markers, so everything is 90.
  solveAngleMeasure() {
    const m = this.tex().match(/angle\s+([A-Z])\b/i); if (!m) return null;
    const items = this.angleMap(); if (!items) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const given = items.find(o => /^\d+$/.test(o.t));
    if (!given) { const i = c.findIndex(e => this.clean(e.innerText) === '90');
      return i < 0 ? null : { i, want: 90 }; }
    const tgt = items.find(o => o.t === m[1].toUpperCase()); if (!tgt) return null;
    const g = +given.t, want = ((tgt.q - given.q) % 2 === 0) ? g : 180 - g;
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  solveAnglePair() {
    const L = this.tex(), supp = /supplementary/i.test(L), equal = /equal|congruent/i.test(L);
    if (!supp && !equal) return null;
    const items = this.angleMap(); if (!items) return null;
    const Q = {}; items.forEach(o => { if (/^[A-Z]$/.test(o.t)) Q[o.t] = o.q; });
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => { const ls = this.letter(e.innerText).split(',').map(s => s.trim()).filter(s => s in Q);
      if (ls.length !== 2) return false;
      const dif = Math.abs(Q[ls[0]] - Q[ls[1]]) % 2;
      return supp ? dif === 1 : dif === 0; });
    return i < 0 ? { miss: supp ? 'odd' : 'even' } : { i, want: this.letter(c[i].innerText) };
  },

  solveAngleRel() {
    const L = this.tex(); const m = L.match(/angle to\s+([A-Z])\b/i) || L.match(/\bto\s+([A-Z])\b/i);
    if (!m) return null;
    const items = this.angleMap(); if (!items) return null;
    const src = items.find(o => o.t === m[1].toUpperCase()); if (!src) return null;
    let want = null;
    if (/corresponding/i.test(L))              want = { g: 1 - src.g, q: src.q };
    else if (/vertical/i.test(L))              want = { g: src.g, q: (src.q + 2) % 4 };
    else if (/alternate/i.test(L))             want = { g: 1 - src.g, q: (src.q + 2) % 4 };
    else if (/co-?interior|same-?side/i.test(L)) want = { g: 1 - src.g, q: (src.q + 1) % 4 };
    if (!want) return null;
    const hit = items.find(o => /^[A-Z]$/.test(o.t) && o.g === want.g && o.q === want.q);
    if (!hit) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.letter(e.innerText) === hit.t);
    return i < 0 ? { miss: hit.t } : { i, want: hit.t };
  },

  // "Create a supplementary/complementary pair with N": the slider is one angle
  anglePlan() {
    const L = this.tex(), sl = this.sliderPx(0); if (!sl) return null;
    let m = /create the angles/i.test(L) ? L.match(/=\s*(\d+)\s*degree/) : null;
    if (!m) m = L.match(/(?:supplementary|complementary)[^0-9]{0,30}(\d+)\s*degree/i) || L.match(/(\d+)\s*degree/);
    if (!m) return null;
    const total = /complementary/i.test(L) ? 90 : 180;
    for (const v of [+m[1], total - +m[1]])
      if (v >= sl.lo && v <= sl.hi) return { v, from: sl.from, to: this.sliderPx(v).to };
    return null;
  },
});

(function () {
  const prev = window.__duo.plan;
  window.__duo.plan = function () {
    if (/supplementary|complementary|create the angles/i.test(this.tex())) {
      const a = this.anglePlan(); if (a) return { kind: 'angle', v: a.v, from: a.from, to: a.to };
    }
    return prev.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveAngleMeasure', /measure of angle/i],
  ['solveAnglePair', /pair of (supplementary|equal|congruent)/i],
  ['solveAngleRel', /(corresponding|vertical|alternate|co-?interior|same-?side).{0,12}angle/i]);

;'__duo ready';

// ---- guided multi-step lessons ----
// Their latex accumulates EVERY step, so a prompt regex keeps matching a
// question that is already answered (this cost 5 wrong answers in a row).
// Gate on the SHAPE of the choices instead — that is always the live question.
Object.assign(window.__duo, {
  solveAngleEquation() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (!txt.length || !txt.every(t => t.includes('='))) return null;   // must be equations
    const supp = /supplementary|sum to 180|add(?: up)? to 180/i.test(this.tex());
    const i = txt.findIndex(t => supp ? /=180$/.test(t) : !/=180$/.test(t));
    return i < 0 ? null : { i, want: txt[i] };
  },

  solveRelName() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.ascii(e.innerText).toLowerCase().replace(/\s+/g, ''));
    if (!txt.length || !txt.every(t => /angles$/.test(this.norm(t)))) return null;  // must be names
    const m = this.tex().match(/use\s+((?:alternate|corresponding|vertical|co-?interior|same-?side)[a-z\s]*angles)/i);
    if (!m) return null;
    const want = m[1].toLowerCase().replace(/\s+/g, '');
    const i = txt.findIndex(t => t.includes(want));
    return i < 0 ? null : { i, want };
  },

  // Explainer screens have a challenge but nothing to answer, and CHECK is
  // already enabled — just continue. Halt after 2 wrong in a row: a mis-gated
  // solver is confident and will otherwise spend the whole lesson.
  async run2(n) {
    this.S = { running: true, log: [], done: 0 };
    let miss = 0, info = 0;
    for (let i = 0; i < n && this.S.running; i++) {
      const n0 = document.querySelector('[data-test="player-next"]');
      if (n0 && /CONTINUE/i.test(n0.innerText || '') && !document.querySelector('[data-test^="challenge "]')) {
        this.tap(n0); await this.sleep(1500); continue;
      }
      const r = this.read();
      if (!r.type) { this.S.log.push('lessondone'); break; }
      if (this.plan()) { this.S.log.push('needdrag'); break; }

      let acted = false;
      if (r.choices.length) { const s = this.solveChoices();
        if (s && s.ok) { s.idx.forEach(j => this.tap(document.querySelectorAll('[data-test="challenge-choice"]')[j])); acted = true; } }
      else if (r.input) { acted = !!this.typeAnswer(); }
      else if (n0 && !/disabled/i.test(n0.className)) {
        // explainer screen — but cap it, or a question we cannot answer spins forever
        if (++info >= 3) { this.S.log.push('stuck:info-loop'); break; }
        this.tap(n0); await this.sleep(1600); this.S.log.push('info'); continue;
      }
      if (!acted) { this.S.log.push('stuck:' + r.type); break; }
      info = 0;

      await this.sleep(350);
      this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1700);
      const bl = ((document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test || '').replace('blame blame-', '');
      this.S.log.push(bl || 'noblame');
      if (bl === 'correct') { this.S.done++; miss = 0; }
      else if (bl === 'incorrect' && ++miss >= 2) { this.S.log.push('halt:2wrong'); break; }
      if (!bl) break;
      const nx = document.querySelector('[data-test="player-next"]');
      if (nx && /CONTINUE/i.test(nx.innerText)) { this.tap(nx); await this.sleep(1500); }
    }
    this.S.running = false;
    return this.S;
  },
});

window.__duo.RULES.splice(2, 0,
  ['solveRelName', null],
  ['solveAngleEquation', null]);

;'__duo ready';

// ---- transversal geometry: two marked angles ----
// The whole parallel-lines rule collapses to s = (above XOR right):
// equal s => congruent, different s => supplementary. That one line covers
// vertical, corresponding, both alternates and co-interior.
Object.assign(window.__duo, {
  marked() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const B = e => { const r = e.getBoundingClientRect();
      return { x: fr.left + r.left, y: fr.top + r.top, w: r.width, h: r.height,
               cx: fr.left + r.left + r.width / 2, cy: fr.top + r.top + r.height / 2 }; };
    const segs = [...d.querySelectorAll('line,path,polyline')].map(B).filter(o => o.w > 40 || o.h > 40);
    const horiz = segs.filter(o => o.h < 6 && o.w > 100).sort((a, b) => a.cy - b.cy);
    const trans = segs.find(o => o.h > 60 && o.w > 10);
    if (horiz.length < 2 || !trans) return null;
    const xAt = y => { const t = (y - trans.y) / trans.h; return trans.x + trans.w * (1 - t); };
    const labs = [...d.querySelectorAll('text,tspan')].map(e => ({ t: this.ascii(e.textContent.trim()), ...B(e) })).filter(o => o.t);
    if (labs.length < 2) return null;
    return labs.map(o => {
      const line = Math.abs(o.cy - horiz[0].cy) < Math.abs(o.cy - horiz[1].cy) ? 0 : 1;
      return { t: o.t, line, above: o.cy < horiz[line].cy, right: o.cx > xAt(o.cy) };
    });
  },

  markedRel() {
    const m = this.marked(); if (!m || m.length < 2) return null;
    const s = o => ((o.above ? 1 : 0) ^ (o.right ? 1 : 0));
    return { equal: s(m[0]) === s(m[1]), labels: m.map(o => o.t) };
  },

  solveMarkedEquation() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (!txt.length || !txt.every(t => t.includes('='))) return null;
    const rel = this.markedRel(); if (!rel) return null;
    const nums = this.marked().map(o => o.t.replace(/[°\s]/g, ''));
    const val = nums.find(t => /^\d+$/.test(t)), expr = nums.find(t => !/^\d+$/.test(t));
    if (!val || !expr) return null;
    const want = rel.equal ? expr + '=' + val : expr + '+' + val + '=180';
    let i = txt.indexOf(want);
    if (i < 0) i = txt.findIndex(t => rel.equal ? t.endsWith('=' + val) : /=180$/.test(t));
    return i < 0 ? { miss: want } : { i, want };
  },

  // one label and no number => right-angle markers, so the angle is 90
  solveForX() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const labs = [...f.contentDocument.querySelectorAll('text,tspan')]
      .map(e => this.ascii(e.textContent.trim()).replace(/°/g, '').trim()).filter(Boolean);
    const val = labs.find(t => /^\d+$/.test(t)), expr = labs.find(t => !/^\d+$/.test(t) && /x/i.test(t));
    if (!expr) return null;
    let rhs;
    if (val) { const rel = this.markedRel(); if (!rel) return null; rhs = rel.equal ? +val : 180 - +val; }
    else rhs = 90;
    const e = expr.replace(/\s+/g, '').replace(/[𝑥𝗑]/gi, 'x').toLowerCase();
    const mm = e.match(/^(-?\d*)x([+-]\d+)?$/); if (!mm) return null;
    const a = mm[1] === '' || mm[1] === '+' ? 1 : (mm[1] === '-' ? -1 : +mm[1]);
    return { x: (rhs - (mm[2] ? +mm[2] : 0)) / a, rhs, expr: e };
  },

  solveXChoice() {
    const r = this.solveForX(); if (!r) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(r.x));
    return i < 0 ? { miss: r.x } : { i, want: r.x };
  },
});

window.__duo.RULES.splice(2, 0,
  ['solveMarkedEquation', null],
  ['solveXChoice', /value of/i]);

;'__duo ready';

// BUG (cost 2 answers): the transversal's lean was inferred from its bounding
// box, which cannot tell "\" from "/". The <line> carries real x1,y1,x2,y2 and
// the <svg> a viewBox — use those and convert the labels into the same space.
window.__duo.marked = function () {
  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const d = f.contentDocument, svg = d.querySelector('svg'); if (!svg) return null;
  const sr = svg.getBoundingClientRect();
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const sx = vb.length === 4 ? sr.width / vb[2] : 1, sy = vb.length === 4 ? sr.height / vb[3] : 1;
  const ox = vb.length === 4 ? -vb[0] * sx : 0, oy = vb.length === 4 ? -vb[1] * sy : 0;

  const lines = [...d.querySelectorAll('line')].map(e => ({
    x1: +e.getAttribute('x1'), y1: +e.getAttribute('y1'),
    x2: +e.getAttribute('x2'), y2: +e.getAttribute('y2') }));
  const horiz = lines.filter(l => Math.abs(l.y1 - l.y2) < 2).sort((a, b) => a.y1 - b.y1);
  const trans = lines.find(l => Math.abs(l.y1 - l.y2) >= 2);
  if (horiz.length < 2 || !trans) return null;
  const xAt = y => trans.x1 + (trans.x2 - trans.x1) * ((y - trans.y1) / (trans.y2 - trans.y1));

  const labs = [...d.querySelectorAll('text,tspan')].map(e => { const r = e.getBoundingClientRect();
    return { t: this.ascii(e.textContent.trim()),
             cx: (r.left + r.width / 2 - sr.left - ox) / sx,
             cy: (r.top + r.height / 2 - sr.top - oy) / sy }; }).filter(o => o.t);
  if (labs.length < 2) return null;
  return labs.map(o => {
    const line = Math.abs(o.cy - horiz[0].y1) < Math.abs(o.cy - horiz[1].y1) ? 0 : 1;
    return { t: o.t, line, above: o.cy < horiz[line].y1, right: o.cx > xAt(o.cy) };
  });
};

;'__duo ready';

// ---- Pythagoras guided chains (unit 130) ----
// Don't write a solver per step — evaluate the arithmetic and pick the choice
// that is actually TRUE for the legs stated earlier in the lesson.
Object.assign(window.__duo, {
  legs() { const m = this.tex().replace(/\s/g, '').match(/(\d+)\^?2\+(\d+)\^?2/); return m ? [+m[1], +m[2]] : null; },

  solvePythStep() {
    const lg = this.legs(); if (!lg) return null;
    const sum = lg[0] * lg[0] + lg[1] * lg[1], hyp = Math.sqrt(sum);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (!txt.length) return null;
    const val = s => { if (!/^[\d+^]+$/.test(s)) return null;
      return s.split('+').reduce((t, p) => { const q = p.split('^');
        return t + (q.length > 1 ? Math.pow(+q[0], +q[1]) : +q[0]); }, 0); };
    let i = txt.findIndex(t => { const [l, r] = t.split('='); if (!r) return false;
      const lv = val(l), rv = val(r);
      if (lv !== null && /^c(\^?2)?$/.test(r)) return lv === sum;
      if (rv !== null && /^c(\^?2)?$/.test(l)) return /\^2/.test(l) ? rv === sum : rv === hyp;
      return false; });
    if (i < 0) i = txt.findIndex(t => val(t) === hyp || +t === hyp);
    return i < 0 ? null : { i, want: txt[i], sum, hyp };
  },

  solvePythFormula() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (!txt.length || !txt.some(t => t.includes('='))) return null;
    const i = txt.findIndex(t => /a.?2\+b.?2=c.?2/.test(t.replace(/[^a-z0-9=+^]/g, '')));
    return i < 0 ? null : { i, want: txt[i] };
  },

  // substitution: legs squared and summed on the LEFT, unknown alone on the right
  solvePythSub() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (!txt.length || !txt.every(t => t.includes('='))) return null;
    const i = txt.findIndex(t => { const [l, r] = t.split('=');
      return r && /^[a-z](\^?2)?$/.test(r) && /^\d+\^?2\+\d+\^?2$/.test(l); });
    return i < 0 ? null : { i, want: txt[i] };
  },

  // undoing a square is a square root, never "divide by 2"
  solveUndo() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.ascii(e.innerText).toLowerCase().replace(/\s+/g, ''));
    if (!txt.some(t => /squareroot/.test(t)) || !/\^2|²/.test(this.tex())) return null;
    const i = txt.findIndex(t => /squareroot/.test(t));
    return i < 0 ? null : { i, want: 'square root' };
  },
});

window.__duo.RULES.splice(2, 0,
  ['solvePythFormula', null], ['solvePythSub', null],
  ['solvePythStep', null], ['solveUndo', null]);

;'__duo ready';
