
// dots are sometimes <g class="point static normal"> wrappers, not bare shapes
(function () {
  const base = window.__duo.dotPlot;
  window.__duo.dotPlot = function () {
    const f = [...document.querySelectorAll('iframe')]
      .find(fr => { try { return /dot-plot/.test(fr.contentDocument.body.innerHTML.slice(0, 4000)); } catch (e) { return false; } });
    if (!f) return base.call(this);
    const doc = f.contentDocument;
    let marks = [...doc.querySelectorAll('g,circle,ellipse,image,path')]
      .filter(e => /(^|\s)(point|dot|marker)(\s|$)/i.test(e.getAttribute('class') || ''))
      .map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; })
      .filter(m => m.w > 0);
    const uniq = [];
    for (const m of marks) if (!uniq.some(u => Math.abs(u.x - m.x) < 6 && Math.abs(u.y - m.y) < 6)) uniq.push(m);
    marks = uniq;
    const labels = [...doc.querySelectorAll('div,span,text,tspan')]
      .filter(e => e.children.length === 0 && /^-?\d+(\.\d+)?$/.test(e.textContent.trim()))
      .map(e => { const r = e.getBoundingClientRect(); return { v: parseFloat(e.textContent.trim()), x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (!marks.length || !labels.length) return null;
    const axisY = Math.max(...labels.map(l => l.y));
    const axis = labels.filter(l => Math.abs(l.y - axisY) < 20);
    if (!axis.length) return null;
    const counts = {};
    for (const l of axis) counts[l.v] = 0;
    for (const m of marks) {
      let best = null, bd = Infinity;
      for (const l of axis) { const d = Math.abs(l.x - m.x); if (d < bd) { bd = d; best = l; } }
      if (best && bd < 30) counts[best.v]++;
    }
    return counts;
  };
})();
;'__duo ready';

// Dot-plot "plot the data" needs a real OS mouse drag, which no in-page solver
// can do. Hand it back immediately (run2 logs needdrag and stops) instead of
// letting a generic drag solver submit a wrong answer and burn a heart.
window.__duo.needsRealMouse = function () {
  if (!/plot the data|complete the (dot )?plot/i.test(this.curInstruction())) return false;
  return !!this.dotPlotDrags() || this.gridPoints().length > 1;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.needsRealMouse()) return false;
    return await base.call(this);
  };
})();
;'__duo ready';

// Unit 173+: rigid motions. When a point and its image are both plotted, the
// mirror line sits halfway between them, so the distance from either point to
// the line is half the separation.
window.__duo.reflectionDistance = function () {
  const P = this.plottedPoints();
  if (P.length !== 2) return null;
  const d = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const half = d / 2;
  return Math.abs(half - Math.round(half)) < 1e-6 ? Math.round(half) : Math.round(half * 100) / 100;
};
(function () {
  const RE = /distance from [a-z].{0,24}line of reflection|distance to the (mirror|line of reflection)/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const v = this.reflectionDistance(); if (v !== null) return v; }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.reflectionDistance();
      if (v !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 1e-6; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// "Place the line as the line of reflection": a slider moves a vertical (or
// horizontal) line; it belongs at the midpoint between the point and its image.
// The line's own two endpoints share a coordinate, which is how they are told
// apart from the point pair.
window.__duo.solveMirrorSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  if (!/line of reflection|mirror/i.test(this.curInstruction())) return false;
  const P = this.plottedPoints(); if (P.length < 4) return false;
  const groupBy = i => { const m = {}; for (const p of P) (m[p[i]] = m[p[i]] || []).push(p); return m; };
  let pair = null, axis = null;
  for (const i of [0, 1]) {
    const g = groupBy(i);
    const lineKey = Object.keys(g).find(k => g[k].length === 2 && P.length - 2 === 2);
    if (!lineKey) continue;
    const rest = P.filter(p => String(p[i]) !== lineKey);
    if (rest.length === 2) { pair = rest; axis = i; break; }
  }
  if (!pair) return false;
  const mid = (pair[0][axis] + pair[1][axis]) / 2;
  if (mid < S.s.min || mid > S.s.max) return false;
  return await this.setSlider2d(mid);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveMirrorSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// Real shape: several labelled points and their images (A→A', B→B'). Pair each
// point with its image by the coordinate they share, then the mirror sits at
// the common midpoint. The line's own two endpoints are the pair sitting at the
// slider's current value.
window.__duo.solveMirrorSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  if (!/line of reflection|mirror/i.test(this.curInstruction())) return false;
  const cur = this.sliderValue();
  let P = this.plottedPoints(); if (P.length < 4) return false;
  for (const axis of [0, 1]) {
    const other = 1 - axis;
    // drop the line: two points whose axis coordinate is the slider's value
    const pts = P.filter(p => cur === null || p[axis] !== cur);
    if (pts.length < 2 || pts.length % 2) continue;
    const groups = {};
    for (const p of pts) (groups[p[other]] = groups[p[other]] || []).push(p);
    const mids = [];
    let ok = true;
    for (const k of Object.keys(groups)) {
      const g = groups[k];
      if (g.length !== 2) { ok = false; break; }
      mids.push((g[0][axis] + g[1][axis]) / 2);
    }
    if (!ok || !mids.length) continue;
    if (mids.some(m => Math.abs(m - mids[0]) > 1e-9)) continue;
    const mid = mids[0];
    if (mid < S.s.min || mid > S.s.max) continue;
    return await this.setSlider2d(mid);
  }
  return false;
};
;'__duo ready';

// "Perform the transformation: reflection" — one draggable point and a drawn
// mirror line. Find the line in grid coordinates (grid.pixelToGrid on its
// rendered position), reflect the point across it, and drag it there.
window.__duo.mirrorLine = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, fr = d.f.getBoundingClientRect();
  const cands = [...doc.querySelectorAll('line,path')]
    .filter(e => { const c = e.getAttribute('class') || '';
      return /arrow|reference|reflection|mirror/i.test(c) && !/axis|grid/i.test(c); })
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 20 || r.height > 20);
  if (!cands.length) return null;
  const r = cands.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  const g = d.M.grid;
  const toGrid = (px, py) => { try { return g.pixelToGrid([px, py]); } catch (e) { return null; } };
  const a = toGrid(r.left, r.top), b = toGrid(r.right, r.bottom);
  if (!a || !b) return null;
  if (r.width > r.height) return { horiz: true, at: (a[1] + b[1]) / 2 };
  return { horiz: false, at: (a[0] + b[0]) / 2 };
};
window.__duo.solveReflectPoint = async function () {
  if (!/reflect/i.test(this.curInstruction())) return false;
  const pts = this.gridPoints(); if (pts.length !== 1) return false;
  const L = this.mirrorLine(); if (!L) return false;
  const p = pts[0];
  const at = Math.round(L.at * 2) / 2;
  const target = L.horiz ? [p.x, 2 * at - p.y] : [2 * at - p.x, p.y];
  if (Math.abs(target[0] - p.x) < 1e-9 && Math.abs(target[1] - p.y) < 1e-9) return false;
  await this.dragPointTo(p, target[0], target[1]);
  const q = this.gridPoints()[0];
  return !!q && Math.abs(q.x - target[0]) < 1e-6 && Math.abs(q.y - target[1]) < 1e-6;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveReflectPoint()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// the mirror's class is "axis-of-reflection", which my /axis/ exclusion ate
window.__duo.mirrorLine = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, fr = d.f.getBoundingClientRect();
  const el = [...doc.querySelectorAll('line,path')]
    .filter(e => /axis-of-reflection|line-of-reflection|reference-line|mirror/i.test(e.getAttribute('class') || ''))
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 20 || r.height > 20)
    .sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height))[0];
  if (!el) return null;
  const g = d.M.grid;
  const toGrid = (px, py) => { try { return g.pixelToGrid([px, py]); } catch (e) { return null; } };
  const a = toGrid(el.left, el.top), b = toGrid(el.right, el.bottom);
  if (!a || !b) return null;
  return el.width >= el.height
    ? { horiz: true, at: (a[1] + b[1]) / 2 }
    : { horiz: false, at: (a[0] + b[0]) / 2 };
};
;'__duo ready';

// Reflect EVERY draggable point (a segment or polygon, not just one point), and
// snap the mirror's measured position to the value that sends the points to
// whole-number coordinates.
window.__duo.solveReflectPoint = async function () {
  if (!/reflect/i.test(this.curInstruction())) return false;
  const pts = this.gridPoints(); if (!pts.length) return false;
  const L = this.mirrorLine(); if (!L) return false;
  const axis = L.horiz ? 1 : 0;
  const cands = [Math.round(L.at), Math.round(L.at * 2) / 2];
  let at = null;
  for (const c of cands) {
    if (pts.every(p => Math.abs((2 * c - p[axis ? 'y' : 'x']) % 1) < 1e-6)) { at = c; break; }
  }
  if (at === null) at = Math.round(L.at * 2) / 2;
  const targets = pts.map(p => axis ? [p.x, 2 * at - p.y] : [2 * at - p.x, p.y]);
  if (targets.every((t, i) => Math.abs(t[0] - pts[i].x) < 1e-9 && Math.abs(t[1] - pts[i].y) < 1e-9)) return false;
  for (let i = 0; i < pts.length; i++) {
    const p = this.gridPoints()[i]; if (!p) return false;
    if (Math.abs(p.x - targets[i][0]) < 1e-9 && Math.abs(p.y - targets[i][1]) < 1e-9) continue;
    await this.dragPointTo(p, targets[i][0], targets[i][1]);
  }
  const now = this.gridPoints();
  return targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6));
};
;'__duo ready';

// The rendered rect is offset from the diagram's own pixel space (there is a
// translate on the group), so pixelToGrid on screen coordinates was wrong.
// Use the <line>'s own x1/y1/x2/y2 attributes, which are already in that space.
window.__duo.mirrorLine = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, g = d.M.grid;
  const el = [...doc.querySelectorAll('line,path')]
    .find(e => /axis-of-reflection|line-of-reflection|reference-line|mirror/i.test(e.getAttribute('class') || ''));
  if (!el) return null;
  const n = a => parseFloat(el.getAttribute(a));
  const x1 = n('x1'), y1 = n('y1'), x2 = n('x2'), y2 = n('y2');
  const toGrid = (px, py) => { try { return g.pixelToGrid([px, py]); } catch (e) { return null; } };
  if ([x1, y1, x2, y2].every(v => isFinite(v))) {
    const a = toGrid(x1, y1), b = toGrid(x2, y2);
    if (!a || !b) return null;
    return Math.abs(a[0] - b[0]) < 1e-6
      ? { horiz: false, at: a[0] }
      : { horiz: true, at: a[1] };
  }
  const r = el.getBoundingClientRect();
  const c = toGrid(r.left + r.width / 2, r.top + r.height / 2);
  if (!c) return null;
  return r.width >= r.height ? { horiz: true, at: c[1] } : { horiz: false, at: c[0] };
};
;'__duo ready';

// the class selector also matched a 0x0 <path> template in <defs>; prefer a real
// <line> that carries x1/x2 coordinates
window.__duo.mirrorLine = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, g = d.M.grid;
  const RE = /axis-of-reflection|line-of-reflection|reference-line|mirror/i;
  const withCoords = [...doc.querySelectorAll('line')]
    .filter(e => RE.test(e.getAttribute('class') || ''))
    .filter(e => ['x1', 'y1', 'x2', 'y2'].every(a => isFinite(parseFloat(e.getAttribute(a)))));
  const toGrid = (px, py) => { try { return g.pixelToGrid([px, py]); } catch (e) { return null; } };
  if (withCoords.length) {
    const el = withCoords[0], n = a => parseFloat(el.getAttribute(a));
    const a = toGrid(n('x1'), n('y1')), b = toGrid(n('x2'), n('y2'));
    if (!a || !b) return null;
    return Math.abs(a[0] - b[0]) < 1e-6 ? { horiz: false, at: a[0] } : { horiz: true, at: a[1] };
  }
  const el = [...doc.querySelectorAll('line,path')]
    .filter(e => RE.test(e.getAttribute('class') || ''))
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 20 || r.height > 20)
    .sort((x, y) => Math.max(y.width, y.height) - Math.max(x.width, x.height))[0];
  if (!el) return null;
  const c = toGrid(el.left + el.width / 2, el.top + el.height / 2);
  if (!c) return null;
  return el.width >= el.height ? { horiz: true, at: c[1] } : { horiz: false, at: c[0] };
};
;'__duo ready';

// "Select the rigid motion from A to A'": split the plotted vertices into the
// two congruent shapes, then test candidate maps — translation, reflection in a
// horizontal/vertical line, rotation by 90/180/270 — and name the one that fits.
window.__duo.rigidMotion = function () {
  const P = this.plottedPoints();
  if (P.length < 2 || P.length % 2) return null;
  const half = P.length / 2;
  const A = P.slice(0, half), B = P.slice(half);
  const same = (X, Y) => X.length === Y.length &&
    X.every(p => Y.some(q => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6));
  // translation
  const v = [B[0][0] - A[0][0], B[0][1] - A[0][1]];
  if (same(A.map(p => [p[0] + v[0], p[1] + v[1]]), B)) return 'translation';
  // reflection in a vertical or horizontal line
  const xs = A.map(p => p[0]).concat(B.map(p => p[0]));
  const ys = A.map(p => p[1]).concat(B.map(p => p[1]));
  for (let k = Math.min(...xs) * 2; k <= Math.max(...xs) * 2; k += 1)
    if (same(A.map(p => [k - p[0], p[1]]), B)) return 'reflection';
  for (let k = Math.min(...ys) * 2; k <= Math.max(...ys) * 2; k += 1)
    if (same(A.map(p => [p[0], k - p[1]]), B)) return 'reflection';
  // rotation about any half-integer centre in range
  const rot = (p, c, deg) => {
    const dx = p[0] - c[0], dy = p[1] - c[1];
    if (deg === 90) return [c[0] - dy, c[1] + dx];
    if (deg === 180) return [c[0] - dx, c[1] - dy];
    return [c[0] + dy, c[1] - dx];
  };
  for (let cx = Math.min(...xs); cx <= Math.max(...xs); cx += 0.5)
    for (let cy = Math.min(...ys); cy <= Math.max(...ys); cy += 0.5)
      for (const deg of [90, 180, 270])
        if (same(A.map(p => rot(p, [cx, cy], deg)), B)) return 'rotation';
  return null;
};
window.__duo.solveRigidMotion = function () {
  const ins = this.curInstruction();
  if (!/rigid motion|which (transformation|motion)|select the match/i.test(ins)) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase());
  if (!words.some(w => /translat|rotat|reflect/.test(w))) return null;
  const k = this.rigidMotion(); if (!k) return null;
  const i = words.findIndex(w => w.includes(k.slice(0, 7)));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveRigidMotion', /rigid motion|which (transformation|motion)|select the match/i]);
;'__duo ready';

// Right-triangle questions ("select the side length opposite the 23° angle",
// "select the hypotenuse"). Read the diagram's labels with their positions: the
// side opposite a vertex is the label farthest from that vertex, and the
// hypotenuse is the side opposite the right angle.
window.__duo.diagramLabels = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  return [...doc.querySelectorAll('div,span,text,tspan')]
    .filter(e => e.children.length === 0 && e.textContent.trim())
    .map(e => { const r = e.getBoundingClientRect();
      return { t: e.textContent.trim().normalize('NFKC'), x: r.left + r.width / 2, y: r.top + r.height / 2 }; })
    .filter(l => l.x || l.y);
};
window.__duo.rightAngleXY = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const el = [...doc.querySelectorAll('rect,path,polygon,polyline')]
    .find(e => /right-angle|square-angle|perpendicular/i.test(e.getAttribute('class') || ''));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
window.__duo.solveTriangleSide = function () {
  const ins = this.curInstruction();
  const L = this.diagramLabels(); if (!L) return null;
  const isNum = l => /^-?\d+(\.\d+)?$/.test(l.t);
  const sides = L.filter(l => isNum(l) || /^[a-z]$/i.test(l.t));
  if (sides.length < 3) return null;
  let vertex = null;
  const m = ins.replace(/\s/g, '').match(/opposite(?:the)?(-?\d+(?:\.\d+)?)/);
  if (m) vertex = L.find(l => l.t.replace(/\s/g, '').startsWith(m[1] + '°') || l.t.replace(/\s/g, '') === m[1] + '°');
  if (!vertex && /hypotenuse/i.test(ins)) vertex = this.rightAngleXY();
  if (!vertex) return null;
  let best = null, bd = -1;
  for (const s of sides) {
    const dd = Math.hypot(s.x - vertex.x, s.y - vertex.y);
    if (dd > bd) { bd = dd; best = s; }
  }
  if (!best) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const want = best.t.replace(/\s/g, '');
  const i = ch.findIndex(e => this.plainMath(this.choiceLatex(e)).replace(/\s/g, '') === want);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveTriangleSide', /hypotenuse|opposite the|adjacent to/i]);
;'__duo ready';
