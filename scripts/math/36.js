
// "Find the measure of the other/top acute angle" — the two acute angles of a
// right triangle sum to 90°, and any triangle's angles sum to 180°.
window.__duo.missingAngle = function () {
  const ins = this.curInstruction();
  if (!/(measure of|find).*(angle)/i.test(ins)) return null;
  const labs = (this.diagramLabels() || []).filter(l => /°/.test(l.t))
    .map(l => parseFloat(l.t.replace(/[^\d.]/g, ''))).filter(isFinite);
  if (!labs.length) return null;
  const known = labs.filter(v => Math.abs(v - 90) > 1e-6);
  if (/acute/i.test(ins) && known.length === 1) return 90 - known[0];
  if (known.length === 2) return 180 - known[0] - known[1];
  if (labs.length === 2) return 180 - labs[0] - labs[1];
  return null;
};


// The prompt often names the OTHER acute angle (30°) while the diagram labels
// only its complement (60°). Compute each vertex's actual angle, find the right
// angle, and pick the vertex whose measure matches what the prompt asks for.
window.__duo.triangleVertexAngles = function () {
  const V = this.trianglePolygon(); if (!V) return null;
  const ang = i => {
    const a = V[i], b = V[(i + 1) % 3], c = V[(i + 2) % 3];
    const u = [b[0] - a[0], b[1] - a[1]], w = [c[0] - a[0], c[1] - a[1]];
    const d = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w));
    return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
  };
  return V.map((v, i) => ({ v, deg: ang(i), i }));
};
window.__duo.triangleLabelsAt = function (targetDeg) {
  const V = this.trianglePolygon(); if (!V) return null;
  const A = this.triangleVertexAngles(); if (!A) return null;
  const lab = this.angleLabel();
  let vi = null;
  if (targetDeg !== null && targetDeg !== undefined) {
    let bd = Infinity;
    A.forEach(a => { const d = Math.abs(a.deg - targetDeg); if (d < bd) { bd = d; vi = a.i; } });
    if (bd > 8) vi = null;
  }
  if (vi === null && lab) { let bd = Infinity;
    A.forEach(a => { const d = Math.hypot(a.v[0] - lab.x, a.v[1] - lab.y); if (d < bd) { bd = d; vi = a.i; } }); }
  if (vi === null) return null;
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((x, y) => y.len > x.len ? y : x);
  const opp = edges.find(e => e.a !== vi && e.b !== vi);
  const adj = edges.find(e => e !== hyp && e !== opp);
  if (!hyp || !opp || !adj) return null;
  const labs = (this.diagramLabels() || []).filter(l => !/°/.test(l.t));
  const nameOf = e => { let best = null, bb = Infinity;
    for (const l of labs) { const d = Math.hypot(l.x - e.mid[0], l.y - e.mid[1]); if (d < bb) { bb = d; best = l; } }
    return best ? best.t.trim() : null; };
  return { opp: nameOf(opp), adj: nameOf(adj), hyp: nameOf(hyp) };
};
(function () {
  const base = window.__duo.solveSetupEquation;
  window.__duo.solveSetupEquation = function () {
    const ins = this.curInstruction();
    if (!/set up the (equation|sine|cosine|tangent)|sine ratio for|cosine ratio for|tangent ratio for/i.test(ins)) return base.call(this);
    const m = ins.replace(/\s/g, '').match(/(?:forthe)?(-?\d+(?:\.\d+)?)(?:°|degree)/);
    const T = this.triangleLabelsAt(m ? parseFloat(m[1]) : null);
    if (!T) return base.call(this);
    const want = /cosine|cos/i.test(ins) ? [T.adj, T.hyp]
               : /tangent|tan/i.test(ins) ? [T.opp, T.adj]
               : [T.opp, T.hyp];
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => {
      const t = this.plainMath(this.choiceLatex(e)).replace(/\s|°|degree[s]?/gi, '');
      const q = t.match(/=(.+)$/); if (!q) return false;
      return q[1] === want[0] + '/' + want[1] || q[1] === 'frac' + want[0] + want[1];
    });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveSetupEquation', /set up the|ratio for the/i]);
})();
;'__duo ready';

// "Select the match" where the choices are trig expressions like sin(45°) or
// tan(40°): evaluate each and keep the one equal to the value in the prompt.
window.__duo.evalTrigExpr = function (text) {
  const t = String(text).replace(/\\mathbf|\\textbf|\\text|[{}\\\s]/g, '').replace(/°|degrees?/gi, '');
  const m = t.match(/^(sin|cos|tan)\((-?\d+(?:\.\d+)?)\)$/i);
  if (!m) { const g = this.compile(t); if (!g) return null;
    try { const v = g(0); return isFinite(v) ? v : null; } catch (e) { return null; } }
  const D = Math.PI / 180;
  const f = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[m[1].toLowerCase()];
  const v = f(parseFloat(m[2]) * D);
  return isFinite(v) ? v : null;
};
window.__duo.solveTrigMatch = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const vals = ch.map(e => this.evalTrigExpr(this.choiceLatex(e)));
  if (vals.filter(v => v !== null).length < 2) return null;
  // the target: a number or trig expression in the prompt
  let want = null;
  for (const t of this.mathParts().slice().reverse()) {
    const v = this.evalTrigExpr(t);
    if (v !== null) { want = v; break; }
  }
  if (want === null) {
    const T = this.triangleLabels();
    if (T && /sin|sine/i.test(this.curInstruction())) want = parseFloat(T.opp) / parseFloat(T.hyp);
    else if (T && /cos/i.test(this.curInstruction())) want = parseFloat(T.adj) / parseFloat(T.hyp);
    else if (T && /tan/i.test(this.curInstruction())) want = parseFloat(T.opp) / parseFloat(T.adj);
  }
  if (want === null || !isFinite(want)) return null;
  let bi = -1, bd = Infinity;
  vals.forEach((v, i) => { if (v === null) return; const d = Math.abs(v - want); if (d < bd) { bd = d; bi = i; } });
  return (bi >= 0 && bd < 0.02) ? { i: bi } : null;
};
window.__duo.RULES.unshift(['solveTrigMatch', /select the match|sin|cos|tan/i]);
;'__duo ready';

window.__duo.GLOSSARY.unshift(
  [/opposite.{0,12}adjacent\s*=\s*1|ratio\s*=\s*1/i, ['theyareequal', 'equal', 'thesame']],
  [/tan.{0,6}=\s*1/i, ['theyareequal', 'equal', '45']],
  [/sin.{0,6}=\s*cos/i, ['45']],
  [/as the angle (increases|grows)/i, ['increases', 'larger']],
  [/as the angle (decreases|shrinks)/i, ['decreases', 'smaller']],
  [/longest side/i, ['hypotenuse']],
  [/side across from|across from the/i, ['opposite']],
  [/next to the angle|beside the angle/i, ['adjacent']],
);
;'__duo ready';

// solveGlossary was gated on a narrow keyword list, so word-answer screens fell
// through to the blind guess. The solver already returns null when it does not
// recognise the prompt, so gate it on having word choices at all.
window.__duo.RULES.unshift(['solveGlossary', /./]);
;'__duo ready';

// "Find the value of x" in a right triangle: work out which two sides are known
// vs unknown relative to the marked angle, then apply the matching ratio.
window.__duo.solveTriangleX = function () {
  if (!this.diagramFresh()) return null;
  const A = this.triangleVertexAngles(); if (!A) return null;
  const lab = this.angleLabel(); if (!lab) return null;
  const deg = parseFloat(lab.t.replace(/[^\d.]/g, ''));
  if (!isFinite(deg)) return null;
  const T = this.triangleLabelsAt(deg); if (!T) return null;
  const num = s => (s !== null && /^-?\d+(\.\d+)?$/.test(String(s))) ? parseFloat(s) : null;
  const isX = s => /^[a-z]$/i.test(String(s || ''));
  const D = Math.PI / 180, r = deg * D;
  const o = num(T.opp), a = num(T.adj), h = num(T.hyp);
  let x = null;
  if (o !== null && isX(T.hyp)) x = o / Math.sin(r);
  else if (a !== null && isX(T.hyp)) x = a / Math.cos(r);
  else if (o !== null && isX(T.adj)) x = o / Math.tan(r);
  else if (a !== null && isX(T.opp)) x = a * Math.tan(r);
  else if (h !== null && isX(T.opp)) x = h * Math.sin(r);
  else if (h !== null && isX(T.adj)) x = h * Math.cos(r);
  if (x === null || !isFinite(x)) return null;
  const whole = Math.abs(x - Math.round(x)) < 1e-6;
  const ins = this.curInstruction();
  const dp = /hundredth/i.test(ins) ? 2 : /whole|integer/i.test(ins) ? 0 : 1;
  return whole ? Math.round(x) : Number(x.toFixed(dp));
};
(function () {
  const RE = /find the value of x|solve for x|find x|value of x/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.solveTrigEquation(); if (v !== null) return v;
      const w = this.solveTriangleX(); if (w !== null) return w;
    }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.solveTrigEquation() !== null ? this.solveTrigEquation() : this.solveTriangleX();
      if (v !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 0.06; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// Choices that are whole trig equations (tan(45°)=x/5 vs cos(45°)=5/x): check
// each against the triangle's actual side roles and keep the consistent one.
window.__duo.solveEquationMatch = function () {
  if (!this.diagramFresh()) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const parsed = ch.map(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°/gi, '');
    const m = t.match(/^(sin|cos|tan)\((-?\d+(?:\.\d+)?)\)=(?:frac)?([a-z0-9.]+?)\/?([a-z0-9.]+)$/i);
    return m ? { fn: m[1].toLowerCase(), deg: parseFloat(m[2]), num: m[3], den: m[4] } : null;
  });
  if (parsed.filter(Boolean).length < 2) return null;
  const hits = [];
  parsed.forEach((p, i) => {
    if (!p) return;
    const T = this.triangleLabelsAt(p.deg); if (!T) return;
    const want = p.fn === 'sin' ? [T.opp, T.hyp] : p.fn === 'cos' ? [T.adj, T.hyp] : [T.opp, T.adj];
    if (String(want[0]) === p.num && String(want[1]) === p.den) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveEquationMatch', /select the match|which equation|set up/i]);
;'__duo ready';

// With only two labels for three edges, nearest-label lookup gave the same label
// to two edges. Assign labels to edges ONE-TO-ONE (closest pair first) and leave
// the unlabelled edge null.
window.__duo.triangleLabelsAt = function (targetDeg) {
  const V = this.trianglePolygon(); if (!V) return null;
  const A = this.triangleVertexAngles(); if (!A) return null;
  const lab = this.angleLabel();
  let vi = null;
  if (targetDeg !== null && targetDeg !== undefined) {
    let bd = Infinity;
    A.forEach(a => { const d = Math.abs(a.deg - targetDeg); if (d < bd) { bd = d; vi = a.i; } });
    if (bd > 8) vi = null;
  }
  if (lab) {   // the marked vertex wins when it is unambiguous
    let bd = Infinity, li = null;
    A.forEach(a => { const d = Math.hypot(a.v[0] - lab.x, a.v[1] - lab.y); if (d < bd) { bd = d; li = a.i; } });
    if (li !== null && (vi === null || Math.abs(A[li].deg - (targetDeg ?? A[li].deg)) < 8)) vi = li;
  }
  if (vi === null) return null;
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((x, y) => y.len > x.len ? y : x);
  const opp = edges.find(e => e.a !== vi && e.b !== vi);
  const adj = edges.find(e => e !== hyp && e !== opp);
  if (!hyp || !opp || !adj) return null;
  const labs = (this.diagramLabels() || []).filter(l => !/°/.test(l.t));
  const names = new Map();
  const free = edges.slice(), pool = labs.slice();
  while (pool.length && free.length) {
    let bl = 0, be = 0, bd = Infinity;
    pool.forEach((l, li) => free.forEach((e, ei) => {
      const d = Math.hypot(l.x - e.mid[0], l.y - e.mid[1]);
      if (d < bd) { bd = d; bl = li; be = ei; }
    }));
    names.set(free[be], pool[bl].t.trim());
    pool.splice(bl, 1); free.splice(be, 1);
  }
  return { opp: names.get(opp) ?? null, adj: names.get(adj) ?? null, hyp: names.get(hyp) ?? null,
           lenOpp: opp.len, lenAdj: adj.len, lenHyp: hyp.len };
};
;'__duo ready';

// Pythagorean setup choices (1^2 + 1^2 = x^2 vs 1^2 + x^2 = 1^2): the correct
// one has the HYPOTENUSE alone on one side.
window.__duo.solvePythagoras = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const T = this.triangleLabelsAt(null);
  const V = this.trianglePolygon();
  let hypName = T && T.hyp;
  if (!hypName && V) {                        // fall back: longest edge's label
    const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
      len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
      mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2] }));
    const h = edges.reduce((x, y) => y.len > x.len ? y : x);
    const labs = (this.diagramLabels() || []).filter(l => !/°/.test(l.t));
    let best = null, bd = Infinity;
    for (const l of labs) { const d = Math.hypot(l.x - h.mid[0], l.y - h.mid[1]); if (d < bd) { bd = d; best = l; } }
    hypName = best ? best.t.trim() : null;
  }
  if (!hypName) return null;
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/\s/g, '');
    const m = t.match(/^(.+)=(.+)$/); if (!m) return false;
    const lhs = m[1], rhs = m[2];
    const alone = s => s === hypName + '^2' || s === hypName + '2';
    const hasPlus = s => s.includes('+');
    return (alone(rhs) && hasPlus(lhs)) || (alone(lhs) && hasPlus(rhs));
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePythagoras', /select the match|which equation|pythag/i]);
;'__duo ready';

// complementary (sums to 90) / supplementary (sums to 180) angles
window.__duo.solveComplement = function () {
  const ins = this.curInstruction();
  const m = ins.replace(/\s/g, '').match(/(complementary|supplementary)angle(?:to|of)?(-?\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const want = (/^c/i.test(m[1]) ? 90 : 180) - parseFloat(m[2]);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const v = parseFloat(this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°/gi, ''));
    return isFinite(v) && Math.abs(v - want) < 1e-6;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveComplement', /complementary|supplementary/i]);

// cofunction pattern: sin(θ) = cos(90 − θ), so "complete the pattern" rows pair
// a sine with the cosine of the complement.
window.__duo.solveCofunction = function () {
  if (!/complete the pattern/i.test(this.curInstruction())) return null;
  const L = this.promptLatex().map(l => this.plainMath(l).replace(/degree[s]?|°/gi, ''));
  let want = null;
  for (let i = 0; i < L.length; i++) {
    if (L[i] !== '') continue;
    const prev = L[i - 1] || '';
    const m = prev.match(/(sin|cos|tan)\((-?\d+(?:\.\d+)?)\)/i);
    if (!m) continue;
    const other = m[1].toLowerCase() === 'sin' ? 'cos' : m[1].toLowerCase() === 'cos' ? 'sin' : 'tan';
    want = other + '(' + (90 - parseFloat(m[2])) + ')';
    break;
  }
  if (!want) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°|\s/gi, '') === want);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCofunction', /complete the pattern/i]);
;'__duo ready';

// Symbolic cofunction identities: sin(θ)=cos(90°−θ) is the only true pairing
// (sin↔cos); verify numerically at a sample angle so any phrasing works.
window.__duo.solveIdentity = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const D = Math.PI / 180, F = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°|theta/gi, m => /theta/i.test(m) ? 'T' : '');
    const m = t.match(/^(sin|cos|tan)\(T\)=(sin|cos|tan)\(90-T\)$/i);
    if (!m) return;
    const f = F[m[1].toLowerCase()], g = F[m[2].toLowerCase()];
    const ok = [20, 35, 50, 70].every(a => Math.abs(f(a * D) - g((90 - a) * D)) < 1e-9);
    if (ok) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveIdentity', /select the match|identity|theta/i]);
;'__duo ready';

// Choices like \frac{\sin(53°)}{\cos(53°)} — evaluate whole trig expressions,
// including fractions and products of trig calls.
window.__duo.evalTrigExpr = function (text) {
  let t = String(text)
    .replace(/\\mathbf|\\textbf|\\text/g, '')
    .replace(/\\degree|°|degrees?/gi, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\/g, '')
    .replace(/\s/g, '');
  for (let i = 0; i < 3; i++) {
    const m = t.match(/^\{(.*)\}$/); if (!m) break; t = m[1];
  }
  t = t.replace(/[{}]/g, '');
  if (!/^[-+*/().0-9a-z]+$/i.test(t)) return null;
  const D = Math.PI / 180;
  const js = t.replace(/(sin|cos|tan)\(([^()]*)\)/gi,
    (m0, f, a) => 'Math.' + f.toLowerCase() + '((' + a + ')*' + D + ')');
  if (/[a-z]/i.test(js.replace(/Math\.(sin|cos|tan)/g, ''))) return null;
  try {
    const v = Function('"use strict";return (' + js + ')')();
    return isFinite(v) ? v : null;
  } catch (e) { return null; }
};
;'__duo ready';

// Choices that are complete equations: keep the one that is numerically TRUE.
// Covers sin/cos = tan, cofunction identities, and plain arithmetic claims.
window.__duo.solveTrueEquation = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const hits = [];
  ch.forEach((e, i) => {
    const raw = this.choiceLatex(e);
    const parts = raw.split('=');
    if (parts.length !== 2) return;
    const a = this.evalTrigExpr(parts[0]), b = this.evalTrigExpr(parts[1]);
    if (a === null || b === null) return;
    if (Math.abs(a - b) < 1e-9) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveTrueEquation', /select the match|which (equation|statement)|identity/i]);
;'__duo ready';
