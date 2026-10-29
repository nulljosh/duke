
// ---- right-triangle construction + generic equation checking ----
Object.assign(window.__duo, {
  // innerText renders 5^2 as "52" (superscript), so drop ^ when comparing
  clean(s) {
    return this.norm(this.ascii(s).replace(/\\degree|°/g, '')
      .replace(/\\|mathbf|textbf|text|\{|\}|\^/g, ''));
  },

  // when every choice is a numeric equation, just pick the TRUE one.
  // innerText loses the exponent, so read the choices' own LaTeX.
  solveTrueEquation() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!c.length) return null;
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const ev = s => { const t = s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '');
      if (!/^[-\d+*^()]+$/.test(t)) return null;
      try { return Function('"use strict";return(' + t.replace(/(\d+)\^(\d+)/g, 'Math.pow($1,$2)') + ')')(); }
      catch (e) { return null; } };
    const i = src.findIndex(s => { const p = s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '').split('=');
      if (p.length !== 2) return false;
      const a = ev(p[0]), b = ev(p[1]);
      return a !== null && b !== null && Math.abs(a - b) < 1e-9; });
    return i < 0 ? null : { i, want: src[i] };
  },

  // side labels sit beside their side: extreme y = horizontal leg,
  // extreme x = vertical leg, the remaining one is the hypotenuse
  sideLabels() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const labs = [...d.querySelectorAll('text,tspan')].map(e => { const r = e.getBoundingClientRect();
      return { v: parseFloat(this.ascii(e.textContent.trim())),
               x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 }; })
      .filter(o => !isNaN(o.v));
    if (labs.length < 3) return null;
    const cx = labs.reduce((s, o) => s + o.x, 0) / labs.length;
    const cy = labs.reduce((s, o) => s + o.y, 0) / labs.length;
    const horiz = labs.slice().sort((a, b) => Math.abs(b.y - cy) - Math.abs(a.y - cy))[0];
    const vert = labs.slice().sort((a, b) => Math.abs(b.x - cx) - Math.abs(a.x - cx)).find(o => o !== horiz);
    const hyp = labs.find(o => o !== horiz && o !== vert);
    return { horiz: horiz && horiz.v, vert: vert && vert.v, hyp: hyp && hyp.v };
  },

  solveLegLength() {
    const L = this.tex(), s = this.sideLabels(); if (!s) return null;
    let want = null;
    if (/horizontal/i.test(L)) want = s.horiz;
    else if (/vertical/i.test(L)) want = s.vert;
    else if (/hypotenuse/i.test(L)) want = s.hyp;
    else if (/longer leg/i.test(L)) want = Math.max(s.horiz, s.vert);
    else if (/shorter leg/i.test(L)) want = Math.min(s.horiz, s.vert);
    if (want == null) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  // "Create a hypotenuse of H": the slider is the missing leg
  hypPlan() {
    const L = this.tex().replace(/\s/g, '');
    const h = L.match(/hypotenuseof\D{0,12}?(\d+)/i); if (!h) return null;
    const leg = L.match(/sqrt\((\d+)\^2/i) || L.match(/(\d+)\^2\+/); if (!leg) return null;
    const v = Math.sqrt((+h[1]) ** 2 - (+leg[1]) ** 2);
    if (!Number.isFinite(v)) return null;
    const sl = this.sliderPx(0); if (!sl || v < sl.lo || v > sl.hi) return null;
    return { v: Math.round(v), from: sl.from, to: this.sliderPx(Math.round(v)).to };
  },

  // "Create a right triangle with legs A and B": drag the three vertices to
  // (gx,gy), (gx+A,gy), (gx,gy-B), using the grid lines for the pixel scale.
  triPlan() {
    const m = this.tex().match(/(\d+)\s*and\s*(\d+)/); if (!m) return null;
    const a = +m[1], b = +m[2];
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const gl = [...d.querySelectorAll('.grid-line,line')].map(e => e.getBoundingClientRect());
    const vert = gl.filter(r => r.width < 3 && r.height > 50).map(r => fr.left + r.left).sort((x, y) => x - y);
    const horz = gl.filter(r => r.height < 3 && r.width > 50).map(r => fr.top + r.top).sort((x, y) => x - y);
    if (vert.length < 2 || horz.length < 2) return null;
    const cell = (vert[vert.length - 1] - vert[0]) / (vert.length - 1);
    const x0 = vert[0], y0 = horz[0], nx = vert.length - 1, ny = horz.length - 1;
    if (a > nx || b > ny) return null;
    const gx = Math.max(0, Math.floor((nx - a) / 2)), gy = Math.min(ny, Math.floor((ny + b) / 2));
    const P = (i, j) => [Math.round(x0 + i * cell), Math.round(y0 + j * cell)];
    const targets = [P(gx, gy), P(gx + a, gy), P(gx, gy - b)];
    const verts = [...d.querySelectorAll('.draggable-point,.point')].map(e => { const r = e.getBoundingClientRect();
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; });
    if (verts.length < 3) return null;
    const used = [], steps = [];   // greedy nearest so the drags don't cross
    targets.forEach(t => { let best = null, bd = 1e9;
      verts.forEach(v => { if (used.includes(v)) return;
        const dd = (v[0] - t[0]) ** 2 + (v[1] - t[1]) ** 2; if (dd < bd) { bd = dd; best = v; } });
      if (best) { used.push(best); steps.push({ from: best, to: t }); } });
    return { a, b, cell: Math.round(cell), steps };
  },
});

(function () {
  const prev = window.__duo.plan;
  window.__duo.plan = function () {
    if (/hypotenuse of/i.test(this.tex())) { const h = this.hypPlan();
      if (h) return { kind: 'leg', v: h.v, from: h.from, to: h.to }; }
    return prev.call(this);
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveLegLength', /length of the (horizontal|vertical|longer|shorter) leg|length of the hypotenuse/i],
  ['solveTrueEquation', null]);

;'__duo ready';

// ---- triangle angle sums ----
Object.assign(window.__duo, {
  // a triangle's angles sum to 180 — the =360 choice is always the distractor
  solveTriangleSum() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.norm(this.ascii(e.innerText)).replace(/\s/g, ''));
    if (txt.length < 2 || !txt.every(t => t.includes('='))) return null;
    if (!txt.some(t => /=180$/.test(t)) || !txt.some(t => /=360$/.test(t))) return null;
    const i = txt.findIndex(t => /=180$/.test(t));
    return i < 0 ? null : { i, want: txt[i] };
  },

  // collect each angle label as coefficient*x + constant and solve for 180
  triangleX() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument;
    if (!d.querySelector('polygon,.shape,.polygon')) return null;   // must be a triangle
    const labs = [...d.querySelectorAll('text,tspan')]
      .map(e => this.ascii(e.textContent.trim()).replace(/°/g, '').replace(/\s/g, '').toLowerCase()).filter(Boolean);
    if (labs.length < 3) return null;
    let A = 0, B = 0;
    for (const t of labs) {
      const m = t.match(/^(-?\d*)x([+-]\d+)?$/);
      if (m) { A += (m[1] === '' || m[1] === '+') ? 1 : (m[1] === '-' ? -1 : +m[1]); B += m[2] ? +m[2] : 0; }
      else if (/^-?\d+$/.test(t)) B += +t;
      else return null;
    }
    return A ? (180 - B) / A : null;
  },

  solveTriangleX() {
    const v = this.triangleX(); if (v === null || !Number.isFinite(v)) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(v));
    return i < 0 ? { miss: v } : { i, want: v };
  },

  angleNums() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return [];
    return [...f.contentDocument.querySelectorAll('text,tspan')]
      .map(e => this.ascii(e.textContent.trim()).replace(/°/g, '').trim())
      .filter(t => /^\d+$/.test(t)).map(Number);
  },

  solveUnknownAngle() {
    const nums = this.angleNums(); if (nums.length < 2) return null;
    const inner = 180 - nums.reduce((a, b) => a + b, 0);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const txt = c.map(e => this.clean(e.innerText));
    let i = txt.indexOf(String(inner));
    if (i < 0) i = txt.indexOf(String(180 - inner));   // exterior angle variant
    return i < 0 ? { miss: inner } : { i, want: txt[i] };
  },
});

// typed variants: triangle x, and the unknown angle


window.__duo.RULES.splice(2, 0,
  ['solveTriangleSum', null],
  ['solveTriangleX', /value of/i],
  ['solveUnknownAngle', /unknown angle|missing angle/i]);

;'__duo ready';

// pick the equation whose terms match the angle labels actually on the diagram
window.__duo.solveTriangleEq = function () {
  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const labs = [...f.contentDocument.querySelectorAll('text,tspan')]
    .map(e => this.ascii(e.textContent.trim()).replace(/°/g, '').replace(/\s/g, '').toLowerCase())
    .filter(Boolean).sort();
  if (labs.length < 3) return null;
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
  const i = src.findIndex(s => {
    const t = s.replace(/\\degree|°|\\|mathbf|textbf|\{|\}|\s/g, '').toLowerCase();
    const [l, r] = t.split('='); if (!r || r !== '180') return false;
    return l.split('+').sort().join(',') === labs.join(',');
  });
  return i < 0 ? { miss: labs } : { i, want: labs.join('+') };
};

// typed hypotenuse / missing leg, straight from Pythagoras


window.__duo.RULES.splice(2, 0, ['solveTriangleEq', null]);

;'__duo ready';

// ---- unit 131: Pythagoras applied ----
Object.assign(window.__duo, {
  // "sum of the squares of the legs" — the a^2+b^2 form, not a+b
  solveSumSquares() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const i = src.findIndex(s => /^\d+\^2\+\d+\^2$/.test(s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '')));
    return i < 0 ? null : { i, want: src[i] };
  },

  // The hypotenuse is the SQRT of the sum of squares — but SEVERAL choices can
  // carry a sqrt, so the right one is the one that squares BOTH legs.
  solveHypForm() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const norm = s => s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '');
    let i = src.findIndex(s => /sqrt\d+\^2\+\d+\^2/.test(norm(s)));
    if (i < 0) i = src.findIndex(s => /sqrt|√/.test(s) && (norm(s).match(/\^2/g) || []).length >= 2);
    return i < 0 ? null : { i, want: src[i] };
  },
});

// when the asked-for side isn't labelled, compute it from the other two
(function () {
  const prev = window.__duo.solveLegLength;
  window.__duo.solveLegLength = function () {
    const r = prev.call(this); if (r && r.i >= 0) return r;
    const L = this.tex(), f = document.querySelector('iframe');
    if (!f || !f.contentDocument) return r;
    const nums = [...f.contentDocument.querySelectorAll('text,tspan')]
      .map(e => parseFloat(this.ascii(e.textContent.trim()))).filter(n => !isNaN(n));
    if (nums.length < 2) return r;
    let v = null;
    if (/hypotenuse/i.test(L)) v = Math.sqrt(nums[0] ** 2 + nums[1] ** 2);
    else if (/leg/i.test(L)) { const h = Math.max(...nums), g = nums.filter(n => n !== h)[0];
      v = Math.sqrt(h ** 2 - g ** 2); }
    if (v === null || !Number.isFinite(v)) return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === String(Number.isInteger(v) ? v : +v.toFixed(2)));
    return i < 0 ? r : { i, want: v };
  };
})();

window.__duo.RULES.splice(2, 0,
  ['solveSumSquares', /sum of the squares/i],
  ['solveHypForm', /hypotenuse/i]);

;'__duo ready';

// ---- guided Pythagoras chains that solve for a LEG ----
Object.assign(window.__duo, {
  // Answer the equation ACTUALLY on screen — take the LAST match, not the first.
  // Re-deriving from an earlier step in the same lesson produced sqrt(8) where
  // the screen plainly said x^2 = 64.
  guidedX() {
    const t = this.tex().replace(/\s/g, '');
    const sqs = [...t.matchAll(/x\^?2=(\d+)/gi)];
    const subs = [...t.matchAll(/(\d+)\+x\^?2=(\d+)/gi)];
    if (/squareroot|solvefor.?x/i.test(t) && sqs.length) {
      const v = Math.sqrt(+sqs[sqs.length - 1][1]); return Number.isFinite(v) ? v : null;
    }
    if (subs.length) { const m = subs[subs.length - 1]; return (+m[2]) - (+m[1]); }
    if (sqs.length) return +sqs[sqs.length - 1][1];
    return null;
  },

  // Finding a LEG puts the hypotenuse (largest value) alone on the right, so the
  // unknown sits on the LEFT — the opposite of the find-the-hypotenuse case.
  solvePythSub() {
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
    const N = s => s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '');
    if (!src.length || !src.every(s => N(s).includes('='))) return null;
    const findLeg = /leg length|find the leg/i.test(this.tex());
    const i = src.findIndex(s => { const [l, r] = N(s).split('='); if (!l || !r) return false;
      if (findLeg) {
        const rNum = r.match(/^(\d+)(\^2)?$/); if (!rNum) return false;
        const big = rNum[2] ? +rNum[1] * +rNum[1] : +rNum[1];
        return /[a-z]/.test(l) && (l.match(/\d+/g) || []).map(Number).every(n => n <= big);
      }
      return /^[a-z](\^2)?$/.test(r) && /^\d+(\^2)?\+\d+(\^2)?$/.test(l); });
    return i < 0 ? null : { i, want: src[i] };
  },
});

// the guided chain's own equation beats every heuristic


// \duoblank / \phantom literally carry the answer — try them before anything
// that reasons about the question
window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveDuoblank' && r[0] !== 'solvePhantomChoice');
window.__duo.RULES.unshift(['solveDuoblank', null], ['solvePhantomChoice', /fill in the blank/i]);

;'__duo ready';

// build the expected equation from the diagram's own labels: the largest number
// is the hypotenuse, everything else (x included) is squared and summed
window.__duo.solvePythMatch = function () {
  const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
  const labs = [...f.contentDocument.querySelectorAll('text,tspan')]
    .map(e => this.ascii(e.textContent.trim()).replace(/\s/g, '')).filter(Boolean);
  if (labs.length < 3) return null;
  const nums = labs.filter(t => /^\d+$/.test(t)).map(Number); if (!nums.length) return null;
  const hyp = Math.max(...nums);
  const key = labs.filter(t => t !== String(hyp)).map(t => t + '2').sort().join('+') + '=' + hyp + '2';
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
  const N = s => s.replace(/\\|mathbf|textbf|\{|\}|\s|\^/g, '').toLowerCase();
  const i = src.findIndex(s => { const [l, r] = N(s).split('='); if (!r) return false;
    return l.split('+').sort().join('+') + '=' + r === key; });
  return i < 0 ? { miss: key } : { i, want: key };
};

// The equation can be in the PROMPT rather than on a diagram:
//   x^2 + a^2 = b^2  =>  x = sqrt(b^2 - a^2)   (sqrt AND minus)
//   x^2 = a^2 + b^2  =>  x = sqrt(a^2 + b^2)   (sqrt AND plus)
window.__duo.solvePythFormChoice = function () {
  const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const tex = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const src = tex.length === c.length ? tex : c.map(e => this.ascii(e.innerText));
  if (!src.some(s => /sqrt|√/.test(s))) return null;
  const N = s => s.replace(/\\|mathbf|textbf|\{|\}|\s/g, '').toLowerCase();
  const t = N(this.tex());
  let wantMinus = null;
  if (/x\^?2\+\d+\^?2=\d+\^?2/.test(t)) wantMinus = true;        // x is a leg
  else if (/x\^?2=\d+\^?2\+\d+\^?2/.test(t)) wantMinus = false;   // x is the hypotenuse
  else {
    const f = document.querySelector('iframe');
    const labs = f && f.contentDocument ? [...f.contentDocument.querySelectorAll('text,tspan')]
      .map(e => this.ascii(e.textContent.trim()).replace(/\s/g, '')).filter(Boolean) : [];
    const nums = labs.filter(x => /^\d+$/.test(x)).map(Number);
    if (nums.length === 2 && labs.length === 3) wantMinus = true;
    else if (nums.length >= 2) wantMinus = false;
  }
  if (wantMinus === null) return null;
  const i = src.findIndex(s => { const n = N(s);
    return /sqrt|√/.test(n) && (wantMinus ? /-/.test(n) : /\+/.test(n)); });
  return i < 0 ? null : { i, want: N(src[i]) };
};

window.__duo.RULES.splice(2, 0,
  ['solvePythMatch', null],
  ['solvePythFormChoice', null],
  ['solveLegLength', /length of the leg/i]);

;'__duo ready';
