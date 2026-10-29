
// "Select a pair of corresponding angles": reuse the vertex correspondence —
// choices read like "∠B and ∠B'".
window.__duo.vertexCorrespondence = function () {
  const N = this.namedPoints(); if (!N) return null;
  const plain = Object.keys(N).filter(k => /^[A-Z]$/.test(k));
  const prime = Object.keys(N).filter(k => /^[A-Z]'$/.test(k));
  if (!plain.length || plain.length !== prime.length) return null;
  const cA = [plain.reduce((s, k) => s + N[k][0], 0) / plain.length,
              plain.reduce((s, k) => s + N[k][1], 0) / plain.length];
  const cB = [prime.reduce((s, k) => s + N[k][0], 0) / prime.length,
              prime.reduce((s, k) => s + N[k][1], 0) / prime.length];
  // scale-invariant matching: compare normalised offsets from each centroid
  const norm = (p, c, list) => {
    const r = Math.max(...list.map(k => Math.hypot(N[k][0] - c[0], N[k][1] - c[1]))) || 1;
    return [(p[0] - c[0]) / r, (p[1] - c[1]) / r];
  };
  const map = {};
  for (const k of plain) {
    const a = norm(N[k], cA, plain);
    let best = null, bd = Infinity;
    for (const q of prime) {
      const b = norm(N[q], cB, prime);
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) map[k] = best;
  }
  return map;
};
window.__duo.solveCorrespondingAngles = function () {
  if (!/corresponding (angles|vert)/i.test(this.curInstruction())) return null;
  const map = this.vertexCorrespondence(); if (!map) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/[’]/g, "'").replace(/angle|and|,/gi, '');
    const m = t.match(/([A-Z])([A-Z]')/);
    return m && map[m[1]] === m[2];
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCorrespondingAngles', /corresponding (angles|vert)/i]);
;'__duo ready';

// "Create a figure that is similar": a scaled copy of the static figure. Try a
// few scale factors and offsets until every vertex lands on the grid.
window.__duo.solveMakeSimilar = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  if (!/create/.test(all) || !/similar/.test(all)) return false;
  const drag = this.gridPoints(); if (drag.length < 3) return false;
  const dset = new Set(drag.map(p => p.x + ',' + p.y));
  const stat = this.plottedPoints().filter(p => !dset.has(p[0] + ',' + p[1]));
  if (stat.length !== drag.length) return false;
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  const cx = stat.reduce((s, p) => s + p[0], 0) / stat.length;
  const cy = stat.reduce((s, p) => s + p[1], 0) / stat.length;
  for (const k of [2, 0.5, 3, 1 / 3]) {
    // scale about the figure's own centroid, then shift onto free space
    const base = stat.map(p => [cx + k * (p[0] - cx), cy + k * (p[1] - cy)]);
    if (base.some(t => Math.abs(t[0] - Math.round(t[0])) > 1e-6 || Math.abs(t[1] - Math.round(t[1])) > 1e-6)) continue;
    const offs = [];
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) offs.push([dx, dy]);
    offs.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));
    for (const [dx, dy] of offs) {
      const targets = base.map(t => [t[0] + dx, t[1] + dy]);
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
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveMakeSimilar()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// Scaling about the centroid lands on non-integer coordinates when the centroid
// is not a lattice point. Scale about a VERTEX instead, which always keeps
// integer targets, and try each vertex/scale/offset until one fits the grid.
window.__duo.solveMakeSimilar = async function () {
  const all = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  if (!/create/.test(all) || !/similar/.test(all)) return false;
  const drag = this.gridPoints(); if (drag.length < 3) return false;
  const dset = new Set(drag.map(p => p.x + ',' + p.y));
  const stat = this.plottedPoints().filter(p => !dset.has(p[0] + ',' + p[1]));
  if (stat.length !== drag.length) return false;
  const g = this.diagram().M.grid;
  const [x0, x1] = g.xRange || [-10, 10], [y0, y1] = g.yRange || [-10, 10];
  const offs = [];
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) offs.push([dx, dy]);
  offs.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));
  for (const k of [2, 0.5, 3]) {
    for (const c of stat) {
      const base = stat.map(p => [c[0] + k * (p[0] - c[0]), c[1] + k * (p[1] - c[1])]);
      if (base.some(t => Math.abs(t[0] - Math.round(t[0])) > 1e-6 || Math.abs(t[1] - Math.round(t[1])) > 1e-6)) continue;
      for (const [dx, dy] of offs) {
        const targets = base.map(t => [Math.round(t[0]) + dx, Math.round(t[1]) + dy]);
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
    }
  }
  return false;
};
;'__duo ready';

// "Select the measure of angle A'": similarity and congruence both preserve
// angles, so the image angle equals its corresponding pre-image angle. Use the
// labelled value when there is one, else measure the drawn angle.
window.__duo.angleAtVertex = function (name) {
  const N = this.namedPoints(); if (!N || !N[name]) return null;
  const keys = Object.keys(N).filter(k => /'/.test(name) ? /'/.test(k) : !/'/.test(k));
  if (keys.length < 3) return null;
  const p = N[name];
  const others = keys.filter(k => k !== name).map(k => N[k]);
  if (others.length < 2) return null;
  const u = [others[0][0] - p[0], others[0][1] - p[1]];
  const w = [others[1][0] - p[0], others[1][1] - p[1]];
  const a = Math.acos(Math.max(-1, Math.min(1,
    (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))))) * 180 / Math.PI;
  return isFinite(a) ? a : null;
};
window.__duo.solveAngleMeasure = function () {
  const ins = this.curInstruction().replace(/\s/g, '').replace(/[’]/g, "'");
  const m = ins.match(/measureofangle([a-z])('?)/i);
  if (!m) return null;
  const want = (m[1] + m[2]).toUpperCase();
  // labelled angles on the figure: the corresponding one carries the answer
  const labs = (this.diagramLabels() || []).filter(l => /°/.test(l.t))
    .map(l => parseFloat(l.t.replace(/[^\d.]/g, ''))).filter(isFinite);
  const meas = this.angleAtVertex(want);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (meas !== null) {
    let i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - meas) < 4; });
    if (i >= 0) return { i };
  }
  if (labs.length === 1) {
    const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - labs[0]) < 1e-6; });
    if (i >= 0) return { i };
  }
  return null;
};
window.__duo.RULES.unshift(['solveAngleMeasure', /measure of angle/i]);
;'__duo ready';

// "Select the matching proportion": the choices are equations of fractions —
// keep the one that is numerically true.
window.__duo.solveProportion = function () {
  if (!/proportion/i.test(this.curInstruction())) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const raw = this.choiceLatex(e).split('=');
    if (raw.length !== 2) return;
    const a = this.evalTrigExpr(raw[0]), b = this.evalTrigExpr(raw[1]);
    if (a === null || b === null) return;
    if (Math.abs(a - b) < 1e-9) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveProportion', /proportion/i]);
;'__duo ready';

// evalTrigExpr did not understand \sqrt, so proportions with radicals never
// evaluated. Expand \sqrt{...} (and implicit multiplication like 2\sqrt{5}).


// typed "enter the measure of angle A'"


// Choices are written with \cong ("∠C ≅ ∠C'"). Strip that too, and when the
// figures are not fully labelled fall back to the invariant that a vertex
// always corresponds to its own primed letter.
(function () {
  const clean = function (el) {
    return this.plainMath(this.choiceLatex(el))
      .replace(/[’]/g, "'")
      .replace(/angle|cong|textbf|and|,|~/gi, '');
  };
  const baseA = window.__duo.solveCorrespondingAngles;
  window.__duo.solveCorrespondingAngles = function () {
    if (!/corresponding (angles|vert)/i.test(this.curInstruction())) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const map = this.vertexCorrespondence();
    let i = -1;
    if (map) {
      i = ch.findIndex(e => { const m = clean.call(this, e).match(/([A-Z])([A-Z]')/); return m && map[m[1]] === m[2]; });
      if (i >= 0) return { i };
    }
    i = ch.findIndex(e => { const m = clean.call(this, e).match(/([A-Z])([A-Z])'/); return m && m[1] === m[2]; });
    return i < 0 ? baseA.call(this) : { i };
  };
  const baseS = window.__duo.solveCorrespondingSides;
  window.__duo.solveCorrespondingSides = function () {
    const r = baseS.call(this); if (r) return r;
    if (!/corresponding sides/i.test(this.curInstruction())) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => {
      const t = clean.call(this, e);
      const m = t.match(/([A-Z])([A-Z])([A-Z])'([A-Z])'/);
      return m && m[1] === m[3] && m[2] === m[4];
    });
    return i < 0 ? null : { i };
  };
})();
;'__duo ready';

// "DE:AC = AE:AB" style ratio statements: all four segments are between labelled
// points, so just check which equality actually holds.
window.__duo.solveRatioStatement = function () {
  const N = this.namedPoints(); if (!N) return null;
  const len = (a, b) => (N[a] && N[b]) ? Math.hypot(N[b][0] - N[a][0], N[b][1] - N[a][1]) : null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/[’]/g, "'");
    const m = t.match(/^([A-Z])([A-Z]):([A-Z])([A-Z])=([A-Z])([A-Z]):([A-Z])([A-Z])$/);
    if (!m) return;
    const a = len(m[1], m[2]), b = len(m[3], m[4]), c = len(m[5], m[6]), d = len(m[7], m[8]);
    if ([a, b, c, d].some(v => v === null || v < 1e-9)) return;
    if (Math.abs(a / b - c / d) < 0.02) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveRatioStatement', /select the match|proportion|ratio/i]);
;'__duo ready';

// "Enter the length of segment DE": measure between the two labelled points, or
// solve the similar-triangle proportion when DE is not directly measurable.


// Unit 190: probability. The spinner's sections are the numbers drawn in the
// diagram iframe ("1 4 2 3"), so counts and probabilities come straight from
// that list.
window.__duo.spinnerSections = function () {
  const d = this.diagram(); if (!d) return null;
  let txt; try { txt = d.f.contentDocument.body.innerText; } catch (e) { return null; }
  const toks = txt.replace(/[−–—]/g, '-').match(/-?\d+(?:\.\d+)?|[A-Za-z]+/g);
  return toks && toks.length ? toks.map(t => t.trim()) : null;
};


// "how many sections have an 8." — handle "a"/"an" and the trailing period


// "...probability of spinning an 8 as a fraction" — trailing phrases like
// "as a fraction" were swallowed into the target. Take the last standalone
// number/word instead.
window.__duo.spinnerTarget = function () {
  let ins = this.curInstruction().replace(/[.?]+$/, '')
    .replace(/\bas an? (fraction|decimal|percent\w*)\b/gi, '')
    .replace(/\bin (simplest|lowest) (form|terms)\b/gi, '');
  const S = this.spinnerSections() || [];
  const toks = ins.match(/[A-Za-z0-9.-]+/g) || [];
  for (let i = toks.length - 1; i >= 0; i--) {
    const t = toks[i].replace(/[^A-Za-z0-9.-]/g, '');
    if (S.some(s => s.toLowerCase() === t.toLowerCase())) return t;
  }
  return null;
};


// "Select the match" where the prompt states a probability in words and the
// choices write it as P(event) = fraction: match the VALUE and the orientation.
window.__duo.solveProbabilityNotation = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  let want = null;
  for (const t of this.mathParts().slice().reverse()) {
    const m = t.replace(/\s/g, '').match(/frac(\d+)(\d+)$/);
    if (m) { want = [parseFloat(m[1]), parseFloat(m[2])]; break; }
  }
  if (!want) return null;
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e));
    const m = t.match(/frac(\d+)(\d+)$/);
    return m && parseFloat(m[1]) === want[0] && parseFloat(m[2]) === want[1];
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveProbabilityNotation', /probability|select the match/i]);
;'__duo ready';

// "Create the probability p = a/b": a pie spinner with b sectors; shade a of
// them. Sectors respond to a real click, so report the click points and let the
// caller perform them (same handback as the dot plots).
window.__duo.spinnerClickPoints = function () {
  const parts = this.mathParts();
  let a = null, b = null;
  for (const t of parts.slice().reverse()) {
    const m = t.replace(/\s/g, '').match(/frac(\d+)(\d+)$/);
    if (m) { a = parseFloat(m[1]); b = parseFloat(m[2]); break; }
  }
  if (a === null || !b) return null;
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const circle = [...doc.querySelectorAll('circle,path,ellipse')]
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 100 && Math.abs(r.width - r.height) < 20)
    .sort((x, y) => y.width - x.width)[0];
  if (!circle) return null;
  const fr = d.f.getBoundingClientRect();
  const cx = fr.left + circle.left + circle.width / 2;
  const cy = fr.top + circle.top + circle.height / 2;
  const R = circle.width * 0.32;
  const pts = [];
  for (let k = 0; k < a; k++) {
    // centre of the k-th sector, measuring from 12 o'clock clockwise
    const ang = (-90 + (360 / b) * (k + 0.5)) * Math.PI / 180;
    pts.push(this.toShot([Math.round(cx + R * Math.cos(ang)), Math.round(cy + R * Math.sin(ang))]));
  }
  return { need: a, of: b, points: pts };
};
;'__duo ready';

// "Enter P(3)" — probability notation for the spinner/die outcome.


// "frac1112" is ambiguous once braces are stripped — read \frac{a}{b} from the
// RAW LaTeX so multi-digit numerators/denominators parse correctly.
window.__duo.promptFraction = function () {
  for (const l of this.promptLatex().slice().reverse()) {
    const m = this.ascii(l).match(/\\frac\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}/);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
};
window.__duo.spinnerClickPoints = function () {
  const f = this.promptFraction(); if (!f) return null;
  const [a, b] = f;
  if (!b || a < 0 || a > b || b > 24) return null;
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const circle = [...doc.querySelectorAll('circle,path,ellipse')]
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 100 && Math.abs(r.width - r.height) < 20)
    .sort((x, y) => y.width - x.width)[0];
  if (!circle) return null;
  const fr = d.f.getBoundingClientRect();
  const cx = fr.left + circle.left + circle.width / 2;
  const cy = fr.top + circle.top + circle.height / 2;
  const R = circle.width * 0.32;
  const pts = [];
  for (let k = 0; k < a; k++) {
    const ang = (-90 + (360 / b) * (k + 0.5)) * Math.PI / 180;
    pts.push(this.toShot([Math.round(cx + R * Math.cos(ang)), Math.round(cy + R * Math.sin(ang))]));
  }
  return { need: a, of: b, points: pts };
};
;'__duo ready';
