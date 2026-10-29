
// "Complete the table" for a mapping rule T(x, y) = (x + 4, y − 4): read each
// row's x and y from the table, apply the rule, and drag in the matching pair.
window.__duo.transformRule = function () {
  for (const t of this.mathParts()) {
    const m = t.replace(/\s/g, '').match(/^[A-Za-z]\(x,y\)=\((.+),(.+)\)$/);
    if (!m) continue;
    const fx = this.compile(m[1].replace(/y/g, '(0)')), fy = this.compile(m[2].replace(/x/g, '(0)'));
    const mkX = expr => { const c = this.compile(expr.replace(/y/g, '(0)')); return c; };
    const gx = mkX(m[1]);
    const gyRaw = m[2].replace(/x/g, '(0)').replace(/y/g, 'x');
    const gy = this.compile(gyRaw);
    if (gx && gy) return { x: gx, y: gy };
  }
  return null;
};
window.__duo.solveTransformTable = async function () {
  const T = this.tableCells(); if (!T) return false;
  const R = this.transformRule(); if (!R) return false;
  const d = this.diagram(); if (!d) return false;
  const cells = T.cells;
  const empties = cells.map((c, i) => [c, i]).filter(([c]) => c.empty);
  if (!empties.length) return false;
  const num = s => { const v = parseFloat(String(s).replace(/[−–—]/g, '-')); return isFinite(v) ? v : null; };
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (const [cell, idx] of empties) {
    const x = num(cells[idx - 2] && cells[idx - 2].t), y = num(cells[idx - 1] && cells[idx - 1].t);
    if (x === null || y === null) return false;
    let want;
    try { want = '(' + R.x(x) + ', ' + R.y(y) + ')'; } catch (e) { return false; }
    const norm = s => String(s).replace(/[−–—]/g, '-').replace(/\s/g, '');
    const tok = this.bankTokens().find(o => norm(o.t) === norm(want) && o.el.isConnected);
    if (!tok || !cell.el) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell.el));
    await this.sleep(320);
  }
  return true;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveTransformTable()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// plainMath strips commas, which destroys "T(x,y)=(x+4,y-4)". Parse the rule
// from a comma-preserving flatten instead.
window.__duo.transformRule = function () {
  const lines = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/[{}&~\s\\]/g, '')
    .replace(/[−–—]/g, '-'));
  for (const t of lines) {
    const m = t.match(/^[A-Za-z]\(x,y\)=\(([^,]+),([^)]+)\)$/);
    if (!m) continue;
    const gx = this.compile(m[1].replace(/\by\b/g, '(0)'));
    const gy = this.compile(m[2].replace(/\bx\b/g, '(0)').replace(/\by\b/g, 'x'));
    if (gx && gy) return { x: gx, y: gy };
  }
  return null;
};
;'__duo ready';

// "Translate the segment" with a rule T(x,y) = (x+2, y−4): apply the rule to
// every draggable point.
window.__duo.solveApplyRule = async function () {
  const R = this.transformRule(); if (!R) return false;
  const pts = this.gridPoints(); if (!pts.length) return false;
  const targets = pts.map(p => { try { return [R.x(p.x), R.y(p.y)]; } catch (e) { return null; } });
  if (targets.some(t => !t || !isFinite(t[0]) || !isFinite(t[1]))) return false;
  if (targets.every((t, i) => Math.abs(t[0] - pts[i].x) < 1e-9 && Math.abs(t[1] - pts[i].y) < 1e-9)) return false;
  for (let i = 0; i < pts.length; i++) {
    const p = this.gridPoints()[i]; if (!p) return false;
    if (Math.abs(p.x - targets[i][0]) < 1e-9 && Math.abs(p.y - targets[i][1]) < 1e-9) continue;
    await this.dragPointTo(p, targets[i][0], targets[i][1]);
  }
  const now = this.gridPoints();
  return targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6));
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveApplyRule()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the image of (-5, 3) under the translation T(x,y) = ..." — apply the
// rule to the point named in the prompt and match the coordinate choice.
window.__duo.solveImageOfPoint = function () {
  const ins = this.curInstruction();
  if (!/image of/i.test(ins)) return null;
  const R = this.transformRule(); if (!R) return null;
  const src = this.promptPairs()[0]; if (!src) return null;
  let want;
  try { want = [R.x(src[0]), R.y(src[1])]; } catch (e) { return null; }
  if (!isFinite(want[0]) || !isFinite(want[1])) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const p = this.choicePair(e);
    return p && Math.abs(p[0] - want[0]) < 1e-6 && Math.abs(p[1] - want[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveImageOfPoint', /image of/i]);
;'__duo ready';

// "Select the transformation rule": infer the mapping from a before/after pair
// (either two plotted shapes, or a table row), then keep the matching choice.
window.__duo.inferRule = function () {
  const T = this.tableCells();
  if (T) {                                   // table row: x, y, T(x,y)
    const c = T.cells;
    for (let i = 2; i < c.length; i += 3) {
      const x = parseFloat(String(c[i - 2].t).replace(/[−–—]/g, '-'));
      const y = parseFloat(String(c[i - 1].t).replace(/[−–—]/g, '-'));
      const m = String(c[i].t).replace(/[−–—]/g, '-').match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
      if (isFinite(x) && isFinite(y) && m) return { dx: parseFloat(m[1]) - x, dy: parseFloat(m[2]) - y };
    }
  }
  const P = this.plottedPoints();
  if (P.length >= 2 && P.length % 2 === 0) {
    const h = P.length / 2, A = P.slice(0, h), B = P.slice(h);
    const dx = B[0][0] - A[0][0], dy = B[0][1] - A[0][1];
    if (A.every((p, i) => Math.abs(B[i][0] - p[0] - dx) < 1e-6 && Math.abs(B[i][1] - p[1] - dy) < 1e-6))
      return { dx, dy };
  }
  return null;
};
window.__duo.solveRuleChoice = function () {
  if (!/transformation rule|which rule|select the rule/i.test(this.curInstruction())) return null;
  const R = this.inferRule(); if (!R) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.ascii(this.choiceLatex(e)).replace(/\\(mathbf|textbf|text|left|right)\b/g, '')
      .replace(/[{}\s\\]/g, '').replace(/[−–—]/g, '-');
    const m = t.match(/\(x([+-]\d+(?:\.\d+)?)?,y([+-]\d+(?:\.\d+)?)?\)/);
    if (!m) return false;
    return parseFloat(m[1] || '0') === R.dx && parseFloat(m[2] || '0') === R.dy;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveRuleChoice', /transformation rule|which rule|select the rule/i]);
;'__duo ready';

// Choices as coordinate maps ((y,x), (-x,y), (x,-y), (x+3,y-1)...): apply each
// to the pre-image points and keep the one that reproduces the image.
window.__duo.parseCoordMap = function (text) {
  const t = this.ascii(text).replace(/\\(mathbf|textbf|text|left|right)\b/g, '')
    .replace(/[{}\s\\]/g, '').replace(/[−–—]/g, '-');
  const m = t.match(/^\(?([^,]+),([^)]+)\)?$/); if (!m) return null;
  const mk = expr => {
    const s = expr.replace(/(\d)([xy])/g, '$1*$2');
    if (!/^[-+*/().0-9xy]+$/.test(s)) return null;
    try { return Function('x', 'y', '"use strict";return (' + s + ')'); } catch (e) { return null; }
  };
  const fx = mk(m[1]), fy = mk(m[2]);
  return (fx && fy) ? (p => { try { return [fx(p[0], p[1]), fy(p[0], p[1])]; } catch (e) { return null; } }) : null;
};
window.__duo.solveCoordMapChoice = function () {
  const ins = this.curInstruction();
  if (!/transformation|rule|maps|takes/i.test(ins)) return null;
  const P = this.plottedPoints();
  if (P.length < 2 || P.length % 2) return null;
  const h = P.length / 2, A = P.slice(0, h), B = P.slice(h);
  const same = (X, Y) => X.every(p => Y.some(q => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6));
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const f = this.parseCoordMap(this.choiceLatex(e)); if (!f) return;
    const img = A.map(f);
    if (img.some(p => !p)) return;
    if (same(img, B) && same(B, img)) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveCoordMapChoice', /transformation|rule|maps|takes/i]);
;'__duo ready';

// "Select the point reflected over the y-axis / x-axis / origin"
window.__duo.solveAxisReflection = function () {
  const ins = this.curInstruction().replace(/\s/g, '');
  if (!/reflect/i.test(ins)) return null;
  const P = this.plottedPoints();
  const src = P.length === 1 ? P[0] : (this.promptPairs()[0] || null);
  if (!src) return null;
  let want = null;
  if (/overthey-?axis|acrossthey-?axis/i.test(ins)) want = [-src[0], src[1]];
  else if (/overthex-?axis|acrossthex-?axis/i.test(ins)) want = [src[0], -src[1]];
  else if (/origin/i.test(ins)) want = [-src[0], -src[1]];
  else if (/overtheliney=x|acrossy=x/i.test(ins)) want = [src[1], src[0]];
  if (!want) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const p = this.choicePair(e);
    return p && Math.abs(p[0] - want[0]) < 1e-6 && Math.abs(p[1] - want[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveAxisReflection', /reflect/i]);
;'__duo ready';

// The mapping table lives in the diagram iframe as text: "x y T(x,y) -3 0
// (-3,0) 2 -7 (2,7) ...". Parse it into (pre-image, image) rows so the rule can
// be checked without any plotted points.
window.__duo.tableRuleRows = function () {
  const d = this.diagram(); if (!d) return null;
  let txt;
  try { txt = d.f.contentDocument.body.innerText; } catch (e) { return null; }
  txt = txt.replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
  const toks = txt.match(/\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)|-?\d+(?:\.\d+)?/g) || [];
  const rows = [];
  for (let i = 0; i + 2 < toks.length; ) {
    const a = toks[i], b = toks[i + 1], c = toks[i + 2];
    if (/^\(/.test(a) || /^\(/.test(b) || !/^\(/.test(c)) { i++; continue; }
    const m = c.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (!m) { i++; continue; }
    rows.push({ pre: [parseFloat(a), parseFloat(b)], img: [parseFloat(m[1]), parseFloat(m[2])] });
    i += 3;
  }
  return rows.length ? rows : null;
};
(function () {
  const base = window.__duo.solveCoordMapChoice;
  window.__duo.solveCoordMapChoice = function () {
    const r = base.call(this); if (r) return r;
    const rows = this.tableRuleRows(); if (!rows) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const hits = [];
    ch.forEach((e, i) => {
      const t = this.ascii(this.choiceLatex(e)).replace(/^[^=]*=/, '');
      const f = this.parseCoordMap(t); if (!f) return;
      const ok = rows.every(row => { const p = f(row.pre);
        return p && Math.abs(p[0] - row.img[0]) < 1e-6 && Math.abs(p[1] - row.img[1]) < 1e-6; });
      if (ok) hits.push(i);
    });
    return hits.length === 1 ? { i: hits[0] } : null;
  };
  window.__duo.RULES.unshift(['solveCoordMapChoice', /equation for the transformation|transformation|rule/i]);
})();
;'__duo ready';

// transformRule compiled each output as a single-variable expression, so a rule
// that swaps them — T(x,y) = (-y, -x) — evaluated to nonsense. Use the 2-arg
// coordinate-map parser instead.
window.__duo.transformRule = function () {
  const lines = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/[{}&~\s\\]/g, '')
    .replace(/[−–—]/g, '-'));
  for (const t of lines) {
    const m = t.match(/^[A-Za-z]\(x,y\)=(\(.+\))$/);
    if (!m) continue;
    const f = this.parseCoordMap(m[1]);
    if (f) return { map: f, x: v => f([v, 0])[0], y: v => f([0, v])[1] };
  }
  return null;
};


// The blank can also be an INPUT cell (x or y) with the image given. Try each
// numeric token in the blank and keep the one the rule maps to that image.


// A table can have blanks in BOTH the image column and the input columns at
// once; the two earlier solvers each handled only one kind. Handle every blank
// in one pass, choosing the token by the column it sits in.
window.__duo.solveTransformTable = async function () {
  const T = this.tableCells(); const R = this.transformRule();
  if (!T || !R || !R.map) return false;
  const d = this.diagram(); if (!d) return false;
  const cells = T.cells;
  const empties = cells.map((c, i) => [c, i]).filter(([c]) => c.empty);
  if (!empties.length) return false;
  const num = s => { const v = parseFloat(String(s).replace(/[−–—]/g, '-')); return isFinite(v) ? v : null; };
  const pair = s => { const m = String(s).replace(/[−–—]/g, '-').match(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null; };
  const norm = s => String(s).replace(/[−–—]/g, '-').replace(/\s/g, '');
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  const val = c => c.empty ? null : c.t;
  for (const [cell, idx] of empties) {
    const row = Math.floor(idx / 3) * 3;
    let tok = null;
    if (idx % 3 === 2) {                                   // image blank
      const x = num(val(cells[row])), y = num(val(cells[row + 1]));
      if (x === null || y === null) return false;
      const p = R.map([x, y]); if (!p) return false;
      const want = '(' + p[0] + ',' + p[1] + ')';
      tok = this.bankTokens().find(o => norm(o.t) === norm(want) && o.el.isConnected);
    } else {                                               // input blank
      const img = pair(val(cells[row + 2])); if (!img) return false;
      const other = idx % 3 === 0 ? num(val(cells[row + 1])) : num(val(cells[row]));
      if (other === null) return false;
      tok = this.bankTokens().find(o => {
        const v = num(o.t); if (v === null || !o.el.isConnected) return false;
        const p = idx % 3 === 0 ? R.map([v, other]) : R.map([other, v]);
        return p && Math.abs(p[0] - img[0]) < 1e-6 && Math.abs(p[1] - img[1]) < 1e-6;
      });
    }
    if (!tok || !cell.el) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell.el));
    await this.sleep(320);
  }
  return true;
};
;'__duo ready';

// freeTokens called this.bankTokens, which the wrapper had replaced with a
// function calling freeTokens — infinite recursion. Pass the raw list in.
window.__duo.freeFrom = function (list) {
  const T = this.tableCells();
  const rects = T ? T.cells.map(c => c.el && c.el.getBoundingClientRect()).filter(Boolean) : [];
  return list.filter(o => {
    if (!o.el.isConnected) return false;
    const r = o.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return !rects.some(q => cx >= q.left - 2 && cx <= q.right + 2 && cy >= q.top - 2 && cy <= q.bottom + 2);
  });
};
window.__duo.freeTokens = function () { return this.freeFrom(this.bankTokens()); };
(function () {
  const base = window.__duo.solveTransformTable;
  window.__duo.solveTransformTable = async function () {
    const used = new Set();
    const realBank = this.bankTokens.bind(this);
    const self = this;
    this.bankTokens = function () { return self.freeFrom(realBank()).filter(o => !used.has(o.el)); };
    const realDrag = this.dragXY.bind(this);
    this.dragXY = async function (el, f, from, to) { used.add(el); return await realDrag(el, f, from, to); };
    try { return await base.call(this); }
    finally { this.bankTokens = realBank; this.dragXY = realDrag; }
  };
})();
;'__duo ready';

// Guided Pythagoras ends with "x^2 = 27; find the value of x" and offers the
// answer in radical form. Read the x^2 value from the prompt and match by
// numeric value, so \sqrt{27} wins over the decoy 13.5.
window.__duo.solveFromXSquared = function () {
  let sq = null;
  for (const t of this.mathParts().slice().reverse()) {
    const m = t.replace(/\s/g, '').match(/^x\^?2=(-?[\d.]+)$/i);
    if (m) { sq = parseFloat(m[1]); break; }
  }
  if (sq === null || sq < 0) return null;
  const want = Math.sqrt(sq);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.ascii(this.choiceLatex(e)).replace(/^[^=]*=/, '');
    const v = this.evalTrigExpr(t.replace(/\\sqrt\{([^{}]*)\}/g, '(($1)**0.5)'));
    return v !== null && Math.abs(v - want) < 1e-6;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveFromXSquared', /find the value of x|value of x|solve for x/i]);
;'__duo ready';

// "Select the length of the leg / hypotenuse": compute it from the triangle's
// two known sides and match by VALUE, so radical forms (10√2, √(8^2-4^2)) and
// decimals both work.
window.__duo.radValue = function (text) {
  let t = this.ascii(text).replace(/^[^=]*=/, '')
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, '(($1)**0.5)')
    .replace(/\\sqrt\s*(\d+)/g, '(($1)**0.5)')
    .replace(/(\d)\s*\(\(/g, '$1*((')
    .replace(/\^/g, '**');
  return this.evalTrigExpr(t);
};
window.__duo.solvePythagSide = function () {
  const ins = this.curInstruction();
  if (!/length of the (leg|hypotenuse|side)/i.test(ins)) return null;
  if (!this.diagramFresh()) return null;
  const nums = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t)).map(l => parseFloat(l.t));
  if (nums.length < 2) return null;
  const T = this.triangleLabelsAt(null);
  let want = null;
  if (/hypotenuse/i.test(ins)) want = Math.sqrt(nums[0] ** 2 + nums[1] ** 2);
  else {
    const hyp = Math.max(...nums), leg = Math.min(...nums);
    want = Math.sqrt(hyp ** 2 - leg ** 2);
  }
  if (!isFinite(want)) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.radValue(this.choiceLatex(e));
    return v !== null && Math.abs(v - want) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePythagSide', /length of the (leg|hypotenuse|side)/i]);
;'__duo ready';
