
// "Select the translation": choices are worded vectors ("3 units right, 2 units
// down"). Measure the actual shift, then parse each choice the same way.
window.__duo.parseWordVector = function (text) {
  const t = this.ascii(text).replace(/\\(mathbf|textbf|text)\b/g, '').replace(/[{}\\]/g, '')
    .replace(/\s/g, '').toLowerCase();
  const seen = {};
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)units?(left|right|up|down)/g))
    if (seen[m[2]] === undefined) seen[m[2]] = parseFloat(m[1]);
  if (!Object.keys(seen).length) return null;
  return [(seen.right || 0) - (seen.left || 0), (seen.up || 0) - (seen.down || 0)];
};
window.__duo.solveSelectTranslation = function () {
  if (!/select the translation|which translation/i.test(this.curInstruction())) return null;
  let v = this.translationVector();
  if (!v) {
    const P = this.plottedPoints();
    if (P.length >= 2 && P.length % 2 === 0) {
      const h = P.length / 2, A = P.slice(0, h), B = P.slice(h);
      const d = [B[0][0] - A[0][0], B[0][1] - A[0][1]];
      if (A.every((p, i) => Math.abs(B[i][0] - p[0] - d[0]) < 1e-6 && Math.abs(B[i][1] - p[1] - d[1]) < 1e-6)) v = d;
    }
  }
  if (!v) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const w = this.parseWordVector(this.choiceLatex(e));
    return w && Math.abs(w[0] - v[0]) < 1e-6 && Math.abs(w[1] - v[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveSelectTranslation', /select the translation|which translation/i]);
;'__duo ready';

// typed magnitudes: "enter the vertical/horizontal magnitude of the translation"


// Pre-image and image drawn as POLYGONS (no plotted points): measure the shift
// from the two shapes' centroids, in grid units.
window.__duo.shapeShift = function () {
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const doc = d.f.contentDocument, g = d.M.grid;
  const shapes = [...doc.querySelectorAll('path,polygon,polyline')]
    .filter(e => /polygon|(^|\s)shape(\s|$)/i.test(e.getAttribute('class') || ''))
    .filter(e => typeof e.getTotalLength === 'function');
  if (shapes.length < 2) return null;
  const centroid = el => {
    let L = 0; try { L = el.getTotalLength(); } catch (e) { return null; }
    if (!L) return null;
    const ctm = el.getScreenCTM(); if (!ctm) return null;
    const svg = el.ownerSVGElement;
    const fr = d.f.getBoundingClientRect();
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      const q = el.getPointAtLength((i / 60) * L);
      const p = svg.createSVGPoint(); p.x = q.x; p.y = q.y;
      const t = p.matrixTransform(ctm);
      let gp; try { gp = g.pixelToGrid([t.x - fr.left, t.y - fr.top]); } catch (e) { continue; }
      sx += gp[0]; sy += gp[1]; n++;
    }
    return n ? [sx / n, sy / n] : null;
  };
  const A = centroid(shapes[0]), B = centroid(shapes[1]);
  if (!A || !B) return null;
  const v = [Math.round(B[0] - A[0]), Math.round(B[1] - A[1])];
  return (v[0] || v[1]) ? v : null;
};
(function () {
  const base = window.__duo.solveMakeVector;
  window.__duo.solveMakeVector = async function () {
    if (await base.call(this)) return true;
    const all = this.mathParts().join(' ').replace(/\s/g, '').toLowerCase();
    if (!/createthevector/.test(all)) return false;
    let v = this.shapeShift(); if (!v) return false;
    const drag = this.gridPoints(); if (drag.length !== 2) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    for (const [ti, hi] of [[0, 1], [1, 0]]) {
      const tail = drag[ti], want = [tail.x + v[0], tail.y + v[1]];
      if (want[0] < x0 || want[0] > x1 || want[1] < y0 || want[1] > y1) continue;
      await this.dragPointTo(this.gridPoints()[hi], want[0], want[1]);
      const q = this.gridPoints();
      if (q.length === 2 && Math.abs(q[hi].x - want[0]) < 1e-6 && Math.abs(q[hi].y - want[1]) < 1e-6) return true;
    }
    return false;
  };
})();
;'__duo ready';

// worded-vector choices also appear for shape-to-shape transformations
(function () {
  const RE = /select the (translation|transformation)|which translation/i;
  const base = window.__duo.solveSelectTranslation;
  window.__duo.solveSelectTranslation = function () {
    const r = base.call(this); if (r) return r;
    if (!RE.test(this.curInstruction())) return null;
    const v = this.shapeShift(); if (!v) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const w = this.parseWordVector(this.choiceLatex(e));
      return w && Math.abs(w[0] - v[0]) < 1e-6 && Math.abs(w[1] - v[1]) < 1e-6; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveSelectTranslation', RE]);
})();
;'__duo ready';

// magnitudes for the shape-to-shape case (no plotted points, only polygons)
(function () {
  const RE = /magnitude of the translation|horizontal magnitude|vertical magnitude/i;
  const anyVector = function () {
    let v = this.translationVector();
    if (!v) {
      const P = this.plottedPoints();
      if (P.length >= 2 && P.length % 2 === 0) {
        const h = P.length / 2, A = P.slice(0, h), B = P.slice(h);
        const d = [B[0][0] - A[0][0], B[0][1] - A[0][1]];
        if (A.every((p, i) => Math.abs(B[i][0] - p[0] - d[0]) < 1e-6 && Math.abs(B[i][1] - p[1] - d[1]) < 1e-6)) v = d;
      }
    }
    if (!v) v = this.shapeShift();
    if (!v) v = this.statedVector();
    return v;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins)) { const v = anyVector.call(this); if (v) return /vertical/i.test(ins) ? v[1] : v[0]; }
    return bo.call(this);
  };
  const bm = window.__duo.solveMagnitude;
  window.__duo.solveMagnitude = function () {
    const r = bm.call(this); if (r) return r;
    const ins = this.curInstruction();
    if (!RE.test(ins)) return null;
    const v = anyVector.call(this); if (!v) return null;
    const want = /vertical/i.test(ins) ? v[1] : v[0];
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - want) < 1e-6; });
    return i < 0 ? null : { i };
  };
  window.__duo.RULES.unshift(['solveMagnitude', RE]);
})();
;'__duo ready';

// "Select the distance from A to A'": the gap between a point and its image.
// Works from named points, from a plotted pair, or (for a reflection) twice the
// distance to the mirror line.
window.__duo.pointToImageDistance = function () {
  const N = this.namedPoints();
  if (N) {
    const keys = Object.keys(N);
    if (keys.length >= 2) {
      const a = N[keys[0]], b = N[keys[1]];
      return Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
  }
  const P = this.plottedPoints();
  if (P.length === 2) return Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const L = this.mirrorLine();
  if (L && P.length === 1) {
    const d = L.horiz ? Math.abs(P[0][1] - L.at) : Math.abs(P[0][0] - L.at);
    return 2 * d;
  }
  const v = this.shapeShift();
  if (v) return Math.hypot(v[0], v[1]);
  return null;
};
(function () {
  const RE = /distance from [a-z].{0,8}to [a-z]/i;
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const d = this.pointToImageDistance();
      if (d !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - d) < 1e-6; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const d = this.pointToImageDistance(); if (d !== null) return d; }
    return bo.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// typed "distance from A to the line of reflection" — half the A→A' gap, or the
// perpendicular distance to the drawn mirror.
(function () {
  const RE = /distance from [a-z].{0,24}line of reflection|distance to the (mirror|line)/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) {
      const L = this.mirrorLine(), P = this.plottedPoints();
      if (L && P.length) {
        const d = L.horiz ? Math.abs(P[0][1] - L.at) : Math.abs(P[0][0] - L.at);
        if (isFinite(d)) return d;
      }
      const r = this.reflectionDistance(); if (r !== null) return r;
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// Labels can carry primes (A', B'), which the plain /^[A-Z]$/ filter rejected.
window.__duo.namedPoints = function () {
  const V = this.plottedPoints();
  const labs = (this.diagramLabels() || [])
    .filter(l => /^[A-Z]['’]?$/.test(l.t.trim().replace(/\s/g, '')));
  if (!V.length || !labs.length) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid, fr = d.f.getBoundingClientRect();
  const out = {};
  for (const l of labs) {
    let px;
    try { px = g.pixelToGrid([l.x - fr.left, l.y - fr.top]); } catch (e) { continue; }
    let best = null, bd = Infinity;
    for (const p of V) { const dd = Math.hypot(p[0] - px[0], p[1] - px[1]); if (dd < bd) { bd = dd; best = p; } }
    if (best && bd < 3) out[l.t.trim().replace(/\s|’/g, "'")] = best;
  }
  return Object.keys(out).length >= 2 ? out : null;
};
(function () {
  const base = window.__duo.solveNamedDistance;
  window.__duo.solveNamedDistance = function () {
    const ins = this.curInstruction().replace(/\s/g, '').replace(/[’]/g, "'");
    const m = ins.match(/lengthof([a-z])('?)([a-z])('?)/i);
    if (m) {
      const N = this.namedPoints();
      if (N) {
        const a = N[(m[1] + m[2]).toUpperCase()], b = N[(m[3] + m[4]).toUpperCase()];
        if (a && b) {
          const want = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
          const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-6; });
          if (i >= 0) return { i };
        }
      }
    }
    return base.call(this);
  };
  window.__duo.RULES.unshift(['solveNamedDistance', /length of/i]);
})();
;'__duo ready';

// diagramLabels' rects are already iframe-local, so subtracting the frame offset
// pushed every label off the grid and namedPoints always came back null.
window.__duo.namedPoints = function () {
  const V = this.plottedPoints();
  const labs = (this.diagramLabels() || [])
    .filter(l => /^[A-Z]['’]?$/.test(l.t.trim().replace(/\s/g, '')));
  if (!V.length || !labs.length) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid;
  const out = {};
  for (const l of labs) {
    let px;
    try { px = g.pixelToGrid([l.x, l.y]); } catch (e) { continue; }
    let best = null, bd = Infinity;
    for (const p of V) { const dd = Math.hypot(p[0] - px[0], p[1] - px[1]); if (dd < bd) { bd = dd; best = p; } }
    if (best && bd < 3.5) out[l.t.trim().replace(/\s|’/g, "'")] = best;
  }
  return Object.keys(out).length >= 2 ? out : null;
};
;'__duo ready';

// "Distance from B to the line of reflection" with several labelled points:
// look B up by name, then measure to the mirror.
window.__duo.namedToMirror = function () {
  const ins = this.curInstruction().replace(/\s/g, '').replace(/[’]/g, "'");
  const m = ins.match(/distancefrom([a-z])('?)to/i); if (!m) return null;
  const L = this.mirrorLine(); if (!L) return null;
  const N = this.namedPoints();
  const p = N && N[(m[1] + m[2]).toUpperCase()];
  if (!p) return null;
  const d = L.horiz ? Math.abs(p[1] - L.at) : Math.abs(p[0] - L.at);
  return isFinite(d) ? d : null;
};
(function () {
  const RE = /distance from [a-z].{0,30}line of reflection/i;
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const d = this.namedToMirror();
      if (d !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - d) < 1e-6; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const d = this.namedToMirror(); if (d !== null) return d; }
    return bo.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Excluding EVERY point sharing the slider's coordinate also removed real shape
// vertices. The mirror's own endpoints are the pair on that coordinate with the
// widest span — drop exactly those two.
window.__duo.solveMirrorSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  if (!/line of reflection|mirror/i.test(this.curInstruction())) return false;
  const cur = this.sliderValue();
  const P = this.plottedPoints(); if (P.length < 4) return false;
  for (const axis of [0, 1]) {
    const other = 1 - axis;
    const online = P.filter(p => cur !== null && Math.abs(p[axis] - cur) < 1e-9);
    if (online.length < 2) continue;
    // widest-separated pair on that line = the arrow's two ends
    let e1 = null, e2 = null, best = -1;
    for (let i = 0; i < online.length; i++) for (let j = i + 1; j < online.length; j++) {
      const d = Math.abs(online[i][other] - online[j][other]);
      if (d > best) { best = d; e1 = online[i]; e2 = online[j]; }
    }
    const rest = P.filter(p => p !== e1 && p !== e2);
    if (rest.length < 2 || rest.length % 2) continue;
    const groups = {};
    for (const p of rest) (groups[p[other]] = groups[p[other]] || []).push(p);
    const mids = []; let ok = true;
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

// Unit 184: rotations. "Select the matching direction of rotation" — work out
// the signed angle from a point to its image about the centre. Screen y grows
// DOWNWARD in grid coords here, so a positive cross product is counterclockwise.
window.__duo.rotationInfo = function () {
  const N = this.namedPoints();
  let pre = null, img = null;
  if (N) {
    const k = Object.keys(N);
    const plain = k.find(x => !/'/.test(x)), prime = k.find(x => /'/.test(x));
    if (plain && prime) { pre = N[plain]; img = N[prime]; }
  }
  if (!pre) {
    const P = this.plottedPoints();
    if (P.length === 2) { pre = P[0]; img = P[1]; }
  }
  if (!pre || !img) return null;
  // centre: a static point equidistant from both, else the origin
  const P = this.plottedPoints();
  let c = [0, 0];
  for (const p of P) {
    if (p === pre || p === img) continue;
    const d1 = Math.hypot(pre[0] - p[0], pre[1] - p[1]);
    const d2 = Math.hypot(img[0] - p[0], img[1] - p[1]);
    if (Math.abs(d1 - d2) < 1e-6 && d1 > 1e-6) { c = p; break; }
  }
  const a = [pre[0] - c[0], pre[1] - c[1]], b = [img[0] - c[0], img[1] - c[1]];
  const cross = a[0] * b[1] - a[1] * b[0];
  const dot = a[0] * b[0] + a[1] * b[1];
  let deg = Math.atan2(cross, dot) * 180 / Math.PI;
  const ccw = deg > 0;
  deg = Math.round(Math.abs(deg));
  return { deg, ccw, centre: c };
};
window.__duo.solveRotationDirection = function () {
  if (!/direction of rotation|which direction/i.test(this.curInstruction())) return null;
  const R = this.rotationInfo(); if (!R) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  const i = words.findIndex(w => R.ccw ? w.startsWith('counter') : (w.startsWith('clock') && !w.startsWith('counter')));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveRotationDirection', /direction of rotation|which direction/i]);
;'__duo ready';

// The prompt often just states a signed angle (-330°): negative is clockwise,
// positive counterclockwise. No geometry needed.
(function () {
  const base = window.__duo.solveRotationDirection;
  window.__duo.solveRotationDirection = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
    if (!words.some(w => /clockwise/.test(w))) return base.call(this);
    const txt = this.promptLatex().map(l => this.ascii(l)).join(' ').replace(/[−–—]/g, '-');
    const m = txt.match(/(-?\d+(?:\.\d+)?)\s*(?:°|\\degree|degrees?)/);
    if (m) {
      const ccw = parseFloat(m[1]) > 0;
      const i = words.findIndex(w => ccw ? w.startsWith('counter') : (w.startsWith('clock')));
      if (i >= 0) return { i };
    }
    return base.call(this);
  };
})();
;'__duo ready';
