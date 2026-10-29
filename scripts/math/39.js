
// "Create a segment with N units": two draggable endpoints; move one so the
// segment has the requested length, keeping it on the grid.
window.__duo.solveSegmentLength = async function () {
  const ins = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  if (!/segmentwith/i.test(ins)) return false;
  const m = ins.match(/(\d+(?:\.\d+)?)units?/i); if (!m) return false;
  const want = parseFloat(m[1]);
  const pts = this.gridPoints(); if (pts.length !== 2) return false;
  const [a, b] = pts;
  const cur = Math.hypot(b.x - a.x, b.y - a.y);
  if (Math.abs(cur - want) < 1e-9) return false;
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  const inRange = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  // keep the segment axis-aligned: move b along whichever axis it already shares
  const cands = [];
  if (a.x === b.x) { cands.push([a.x, a.y + want], [a.x, a.y - want]); }
  else if (a.y === b.y) { cands.push([a.x + want, a.y], [a.x - want, a.y]); }
  else { cands.push([a.x, a.y + want], [a.x + want, a.y]); }
  for (const t of cands) {
    if (!inRange(t[0], t[1])) continue;
    await this.dragPointTo(this.gridPoints()[1], t[0], t[1]);
    const q = this.gridPoints();
    if (q.length === 2 && Math.abs(Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) - want) < 1e-6) return true;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveSegmentLength()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the length of AC": labelled points on the grid — find the two named
// points by their letter labels and measure between them.
window.__duo.namedPoints = function () {
  const V = this.plottedPoints();
  const labs = (this.diagramLabels() || []).filter(l => /^[A-Z]$/.test(l.t.trim()));
  if (!V.length || !labs.length) return null;
  const d = this.diagram(); if (!d || !d.M.grid) return null;
  const g = d.M.grid, fr = d.f.getBoundingClientRect();
  const out = {};
  for (const l of labs) {
    let px;
    try { px = g.pixelToGrid([l.x - fr.left, l.y - fr.top]); } catch (e) { continue; }
    let best = null, bd = Infinity;
    for (const p of V) { const dd = Math.hypot(p[0] - px[0], p[1] - px[1]); if (dd < bd) { bd = dd; best = p; } }
    if (best && bd < 3) out[l.t.trim()] = best;
  }
  return Object.keys(out).length >= 2 ? out : null;
};
window.__duo.solveNamedDistance = function () {
  const ins = this.curInstruction();
  const m = ins.replace(/\s/g, '').match(/lengthof([A-Za-z])([A-Za-z])/);
  if (!m) return null;
  const N = this.namedPoints(); if (!N) return null;
  const a = N[m[1].toUpperCase()], b = N[m[2].toUpperCase()];
  if (!a || !b) return null;
  const want = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveNamedDistance', /length of [A-Za-z]{2}/i]);
;'__duo ready';

// Segment addition on a number line: letters mark the points, numbers label the
// gaps between consecutive letters, so AC is the sum of the gaps from A to C.
window.__duo.segmentGaps = function () {
  const labs = this.diagramLabels() || [];
  const letters = labs.filter(l => /^[A-Z]$/.test(l.t.trim())).sort((a, b) => a.x - b.x);
  const nums = labs.filter(l => /^-?\d+(\.\d+)?$/.test(l.t.trim()));
  if (letters.length < 2 || !nums.length) return null;
  const gaps = [];
  for (let i = 1; i < letters.length; i++) {
    const lo = letters[i - 1].x, hi = letters[i].x;
    const inGap = nums.filter(n => n.x > lo - 4 && n.x < hi + 4);
    if (inGap.length !== 1) return null;
    gaps.push({ from: letters[i - 1].t.trim(), to: letters[i].t.trim(), len: parseFloat(inGap[0].t) });
  }
  return gaps.length ? { letters: letters.map(l => l.t.trim()), gaps } : null;
};


// "Select the matching equation": AC = 2 + 6 — the SUM expression, not the
// evaluated total (AC = 8 is not even offered; AC = 6 is a decoy).
window.__duo.solveSegmentEquation = function () {
  const ins = this.curInstruction();
  if (!/matching equation|which equation/i.test(ins)) return null;
  const S = this.segmentGaps(); if (!S) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/\s/g, '');
    const m = t.match(/^([A-Z])([A-Z])=(.+)$/); if (!m) return;
    const a = S.letters.indexOf(m[1]), b = S.letters.indexOf(m[2]);
    if (a < 0 || b < 0) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const want = S.gaps.slice(lo, hi).map(g => g.len);
    const got = m[3].split('+').map(Number);
    if (got.length === want.length && got.every((v, k) => Math.abs(v - want[k]) < 1e-6)) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveSegmentEquation', /matching equation|which equation/i]);
;'__duo ready';

// typed forms: "enter the length of AC" / "enter the length of the segment"


// "midpoint = <2-D slider>": place the slider handle at the midpoint of the
// segment's two endpoints.
window.__duo.solveMidpoint = async function () {
  const ins = this.mathParts().concat([this.curInstruction()]).join(' ');
  if (!/midpoint/i.test(ins)) return false;
  const P = this.plottedPoints();
  const ends = P.length >= 2 ? P.slice(0, 2) : this.promptPairs().slice(0, 2);
  if (!ends || ends.length < 2) return false;
  const mid = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2];
  const pts = this.gridPoints();
  if (pts.length === 1) {
    await this.dragPointTo(pts[0], mid[0], mid[1]);
    const q = this.gridPoints()[0];
    return !!q && Math.abs(q.x - mid[0]) < 1e-6 && Math.abs(q.y - mid[1]) < 1e-6;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMidpoint()) return true;
    return await base.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (/midpoint/i.test(this.curInstruction())) {
      const P = this.plottedPoints();
      const ends = P.length >= 2 ? P.slice(0, 2) : this.promptPairs().slice(0, 2);
      if (ends && ends.length === 2) {
        const mid = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2];
        return '(' + mid[0] + ', ' + mid[1] + ')';
      }
    }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (/midpoint/i.test(this.curInstruction())) {
      const P = this.plottedPoints();
      const ends = P.length >= 2 ? P.slice(0, 2) : this.promptPairs().slice(0, 2);
      if (ends && ends.length === 2) {
        const mid = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2];
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const p = this.choicePair(e);
          return p && Math.abs(p[0] - mid[0]) < 1e-6 && Math.abs(p[1] - mid[1]) < 1e-6; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', /midpoint/i]);
})();
;'__duo ready';

// "Create a segment with midpoint (1, 1)": shift BOTH endpoints by the offset
// between the current midpoint and the requested one.
window.__duo.solveMakeMidpoint = async function () {
  const txt = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '').replace(/[{}&~\s\\]/g, '')
    .replace(/[−–—]/g, '-')).join(' ');
  if (!/midpoint/i.test(txt)) return false;
  const pts = this.gridPoints(); if (pts.length !== 2) return false;
  const pairs = [...txt.matchAll(/\((-?[\d.]+),(-?[\d.]+)\)/g)].map(m => [parseFloat(m[1]), parseFloat(m[2])]);
  const cur = [(pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2];
  // the requested midpoint is the pair that is NOT the current one
  const want = pairs.find(p => Math.abs(p[0] - cur[0]) > 1e-9 || Math.abs(p[1] - cur[1]) > 1e-9);
  if (!want) return false;
  const dx = want[0] - cur[0], dy = want[1] - cur[1];
  if (!dx && !dy) return false;
  const targets = pts.map(p => [p.x + dx, p.y + dy]);
  for (let i = 0; i < 2; i++) {
    const p = this.gridPoints()[i]; if (!p) return false;
    await this.dragPointTo(p, targets[i][0], targets[i][1]);
  }
  const q = this.gridPoints();
  return q.length === 2 &&
    Math.abs((q[0].x + q[1].x) / 2 - want[0]) < 1e-6 &&
    Math.abs((q[0].y + q[1].y) / 2 - want[1]) < 1e-6;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMakeMidpoint()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the coordinates of B" given endpoint A and the midpoint M:
// B = 2M - A. Falls back to reading B straight off the plot when it is drawn.
window.__duo.solveOtherEndpoint = function () {
  const ins = this.curInstruction();
  const m = ins.replace(/\s/g, '').match(/coordinatesof([A-Za-z])/i);
  if (!m) return null;
  const want = m[1].toUpperCase();
  const N = this.namedPoints();
  if (N && N[want]) {
    const p = N[want];
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => { const q = this.choicePair(e);
      return q && Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6; });
    if (i >= 0) return { i };
  }
  const txt = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '').replace(/[{}&~\s\\]/g, '')
    .replace(/[−–—]/g, '-')).join(' ');
  const mid = txt.match(/midpoint[^(]*\((-?[\d.]+),(-?[\d.]+)\)/i);
  const other = txt.match(/([A-Za-z])\s*=?\s*\((-?[\d.]+),(-?[\d.]+)\)/);
  if (!mid || !other) return null;
  const M = [parseFloat(mid[1]), parseFloat(mid[2])];
  const A = [parseFloat(other[2]), parseFloat(other[3])];
  const B = [2 * M[0] - A[0], 2 * M[1] - A[1]];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const q = this.choicePair(e);
    return q && Math.abs(q[0] - B[0]) < 1e-6 && Math.abs(q[1] - B[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveOtherEndpoint', /coordinates of/i]);
;'__duo ready';

// "Select the horizontal / vertical magnitude of the translation": the shift
// between the pre-image and image, from the plotted points or a stated rule.
window.__duo.translationVector = function () {
  const R = this.inferRule(); if (R) return [R.dx, R.dy];
  const T = this.transformRule();
  if (T && T.map) { const o = T.map([0, 0]); if (o) return [o[0], o[1]]; }
  const rows = this.tableRuleRows();
  if (rows && rows.length) { const r = rows[0];
    return [r.img[0] - r.pre[0], r.img[1] - r.pre[1]]; }
  return null;
};
window.__duo.solveMagnitude = function () {
  const ins = this.curInstruction();
  if (!/magnitude of the translation|horizontal magnitude|vertical magnitude/i.test(ins)) return null;
  const v = this.translationVector(); if (!v) return null;
  const want = /vertical/i.test(ins) ? v[1] : v[0];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  let i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - want) < 1e-6; });
  if (i < 0) i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(Math.abs(q) - Math.abs(want)) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveMagnitude', /magnitude/i]);
;'__duo ready';

// "Create the vector that matches the translation from P to P'": the static
// pair gives the vector; move the draggable arrow's head so tail+v == head.
window.__duo.solveMakeVector = async function () {
  if (!/create the vector/i.test(this.curInstruction())) return false;
  const drag = this.gridPoints(); if (drag.length !== 2) return false;
  const dragSet = new Set(drag.map(p => p.x + ',' + p.y));
  const statics = this.plottedPoints().filter(p => !dragSet.has(p[0] + ',' + p[1]));
  if (statics.length !== 2) return false;
  const v = [statics[1][0] - statics[0][0], statics[1][1] - statics[0][1]];
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  for (const [ti, hi] of [[0, 1], [1, 0]]) {
    const tail = drag[ti], want = [tail.x + v[0], tail.y + v[1]];
    if (want[0] < x0 || want[0] > x1 || want[1] < y0 || want[1] > y1) continue;
    const head = this.gridPoints()[hi];
    if (Math.abs(head.x - want[0]) < 1e-9 && Math.abs(head.y - want[1]) < 1e-9) return true;
    await this.dragPointTo(head, want[0], want[1]);
    const q = this.gridPoints();
    if (q.length === 2 && Math.abs(q[hi].x - want[0]) < 1e-6 && Math.abs(q[hi].y - want[1]) < 1e-6) return true;
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMakeVector()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "4 units right, 4 units down": the vector is stated in words rather than
// shown as a point pair.
window.__duo.statedVector = function () {
  const txt = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  let dx = 0, dy = 0, seen = false;
  for (const m of txt.matchAll(/(\d+(?:\.\d+)?)units?(left|right|up|down)/gi)) {
    const n = parseFloat(m[1]); seen = true;
    if (/left/i.test(m[2])) dx -= n; else if (/right/i.test(m[2])) dx += n;
    else if (/up/i.test(m[2])) dy += n; else dy -= n;
  }
  return seen ? [dx, dy] : null;
};
(function () {
  const base = window.__duo.solveMakeVector;
  window.__duo.solveMakeVector = async function () {
    if (await base.call(this)) return true;
    const v = this.statedVector(); if (!v) return false;
    const drag = this.gridPoints(); if (drag.length !== 2) return false;
    const g = this.diagram().M.grid;
    const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
    for (const [ti, hi] of [[0, 1], [1, 0]]) {
      const tail = drag[ti], want = [tail.x + v[0], tail.y + v[1]];
      if (want[0] < x0 || want[0] > x1 || want[1] < y0 || want[1] > y1) continue;
      const head = this.gridPoints()[hi];
      if (Math.abs(head.x - want[0]) < 1e-9 && Math.abs(head.y - want[1]) < 1e-9) return true;
      await this.dragPointTo(head, want[0], want[1]);
      const q = this.gridPoints();
      if (q.length === 2 && Math.abs(q[hi].x - want[0]) < 1e-6 && Math.abs(q[hi].y - want[1]) < 1e-6) return true;
    }
    return false;
  };
})();
;'__duo ready';

// The page renders the prompt text twice, so "4 units right, 4 units down"
// summed to (8, -8). Count each direction once.
window.__duo.statedVector = function () {
  const txt = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const seen = {};
  for (const m of txt.matchAll(/(\d+(?:\.\d+)?)units?(left|right|up|down)/gi)) {
    const dir = m[2].toLowerCase();
    if (seen[dir] === undefined) seen[dir] = parseFloat(m[1]);
  }
  if (!Object.keys(seen).length) return null;
  const dx = (seen.right || 0) - (seen.left || 0);
  const dy = (seen.up || 0) - (seen.down || 0);
  return [dx, dy];
};
;'__duo ready';

// "Translate the point" with the vector drawn as an arrow: exactly one point is
// the movable one, the other two are the arrow's tail and head.
window.__duo.solveTranslatePoint = async function () {
  if (!/translate the point/i.test(this.curInstruction())) return false;
  const v = this.statedVector(); if (!v) return false;
  const pts = this.gridPoints(); if (pts.length < 1) return false;
  // the arrow's endpoints differ by exactly the vector; the leftover is the point
  let movable = null;
  for (const p of pts) {
    const isArrowEnd = pts.some(q => q !== p &&
      ((Math.abs(q.x - p.x - v[0]) < 1e-9 && Math.abs(q.y - p.y - v[1]) < 1e-9) ||
       (Math.abs(p.x - q.x - v[0]) < 1e-9 && Math.abs(p.y - q.y - v[1]) < 1e-9)));
    if (!isArrowEnd) { movable = p; break; }
  }
  if (!movable) return false;
  const want = [movable.x + v[0], movable.y + v[1]];
  await this.dragPointTo(movable, want[0], want[1]);
  const q = this.gridPoints();
  return q.some(p => Math.abs(p.x - want[0]) < 1e-6 && Math.abs(p.y - want[1]) < 1e-6);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveTranslatePoint()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// curInstruction returns the vector line ("3 units right 2 units down"), not the
// "Translate the point" title, so the gate never matched. Gate on the whole
// prompt instead.


// mathParts strips spaces, so "Translate the point" arrives as
// "Translatethepoint" — match the despaced form.
(function () {
  const base = window.__duo.solveTranslatePoint;
  window.__duo.solveTranslatePoint = async function () {
    const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
    if (!/translatethe(point|figure|segment|shape)/.test(all)) return false;
    const v = this.statedVector(); if (!v) return false;
    const pts = this.gridPoints(); if (!pts.length) return false;
    const isEnd = p => pts.some(q => q !== p &&
      ((Math.abs(q.x - p.x - v[0]) < 1e-9 && Math.abs(q.y - p.y - v[1]) < 1e-9) ||
       (Math.abs(p.x - q.x - v[0]) < 1e-9 && Math.abs(p.y - q.y - v[1]) < 1e-9)));
    const movable = pts.filter(p => !isEnd(p));
    if (!movable.length || movable.length === pts.length) return false;
    for (const p of movable) await this.dragPointTo(p, p.x + v[0], p.y + v[1]);
    return true;
  };
})();
;'__duo ready';
