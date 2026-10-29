
// "30° clockwise" -> pick the signed form (-30°); "N° counterclockwise" -> +N.
window.__duo.solveSignedAngle = function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  const m = all.match(/(-?\d+(?:\.\d+)?)(?:°|degrees?)(counterclockwise|clockwise)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const want = /counter/.test(m[2]) ? Math.abs(n) : -Math.abs(n);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degrees?|°/gi, '').replace(/[−–—]/g, '-');
    const v = parseFloat(t);
    return isFinite(v) && Math.abs(v - want) < 1e-6;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveSignedAngle', /clockwise/i]);

// "Select the angle of rotation from A to A'": measure it.
window.__duo.solveRotationAngle = function () {
  if (!/angle of rotation/i.test(this.curInstruction())) return null;
  const R = this.rotationInfo(); if (!R) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const norm = a => ((a % 360) + 360) % 360;
  const want = norm(R.ccw ? R.deg : -R.deg);
  let i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degrees?|°/gi, '').replace(/[−–—]/g, '-');
    const v = parseFloat(t);
    return isFinite(v) && Math.abs(norm(v) - want) < 1;
  });
  if (i < 0) i = ch.findIndex(e => {
    const v = parseFloat(this.plainMath(this.choiceLatex(e)).replace(/degrees?|°/gi, '').replace(/[−–—]/g, '-'));
    return isFinite(v) && Math.abs(Math.abs(v) - R.deg) < 1;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveRotationAngle', /angle of rotation/i]);
;'__duo ready';

// Nearest-label matching gave A' the centre point (labels sit close together).
// Assign labels to points ONE-TO-ONE, closest pair first.
window.__duo.namedPoints = function () {
  const V = this.plottedPoints();
  const labs = (this.diagramLabels() || [])
    .filter(l => /^[A-Za-z]['’]?$/.test(l.t.trim().replace(/\s/g, '')));
  if (!V.length || !labs.length) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid;
  const pos = [];
  for (const l of labs) {
    let px; try { px = g.pixelToGrid([l.x, l.y]); } catch (e) { continue; }
    pos.push({ name: l.t.trim().replace(/\s|’/g, "'"), px });
  }
  const out = {}, freeP = V.slice(), freeL = pos.slice();
  while (freeL.length && freeP.length) {
    let bl = 0, bp = 0, bd = Infinity;
    freeL.forEach((l, li) => freeP.forEach((p, pi) => {
      const dd = Math.hypot(p[0] - l.px[0], p[1] - l.px[1]);
      if (dd < bd) { bd = dd; bl = li; bp = pi; }
    }));
    if (bd > 3.5) break;
    out[freeL[bl].name] = freeP[bp];
    freeL.splice(bl, 1); freeP.splice(bp, 1);
  }
  return Object.keys(out).length >= 2 ? out : null;
};
(function () {
  const base = window.__duo.rotationInfo;
  window.__duo.rotationInfo = function () {
    const N = this.namedPoints();
    if (N) {
      const keys = Object.keys(N);
      const plain = keys.find(k => /^[A-Z]$/.test(k));
      const prime = keys.find(k => /^[A-Z]'$/.test(k));
      const cen = keys.find(k => /^[a-z]$/.test(k));       // lowercase = centre
      if (plain && prime) {
        const pre = N[plain], img = N[prime];
        const c = cen ? N[cen] : [0, 0];
        const a = [pre[0] - c[0], pre[1] - c[1]], b = [img[0] - c[0], img[1] - c[1]];
        const cross = a[0] * b[1] - a[1] * b[0], dot = a[0] * b[0] + a[1] * b[1];
        const deg = Math.atan2(cross, dot) * 180 / Math.PI;
        return { deg: Math.round(Math.abs(deg)), ccw: deg > 0, centre: c };
      }
    }
    return base.call(this);
  };
})();
;'__duo ready';

// Labels sit offset from their points (consistently to the right), so greedy
// nearest-first stole the wrong point. Choose the assignment minimising TOTAL
// distance — with <= 6 labels a full permutation search is cheap and exact.
window.__duo.namedPoints = function () {
  const V = this.plottedPoints();
  const labs = (this.diagramLabels() || [])
    .filter(l => /^[A-Za-z]['’]?$/.test(l.t.trim().replace(/\s/g, '')));
  if (!V.length || !labs.length) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid;
  const L = [];
  for (const l of labs) {
    let px; try { px = g.pixelToGrid([l.x, l.y]); } catch (e) { continue; }
    L.push({ name: l.t.trim().replace(/\s|’/g, "'"), px });
  }
  if (L.length < 2 || L.length > 6 || V.length < L.length) return null;
  const idx = V.map((_, i) => i);
  let best = null, bestCost = Infinity;
  const perm = (chosen, remaining) => {
    if (chosen.length === L.length) {
      let c = 0;
      chosen.forEach((pi, li) => { c += Math.hypot(V[pi][0] - L[li].px[0], V[pi][1] - L[li].px[1]); });
      if (c < bestCost) { bestCost = c; best = chosen.slice(); }
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      chosen.push(remaining[i]);
      perm(chosen, remaining.filter((_, k) => k !== i));
      chosen.pop();
    }
  };
  perm([], idx);
  if (!best) return null;
  const out = {};
  best.forEach((pi, li) => { out[L[li].name] = V[pi]; });
  return out;
};
;'__duo ready';

// typed "enter the angle of rotation from A to A'"


// "Rotate 90° counterclockwise": apply the stated rotation about the marked
// centre (lowercase label, else the origin) to every draggable point.
window.__duo.solveRotatePoints = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  const m = all.match(/(-?\d+(?:\.\d+)?)(?:°|degrees?)(counterclockwise|clockwise)/);
  if (!m) return false;
  const n = Math.abs(parseFloat(m[1]));
  const ccw = /counter/.test(m[2]);
  const pts = this.gridPoints(); if (!pts.length) return false;
  const N = this.namedPoints();
  let c = [0, 0];
  if (N) { const k = Object.keys(N).find(x => /^[a-z]$/.test(x)); if (k) c = N[k]; }
  const rad = (ccw ? 1 : -1) * n * Math.PI / 180;
  const cs = Math.cos(rad), sn = Math.sin(rad);
  const rot = p => {
    const dx = p[0] - c[0], dy = p[1] - c[1];
    return [Math.round((c[0] + dx * cs - dy * sn) * 1e6) / 1e6,
            Math.round((c[1] + dx * sn + dy * cs) * 1e6) / 1e6];
  };
  const targets = pts.map(p => rot([p.x, p.y]));
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
    if (await this.solveRotatePoints()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// A bare "90°" with no direction word means counterclockwise (Duolingo's
// convention); a negative angle means clockwise. Also allow a lone lowercase
// centre label, which namedPoints rejects for needing two labels.
window.__duo.centrePoint = function () {
  const N = this.namedPoints();
  if (N) { const k = Object.keys(N).find(x => /^[a-z]$/.test(x)); if (k) return N[k]; }
  const labs = (this.diagramLabels() || []).filter(l => /^[a-z]$/.test(l.t.trim()));
  const d = this.diagram();
  if (labs.length === 1 && d && d.M.grid) {
    let px; try { px = d.M.grid.pixelToGrid([labs[0].x, labs[0].y]); } catch (e) { px = null; }
    if (px) {
      let best = null, bd = Infinity;
      for (const p of this.plottedPoints()) {
        const dd = Math.hypot(p[0] - px[0], p[1] - px[1]);
        if (dd < bd) { bd = dd; best = p; }
      }
      if (best && bd < 3.5) return best;
    }
  }
  return [0, 0];
};
(function () {
  const base = window.__duo.solveRotatePoints;
  window.__duo.solveRotatePoints = async function () {
    if (await base.call(this)) return true;
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/rotate/.test(all)) return false;
    const m = all.match(/(-?\d+(?:\.\d+)?)(?:°|degrees?)/);
    if (!m) return false;
    const n = parseFloat(m[1]);
    const rad = n * Math.PI / 180;          // positive = counterclockwise
    const c = this.centrePoint();
    const pts = this.gridPoints(); if (!pts.length) return false;
    const cs = Math.cos(rad), sn = Math.sin(rad);
    const targets = pts.map(p => {
      const dx = p.x - c[0], dy = p.y - c[1];
      return [Math.round((c[0] + dx * cs - dy * sn) * 1e6) / 1e6,
              Math.round((c[1] + dx * sn + dy * cs) * 1e6) / 1e6];
    });
    if (targets.every((t, i) => Math.abs(t[0] - pts[i].x) < 1e-9 && Math.abs(t[1] - pts[i].y) < 1e-9)) return false;
    for (let i = 0; i < pts.length; i++) {
      const p = this.gridPoints()[i]; if (!p) return false;
      await this.dragPointTo(p, targets[i][0], targets[i][1]);
    }
    const now = this.gridPoints();
    return targets.every(t => now.some(q => Math.abs(q.x - t[0]) < 1e-6 && Math.abs(q.y - t[1]) < 1e-6));
  };
})();
;'__duo ready';

// "Select the position of A from center C": the offset A - C, worded as
// "2 left, 1 up" style choices.
window.__duo.solvePositionFromCentre = function () {
  const ins = this.curInstruction().replace(/\s/g, '');
  const m = ins.match(/positionof([a-z])('?)from(?:center|centre)([a-z])/i);
  if (!m) return null;
  const N = this.namedPoints(); if (!N) return null;
  const p = N[(m[1] + m[2]).toUpperCase()] || N[m[1] + m[2]];
  const c = N[m[3]] || N[m[3].toLowerCase()] || this.centrePoint();
  if (!p || !c) return null;
  const v = [p[0] - c[0], p[1] - c[1]];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const w = this.parseWordVector(this.choiceLatex(e));
    return w && Math.abs(w[0] - v[0]) < 1e-6 && Math.abs(w[1] - v[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePositionFromCentre', /position of .{0,12}from (center|centre)/i]);

// the worded choices here omit the word "units" ("2 left", "1 up")
(function () {
  const base = window.__duo.parseWordVector;
  window.__duo.parseWordVector = function (text) {
    const r = base.call(this, text); if (r) return r;
    const t = this.ascii(text).replace(/\\(mathbf|textbf|text)\b/g, '').replace(/[{}\\]/g, '')
      .replace(/\s+/g, ' ').toLowerCase();
    const seen = {};
    for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(left|right|up|down)/g))
      if (seen[m[2]] === undefined) seen[m[2]] = parseFloat(m[1]);
    if (!Object.keys(seen).length) return null;
    return [(seen.right || 0) - (seen.left || 0), (seen.up || 0) - (seen.down || 0)];
  };
})();
;'__duo ready';

// "Select the match" with polygon names: count the drawn shape's corners
// (points where the outline changes direction sharply) and name it.
window.__duo.SHAPE_NAMES = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon',
  6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' };
window.__duo.countCorners = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const el = [...doc.querySelectorAll('path,polygon,polyline')]
    .find(e => /polygon|(^|\s)shape(\s|$)/i.test(e.getAttribute('class') || ''));
  if (!el || typeof el.getTotalLength !== 'function') return null;
  let L = 0; try { L = el.getTotalLength(); } catch (e) { return null; }
  if (!L) return null;
  const N = 360, P = [];
  for (let i = 0; i < N; i++) { const q = el.getPointAtLength((i / N) * L); P.push([q.x, q.y]); }
  let corners = 0;
  for (let i = 0; i < N; i++) {
    const a = P[(i - 6 + N) % N], b = P[i], c = P[(i + 6) % N];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (lu < 1e-6 || lv < 1e-6) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
    if (ang > 0.5) corners++;               // sharp turn
  }
  // each corner spans several samples; collapse by the sample window
  return Math.max(3, Math.round(corners / 11));
};
window.__duo.solveShapeName = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  if (!words.some(w => /gon|triangle|square|rectangle|rhombus/.test(w))) return null;
  const n = this.countCorners(); if (!n) return null;
  const name = this.SHAPE_NAMES[n];
  if (!name) return null;
  let i = words.findIndex(w => w.startsWith(name));
  if (i < 0 && n === 4) i = words.findIndex(w => /square|rectangle|rhombus|quadrilateral/.test(w));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveShapeName', /select the match|what shape|name the shape/i]);
;'__duo ready';

// "rotational symmetry" vs "reflectional symmetry": sample the drawn outline,
// then test whether it maps onto itself under a rotation (<360°) or a mirror.
window.__duo.shapeSamples = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const el = [...doc.querySelectorAll('path,polygon,polyline')]
    .find(e => /polygon|(^|\s)shape(\s|$)/i.test(e.getAttribute('class') || ''));
  if (!el || typeof el.getTotalLength !== 'function') return null;
  let L = 0; try { L = el.getTotalLength(); } catch (e) { return null; }
  if (!L) return null;
  const P = [];
  for (let i = 0; i < 240; i++) { const q = el.getPointAtLength((i / 240) * L); P.push([q.x, q.y]); }
  return P;
};
window.__duo.symmetryOf = function () {
  const P = this.shapeSamples(); if (!P) return null;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const span = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  const tol = span * 0.06;
  const near = q => P.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol);
  const maps = f => P.every(p => near(f(p)));
  let rot = false;
  for (const deg of [180, 120, 90, 72, 60]) {
    const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    if (maps(p => { const dx = p[0] - cx, dy = p[1] - cy;
      return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs]; })) { rot = true; break; }
  }
  let ref = false;
  for (let a = 0; a < 180; a += 15) {
    const r = a * Math.PI / 180, c2 = Math.cos(2 * r), s2 = Math.sin(2 * r);
    if (maps(p => { const dx = p[0] - cx, dy = p[1] - cy;
      return [cx + dx * c2 + dy * s2, cy + dx * s2 - dy * c2]; })) { ref = true; break; }
  }
  return { rot, ref };
};
window.__duo.solveSymmetry = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  if (!words.some(w => /symmetry/.test(w))) return null;
  const S = this.symmetryOf(); if (!S) return null;
  if (S.ref && !S.rot) { const i = words.findIndex(w => w.startsWith('reflection') || w.startsWith('reflectional')); if (i >= 0) return { i }; }
  if (S.rot && !S.ref) { const i = words.findIndex(w => w.startsWith('rotational')); if (i >= 0) return { i }; }
  return null;
};
window.__duo.RULES.unshift(['solveSymmetry', /symmetry|select the match/i]);
;'__duo ready';

// "Select the number of lines of symmetry": sweep mirror angles and count the
// distinct ones that map the outline onto itself.
window.__duo.countSymmetryLines = function () {
  const P = this.shapeSamples(); if (!P) return null;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const span = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  const tol = span * 0.06;
  const near = q => P.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol);
  const hits = [];
  for (let a = 0; a < 180; a += 1) {
    const r = a * Math.PI / 180, c2 = Math.cos(2 * r), s2 = Math.sin(2 * r);
    const ok = P.every(p => { const dx = p[0] - cx, dy = p[1] - cy;
      return near([cx + dx * c2 + dy * s2, cy + dx * s2 - dy * c2]); });
    if (ok) hits.push(a);
  }
  // collapse angles that are within a few degrees of each other
  const groups = [];
  for (const a of hits) {
    if (!groups.some(g => Math.min(Math.abs(g - a), 180 - Math.abs(g - a)) < 8)) groups.push(a);
  }
  return groups.length;
};
window.__duo.solveSymmetryCount = function () {
  if (!/number of lines of symmetry|how many lines of symmetry/i.test(this.curInstruction())) return null;
  const n = this.countSymmetryLines(); if (n === null) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - n) < 1e-9; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveSymmetryCount', /lines of symmetry/i]);
;'__duo ready';
