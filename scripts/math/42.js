
// typed "enter the number of lines of symmetry" (and the rotational analogue)


// "Count the number of sides" and the interior-angle facts that follow.
// Corner detection: sample the outline and count sharp direction changes,
// collapsing the consecutive samples that make up one corner.
window.__duo.polygonSides = function () {
  const P = this.shapeSamples(); if (!P) return null;
  const N = P.length;
  const flags = [];
  for (let i = 0; i < N; i++) {
    const a = P[(i - 5 + N) % N], b = P[i], c = P[(i + 5) % N];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (lu < 1e-6 || lv < 1e-6) { flags.push(false); continue; }
    const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
    flags.push(ang > 0.45);
  }
  let runs = 0;
  for (let i = 0; i < N; i++) if (flags[i] && !flags[(i - 1 + N) % N]) runs++;
  return runs >= 3 ? runs : null;
};


// "Select ALL the angles of rotation": test each offered angle against the
// shape and return every one that maps it onto itself (multi-select).
window.__duo.solveAllRotationAngles = function () {
  if (!/select all the angles|all the angles of rotation/i.test(this.curInstruction())) return null;
  const P = this.shapeSamples(); if (!P) return null;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const span = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  const tol = span * 0.06;
  const near = q => P.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol);
  const maps = deg => { const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    return P.every(p => { const dx = p[0] - cx, dy = p[1] - cy;
      return near([cx + dx * cs - dy * sn, cy + dx * sn + dy * cs]); }); };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const idx = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degrees?|°/gi, '').replace(/[−–—]/g, '-');
    const v = parseFloat(t);
    if (isFinite(v) && maps(v)) idx.push(i);
  });
  return idx.length ? { idx, ok: true, multi: true } : null;
};


// Classify the drawn polygon by its own geometry: side lengths and angles give
// regular/irregular and scalene/isosceles/equilateral/right.
window.__duo.polygonVertices = function () {
  const P = this.shapeSamples(); if (!P) return null;
  const N = P.length, V = [];
  for (let i = 0; i < N; i++) {
    const a = P[(i - 5 + N) % N], b = P[i], c = P[(i + 5) % N];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (lu < 1e-6 || lv < 1e-6) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
    if (ang > 0.45) V.push({ i, p: b, ang });
  }
  // one vertex per run of flagged samples: keep the sharpest in each run
  const out = [];
  let run = [];
  for (let k = 0; k < V.length; k++) {
    if (!run.length || V[k].i - run[run.length - 1].i <= 2) run.push(V[k]);
    else { out.push(run.reduce((a, b) => b.ang > a.ang ? b : a).p); run = [V[k]]; }
  }
  if (run.length) out.push(run.reduce((a, b) => b.ang > a.ang ? b : a).p);
  return out.length >= 3 ? out : null;
};
window.__duo.classifyPolygon = function () {
  const V = this.polygonVertices(); if (!V) return null;
  const n = V.length;
  const sides = V.map((p, i) => Math.hypot(V[(i + 1) % n][0] - p[0], V[(i + 1) % n][1] - p[1]));
  const mx = Math.max(...sides), mn = Math.min(...sides);
  const equalSides = (mx - mn) / mx < 0.08;
  const angs = V.map((p, i) => {
    const a = V[(i - 1 + n) % n], c = V[(i + 1) % n];
    const u = [a[0] - p[0], a[1] - p[1]], w = [c[0] - p[0], c[1] - p[1]];
    return Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))))) * 180 / Math.PI;
  });
  const equalAngles = (Math.max(...angs) - Math.min(...angs)) < 6;
  const hasRight = angs.some(a => Math.abs(a - 90) < 4);
  let pairs = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    if (Math.abs(sides[i] - sides[j]) / mx < 0.08) pairs++;
  return { n, regular: equalSides && equalAngles, equalSides, hasRight,
           kind: n === 3 ? (equalSides ? 'equilateral' : pairs >= 1 ? 'isosceles' : 'scalene') : null };
};
window.__duo.solveClassifyShape = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  if (!words.some(w => /regular|irregular|scalene|isosceles|equilateral|right/.test(w))) return null;
  const C = this.classifyPolygon(); if (!C) return null;
  const wants = [];
  if (C.kind) wants.push(C.kind);
  wants.push(C.regular ? 'regular' : 'irregular');
  if (C.hasRight) wants.push('right');
  for (const w of wants) {
    const i = words.findIndex(x => x.startsWith(w));
    if (i >= 0) return { i };
  }
  return null;
};
window.__duo.RULES.unshift(['solveClassifyShape', /regular|irregular|scalene|isosceles|equilateral|select the match/i]);
;'__duo ready';

// "Which shape has rotational / reflectional symmetry" — a knowledge question
// about named quadrilaterals, not something measurable from the diagram.
window.__duo.SHAPE_SYM = {
  square:            { rot: true,  ref: true },
  rectangle:         { rot: true,  ref: true },
  rhombus:           { rot: true,  ref: true },
  parallelogram:     { rot: true,  ref: false },
  kite:              { rot: false, ref: true },
  isoscelestrapezoid:{ rot: false, ref: true },
  trapezoid:         { rot: false, ref: false },
  scalenetriangle:   { rot: false, ref: false },
  isoscelestriangle: { rot: false, ref: true },
  equilateraltriangle:{ rot: true, ref: true },
  regularpentagon:   { rot: true,  ref: true },
  regularhexagon:    { rot: true,  ref: true },
};
window.__duo.solveShapeSymmetryFact = function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').toLowerCase();
  const wantRot = /rotational symmetry/.test(all);
  const wantRef = /reflectional symmetry|line symmetry/.test(all);
  if (!wantRot && !wantRef) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  const known = words.map(w => this.SHAPE_SYM[w] || null);
  if (known.filter(Boolean).length < 2) return null;
  const hits = [];
  known.forEach((k, i) => {
    if (!k) return;
    if (wantRot && k.rot && !(wantRef && !k.ref)) hits.push(i);
    else if (wantRef && !wantRot && k.ref) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveShapeSymmetryFact', /symmetry/i]);
;'__duo ready';

// choice innerText is doubled ("kitekite"), so exact-key lookup always missed
(function () {
  const base = window.__duo.solveShapeSymmetryFact;
  window.__duo.solveShapeSymmetryFact = function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').toLowerCase();
    const wantRot = /rotational symmetry/.test(all);
    const wantRef = /reflectional symmetry|line symmetry/.test(all);
    if (!wantRot && !wantRef) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
    const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
    const known = words.map(w => this.SHAPE_SYM[w] || null);
    if (known.filter(Boolean).length < 2) return base.call(this);
    const hits = [];
    known.forEach((k, i) => { if (!k) return;
      if (wantRot && !wantRef && k.rot) hits.push(i);
      else if (wantRef && !wantRot && k.ref) hits.push(i);
      else if (wantRot && wantRef && k.rot && k.ref) hits.push(i); });
    return hits.length === 1 ? { i: hits[0] } : null;
  };
})();
;'__duo ready';

// "Select AN angle of rotational symmetry" (single answer): the smallest offered
// angle that maps the drawn shape onto itself.
window.__duo.solveOneRotationAngle = function () {
  if (!/angle of rotational symmetry/i.test(this.curInstruction())) return null;
  const P = this.shapeSamples(); if (!P) return null;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const span = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  const tol = span * 0.06;
  const near = q => P.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol);
  const maps = deg => { const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    return P.every(p => { const dx = p[0] - cx, dy = p[1] - cy;
      return near([cx + dx * cs - dy * sn, cy + dx * sn + dy * cs]); }); };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const cands = [];
  ch.forEach((e, i) => {
    const v = parseFloat(this.plainMath(this.choiceLatex(e)).replace(/degrees?|°/gi, '').replace(/[−–—]/g, '-'));
    if (isFinite(v) && maps(v)) cands.push({ i, v: Math.abs(v) });
  });
  if (!cands.length) {
    // fall back to the polygon's side count: 360/n
    const n = this.polygonSides();
    if (n) { const want = 360 / n;
      const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(Math.abs(v) - want) < 1; });
      if (i >= 0) return { i }; }
    return null;
  }
  cands.sort((a, b) => a.v - b.v);
  return { i: cands[0].i };
};
window.__duo.RULES.unshift(['solveOneRotationAngle', /angle of rotational symmetry/i]);
;'__duo ready';

// Unit 186: congruence. "Select the side length of the congruent figure" — the
// matching side of the image has the same length as the labelled pre-image
// side, so the answer is simply the numeric label already on the diagram.
window.__duo.solveCongruentSide = function () {
  const ins = this.curInstruction();
  if (!/congruent|corresponding/i.test(ins)) return null;
  const nums = (this.diagramLabels() || [])
    .filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim())).map(l => parseFloat(l.t));
  if (!nums.length) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const vals = ch.map(e => this.choiceValue(e));
  // exactly one offered value appears as a label on the figure
  const hits = [];
  vals.forEach((v, i) => { if (v !== null && nums.some(n => Math.abs(n - v) < 1e-9)) hits.push(i); });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveCongruentSide', /congruent|corresponding/i]);
;'__duo ready';

// No numeric labels on these congruence screens — measure the drawn figure's
// side length in GRID units instead.
window.__duo.shapeSideLength = function () {
  const V = this.polygonVertices(); if (!V || V.length < 3) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid;
  const G = [];
  for (const p of V) { let q; try { q = g.pixelToGrid([p[0], p[1]]); } catch (e) { return null; } G.push(q); }
  const n = G.length;
  const sides = G.map((p, i) => Math.hypot(G[(i + 1) % n][0] - p[0], G[(i + 1) % n][1] - p[1]));
  const r = Math.round(sides[0]);
  return sides.every(s => Math.abs(s - r) < 0.25) ? r : Math.round(sides[0] * 100) / 100;
};
(function () {
  const base = window.__duo.solveCongruentSide;
  window.__duo.solveCongruentSide = function () {
    const r = base.call(this); if (r) return r;
    if (!/congruent|corresponding|side length/i.test(this.curInstruction())) return null;
    const s = this.shapeSideLength(); if (s === null) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - s) < 0.2; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveCongruentSide', /congruent|corresponding|side length/i]);
})();
;'__duo ready';

// "Create a figure that is congruent": move the draggable vertices to a
// translated copy of the static figure — congruent by construction.
window.__duo.solveMakeCongruent = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  if (!/createafigure.*congruent|congruentfigure/.test(all)) return false;
  const drag = this.gridPoints(); if (drag.length < 3) return false;
  const dset = new Set(drag.map(p => p.x + ',' + p.y));
  const stat = this.plottedPoints().filter(p => !dset.has(p[0] + ',' + p[1]));
  if (stat.length !== drag.length) return false;
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  const offsets = [];
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) offsets.push([dx, dy]);
  offsets.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));
  for (const [dx, dy] of offsets) {
    if (!dx && !dy) continue;
    const targets = stat.map(p => [p[0] + dx, p[1] + dy]);
    if (targets.some(t => t[0] < x0 || t[0] > x1 || t[1] < y0 || t[1] > y1)) continue;
    if (targets.some(t => stat.some(s => s[0] === t[0] && s[1] === t[1]))) continue;
    for (let i = 0; i < drag.length; i++) {
      const p = this.gridPoints()[i]; if (!p) return false;
      if (Math.abs(p.x - targets[i][0]) < 1e-9 && Math.abs(p.y - targets[i][1]) < 1e-9) continue;
      await this.dragPointTo(p, targets[i][0], targets[i][1]);
    }
    const now = this.gridPoints();
    if (targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6))) return true;
    return false;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMakeCongruent()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "AB = A'B'" style comparisons: rigid motions preserve length, so measure both
// segments from the labelled points and compare.
window.__duo.solveSegmentCompare = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const N = this.namedPoints(); if (!N) return null;
  const len = (a, b) => (N[a] && N[b]) ? Math.hypot(N[b][0] - N[a][0], N[b][1] - N[a][1]) : null;
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/[’]/g, "'");
    const m = t.match(/^([A-Z]'?)([A-Z]'?)([<>=])([A-Z]'?)([A-Z]'?)$/);
    if (!m) return;
    const l1 = len(m[1], m[2]), l2 = len(m[4], m[5]);
    if (l1 === null || l2 === null) return;
    const ok = m[3] === '=' ? Math.abs(l1 - l2) < 0.05
             : m[3] === '<' ? l1 < l2 - 0.05 : l1 > l2 + 0.05;
    if (ok) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveSegmentCompare', /select the match|compare/i]);
;'__duo ready';

// "Enter the area of the congruent figures": shoelace formula over the drawn
// polygon's vertices, in grid units.
window.__duo.polygonArea = function () {
  const V = this.polygonVertices(); if (!V || V.length < 3) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid;
  const G = [];
  for (const p of V) { let q; try { q = g.pixelToGrid([p[0], p[1]]); } catch (e) { return null; } G.push(q); }
  let a = 0;
  for (let i = 0; i < G.length; i++) {
    const j = (i + 1) % G.length;
    a += G[i][0] * G[j][1] - G[j][0] * G[i][1];
  }
  const area = Math.abs(a) / 2;
  const r = Math.round(area);
  return Math.abs(area - r) < 0.25 ? r : Math.round(area * 100) / 100;
};


// wording varies: "Create a figure/triangle/shape that is congruent"
(function () {
  const base = window.__duo.solveMakeCongruent;
  window.__duo.solveMakeCongruent = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/create[a-z]*that?is?congruent|congruentfigure|createacongruent/.test(all)) {
      if (!(/create/.test(all) && /congruent/.test(all))) return false;
    }
    const drag = this.gridPoints(); if (drag.length < 3) return false;
    const dset = new Set(drag.map(p => p.x + ',' + p.y));
    const stat = this.plottedPoints().filter(p => !dset.has(p[0] + ',' + p[1]));
    if (stat.length !== drag.length) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    const offs = [];
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (dx || dy) offs.push([dx, dy]);
    offs.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));
    for (const [dx, dy] of offs) {
      const targets = stat.map(p => [p[0] + dx, p[1] + dy]);
      if (targets.some(t => t[0] < x0 || t[0] > x1 || t[1] < y0 || t[1] > y1)) continue;
      if (targets.some(t => stat.some(s => s[0] === t[0] && s[1] === t[1]))) continue;
      for (let i = 0; i < drag.length; i++) {
        const p = this.gridPoints()[i]; if (!p) return false;
        if (Math.abs(p.x - targets[i][0]) < 1e-9 && Math.abs(p.y - targets[i][1]) < 1e-9) continue;
        await this.dragPointTo(p, targets[i][0], targets[i][1]);
      }
      const now = this.gridPoints();
      return targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6));
    }
    return false;
  };
})();
;'__duo ready';
