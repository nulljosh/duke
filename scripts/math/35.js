
// "adjacent to the 67° angle" means the LEG touching that vertex, so the
// hypotenuse (the longest side) has to be excluded before taking the nearest.
(function () {
  const base = window.__duo.solveTriangleSide;
  window.__duo.solveTriangleSide = function () {
    const ins = this.curInstruction();
    if (!/adjacent to/i.test(ins)) return base.call(this);
    const L = this.diagramLabels(); if (!L) return null;
    const nums = L.filter(l => /^-?\d+(\.\d+)?$/.test(l.t));
    if (nums.length < 3) return null;
    const m = ins.replace(/\s/g, '').match(/adjacentto(?:the)?(-?\d+(?:\.\d+)?)/);
    if (!m) return null;
    const vertex = L.find(l => l.t.replace(/\s/g, '').startsWith(m[1] + '°'));
    if (!vertex) return null;
    const hyp = nums.reduce((a, b) => parseFloat(b.t) > parseFloat(a.t) ? b : a);
    const legs = nums.filter(n => n !== hyp);
    let best = null, bd = Infinity;
    for (const s of legs) {
      const dd = Math.hypot(s.x - vertex.x, s.y - vertex.y);
      if (dd < bd) { bd = dd; best = s; }
    }
    if (!best) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = ch.findIndex(e => this.plainMath(this.choiceLatex(e)).replace(/\s/g, '') === best.t.replace(/\s/g, ''));
    return i < 0 ? null : { i };
  };
})();
;'__duo ready';

// No right-angle marker class exists on these triangles. Read the actual
// polygon: its longest edge is the hypotenuse, and each side label sits at an
// edge midpoint, so the label nearest that edge names it.
window.__duo.trianglePolygon = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const el = [...doc.querySelectorAll('polygon,polyline')]
    .find(e => /(^|\s)shape(\s|$)|polygon/i.test(e.getAttribute('class') || ''));
  if (!el) return null;
  const raw = el.getAttribute('points'); if (!raw) return null;
  const ns = raw.trim().split(/[\s,]+/).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < ns.length; i += 2) pts.push([ns[i], ns[i + 1]]);
  if (pts.length < 3) return null;
  const ctm = el.getScreenCTM(); if (!ctm) return null;
  const svg = el.ownerSVGElement;
  const scr = p => { const q = svg.createSVGPoint(); q.x = p[0]; q.y = p[1];
    const t = q.matrixTransform(ctm); return [t.x, t.y]; };
  return pts.slice(0, 3).map(scr);
};
window.__duo.solveHypotenuse = function () {
  if (!/hypotenuse/i.test(this.curInstruction())) return null;
  const V = this.trianglePolygon(); if (!V) return null;
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((a, b) => b.len > a.len ? b : a);
  const L = (this.diagramLabels() || []).filter(l => /^[a-z]$/i.test(l.t) || /^-?\d+(\.\d+)?$/.test(l.t));
  if (!L.length) return null;
  let best = null, bd = Infinity;
  for (const l of L) { const dd = Math.hypot(l.x - hyp.mid[0], l.y - hyp.mid[1]); if (dd < bd) { bd = dd; best = l; } }
  if (!best) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => this.plainMath(this.choiceLatex(e)).replace(/\s/g, '') === best.t.replace(/\s/g, ''));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveHypotenuse', /hypotenuse/i]);
;'__duo ready';

// The triangle is a <path> with rounded corners (M/Q), not a <polygon>, so read
// its geometry by sampling: farthest point from the centroid is one vertex, the
// farthest from that is the second, and the point farthest from that line is
// the third.
window.__duo.trianglePolygon = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const el = [...doc.querySelectorAll('path,polygon,polyline')]
    .find(e => /polygon|(^|\s)shape(\s|$)/i.test(e.getAttribute('class') || ''));
  if (!el || typeof el.getTotalLength !== 'function') return null;
  let L = 0; try { L = el.getTotalLength(); } catch (e) { return null; }
  if (!L) return null;
  const ctm = el.getScreenCTM(); if (!ctm) return null;
  const svg = el.ownerSVGElement;
  const P = [];
  for (let i = 0; i < 300; i++) {
    const q = el.getPointAtLength((i / 300) * L);
    const p = svg.createSVGPoint(); p.x = q.x; p.y = q.y;
    const t = p.matrixTransform(ctm);
    P.push([t.x, t.y]);
  }
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const far = (from, list) => list.reduce((a, p) =>
    Math.hypot(p[0] - from[0], p[1] - from[1]) > Math.hypot(a[0] - from[0], a[1] - from[1]) ? p : a);
  const A = far([cx, cy], P);
  const B = far(A, P);
  const distLine = p => Math.abs((B[0] - A[0]) * (A[1] - p[1]) - (A[0] - p[0]) * (B[1] - A[1])) /
                        Math.hypot(B[0] - A[0], B[1] - A[1]);
  const C = P.reduce((a, p) => distLine(p) > distLine(a) ? p : a);
  return [A, B, C];
};
;'__duo ready';

// "Identify the side opposite the labeled angle" — no degree value in the
// wording, and label-distance alone is fragile. Use the triangle's real
// geometry: find the vertex nearest the angle marker, then the edge that does
// not touch it.
window.__duo.angleLabel = function () {
  const L = this.diagramLabels() || [];
  const angles = L.filter(l => /°/.test(l.t));
  const m = this.curInstruction().replace(/\s/g, '').match(/(?:opposite|adjacentto)(?:the)?(-?\d+(?:\.\d+)?)/);
  if (m) { const hit = angles.find(a => a.t.replace(/\s/g, '').startsWith(m[1] + '°')); if (hit) return hit; }
  return angles.length === 1 ? angles[0] : null;
};
window.__duo.solveOppositeSide = function () {
  const ins = this.curInstruction();
  if (!/opposite|adjacent/i.test(ins)) return null;
  const V = this.trianglePolygon(); if (!V) return null;
  const A = this.angleLabel(); if (!A) return null;
  // the vertex the angle marker sits at
  let vi = 0, bd = Infinity;
  V.forEach((v, i) => { const d = Math.hypot(v[0] - A.x, v[1] - A.y); if (d < bd) { bd = d; vi = i; } });
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((x, y) => y.len > x.len ? y : x);
  const want = /adjacent/i.test(ins)
    ? edges.find(e => (e.a === vi || e.b === vi) && e !== hyp)
    : edges.find(e => e.a !== vi && e.b !== vi);
  if (!want) return null;
  const labs = (this.diagramLabels() || []).filter(l => !/°/.test(l.t) && (/^[a-z]$/i.test(l.t) || /^-?\d+(\.\d+)?$/.test(l.t)));
  let best = null, bb = Infinity;
  for (const l of labs) { const d = Math.hypot(l.x - want.mid[0], l.y - want.mid[1]); if (d < bb) { bb = d; best = l; } }
  if (!best) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => this.plainMath(this.choiceLatex(e)).replace(/\s/g, '') === best.t.replace(/\s/g, ''));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveOppositeSide', /opposite|adjacent/i]);
;'__duo ready';

// "Enter the sine ratio as a fraction": build it from the triangle's geometry —
// sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent,
// each side read from the label nearest that edge's midpoint.
window.__duo.triangleSides = function () {
  const V = this.trianglePolygon(); if (!V) return null;
  const A = this.angleLabel(); if (!A) return null;
  let vi = 0, bd = Infinity;
  V.forEach((v, i) => { const d = Math.hypot(v[0] - A.x, v[1] - A.y); if (d < bd) { bd = d; vi = i; } });
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((x, y) => y.len > x.len ? y : x);
  const opp = edges.find(e => e.a !== vi && e.b !== vi);
  const adj = edges.find(e => e !== hyp && e !== opp);
  if (!hyp || !opp || !adj) return null;
  const labs = (this.diagramLabels() || []).filter(l => /^-?\d+(\.\d+)?$/.test(l.t));
  const nameOf = e => { let best = null, bb = Infinity;
    for (const l of labs) { const d = Math.hypot(l.x - e.mid[0], l.y - e.mid[1]); if (d < bb) { bb = d; best = l; } }
    return best ? parseFloat(best.t) : null; };
  const o = nameOf(opp), a = nameOf(adj), h = nameOf(hyp);
  return (o === null || a === null || h === null) ? null : { opp: o, adj: a, hyp: h };
};
(function () {
  const RE = /(sine|cosine|tangent|sin|cos|tan)\s*ratio/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins)) {
      const S = this.triangleSides();
      if (S) {
        const pair = /sine|sin/i.test(ins) && !/cos/i.test(ins) ? [S.opp, S.hyp]
                   : /cosine|cos/i.test(ins) ? [S.adj, S.hyp]
                   : /tangent|tan/i.test(ins) ? [S.opp, S.adj] : null;
        if (pair) return pair[0] + '/' + pair[1];
      }
    }
    return bo.call(this);
  };
  const bt = window.__duo.typeAnswer;
  window.__duo.typeAnswer = function () {
    if (document.querySelector('[data-test="challenge-text-input"]') && RE.test(this.curInstruction())) {
      const v = this.solveOutputAt();
      if (typeof v === 'string' && v.includes('/')) { this.type(v); return v; }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// The diagram iframe can still show the PREVIOUS question's triangle when the
// choices have already updated, which produced confidently wrong answers.
// Only trust the geometry when every numeric choice appears as a diagram label.
window.__duo.diagramFresh = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return true;
  const labs = (this.diagramLabels() || []).map(l => l.t.replace(/°/g, '').trim());
  const vals = ch.map(e => this.plainMath(this.choiceLatex(e)).trim()).filter(v => /^-?\d+(\.\d+)?$/.test(v));
  if (!vals.length) return true;
  return vals.every(v => labs.includes(v));
};
(function () {
  for (const name of ['solveHypotenuse', 'solveOppositeSide', 'solveTriangleSide']) {
    const base = window.__duo[name];
    if (!base) continue;
    window.__duo[name] = function () { return this.diagramFresh() ? base.call(this) : null; };
  }
})();
;'__duo ready';

// Duolingo leaves earlier questions' diagram iframes in the DOM, and diagram()
// grabbed the FIRST one — so the solver read a previous triangle while the
// current choices belonged to a new one. Prefer the visible iframe.
window.__duo.visibleFrame = function () {
  const fs = [...document.querySelectorAll('iframe')].filter(f => {
    const r = f.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) return false;
    if (r.bottom < 0 || r.top > (window.innerHeight || 0)) return false;
    const st = getComputedStyle(f);
    return st.visibility !== 'hidden' && st.display !== 'none' && parseFloat(st.opacity || '1') > 0.05;
  });
  return fs.length ? fs[fs.length - 1] : null;
};
(function () {
  const base = window.__duo.diagram;
  window.__duo.diagram = function () {
    const f = this.visibleFrame();
    if (f) {
      try {
        const w = f.contentWindow;
        if (w && w.mathDiagram) return { f, M: w.mathDiagram };
      } catch (e) {}
    }
    return base.call(this);
  };
  const bl = window.__duo.diagramLabels;
  window.__duo.diagramLabels = function () {
    const f = this.visibleFrame(); if (!f) return bl.call(this);
    try {
      return [...f.contentDocument.querySelectorAll('div,span,text,tspan')]
        .filter(e => e.children.length === 0 && e.textContent.trim())
        .map(e => { const r = e.getBoundingClientRect();
          return { t: e.textContent.trim().normalize('NFKC'), x: r.left + r.width / 2, y: r.top + r.height / 2 }; })
        .filter(l => l.x || l.y);
    } catch (e) { return bl.call(this); }
  };
})();
;'__duo ready';

// trig ratios offered as fraction CHOICES, plus "enter the length of the side
// opposite/adjacent" typed answers
(function () {
  const RE = /(sine|cosine|tangent|sin|cos|tan)\s*ratio/i;
  const ratioOf = function () {
    const ins = this.curInstruction();
    const S = this.triangleSides(); if (!S) return null;
    if (/cosine|(^|[^a-z])cos/i.test(ins)) return [S.adj, S.hyp];
    if (/tangent|(^|[^a-z])tan/i.test(ins)) return [S.opp, S.adj];
    if (/sine|(^|[^a-z])sin/i.test(ins)) return [S.opp, S.hyp];
    return null;
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction()) && this.diagramFresh()) {
      const p = ratioOf.call(this);
      if (p) {
        const want = p[0] / p[1];
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - want) < 1e-9; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);

  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (/length of the side (opposite|adjacent)/i.test(ins) && this.diagramFresh()) {
      const S = this.triangleSides();
      if (S) return /adjacent/i.test(ins) ? S.adj : S.opp;
    }
    if (/length of the hypotenuse/i.test(ins) && this.diagramFresh()) {
      const S = this.triangleSides(); if (S) return S.hyp;
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// "Solve for x" in a right triangle: the prompt shows a trig equation such as
// sin(30°) = x/2 or tan(40°) = 7/x. Solve it numerically and round the way the
// prompt asks (default: nearest tenth if not a whole number).
window.__duo.solveTrigEquation = function () {
  const parts = this.mathParts().concat([this.curInstruction().replace(/\s/g, '')]);
  const D = Math.PI / 180;
  for (const t of parts) {
    const m = t.match(/(sin|cos|tan)\(?(-?\d+(?:\.\d+)?)(?:°|degrees?)?\)?=(.+)$/i);
    if (!m) continue;
    const fn = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[m[1].toLowerCase()];
    const lhs = fn(parseFloat(m[2]) * D);
    const rhs = m[3].replace(/[°]/g, '');
    let x = null;
    let q = rhs.match(/^x\/(-?\d+(?:\.\d+)?)$/);            // x / a  = lhs
    if (q) x = lhs * parseFloat(q[1]);
    if (x === null && (q = rhs.match(/^(-?\d+(?:\.\d+)?)\/x$/))) x = parseFloat(q[1]) / lhs;
    if (x === null && (q = rhs.match(/^frac{?x}?{?(-?\d+(?:\.\d+)?)}?$/))) x = lhs * parseFloat(q[1]);
    if (x === null && (q = rhs.match(/^fracx(-?\d+(?:\.\d+)?)$/))) x = lhs * parseFloat(q[1]);
    if (x === null && (q = rhs.match(/^frac(-?\d+(?:\.\d+)?)x$/))) x = parseFloat(q[1]) / lhs;
    if (x === null || !isFinite(x)) continue;
    const whole = Math.abs(x - Math.round(x)) < 1e-6;
    const dp = /nearest hundredth/i.test(this.curInstruction()) ? 2
             : /nearest whole|nearest integer/i.test(this.curInstruction()) ? 0 : 1;
    return whole ? Math.round(x) : Number(x.toFixed(dp));
  }
  return null;
};


// Same geometry, but keep the label TEXT so an unknown side ("x") is usable.
window.__duo.triangleLabels = function () {
  const V = this.trianglePolygon(); if (!V) return null;
  const A = this.angleLabel(); if (!A) return null;
  let vi = 0, bd = Infinity;
  V.forEach((v, i) => { const d = Math.hypot(v[0] - A.x, v[1] - A.y); if (d < bd) { bd = d; vi = i; } });
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, len: Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1]),
    mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]
  }));
  const hyp = edges.reduce((x, y) => y.len > x.len ? y : x);
  const opp = edges.find(e => e.a !== vi && e.b !== vi);
  const adj = edges.find(e => e !== hyp && e !== opp);
  const labs = (this.diagramLabels() || []).filter(l => !/°/.test(l.t));
  const nameOf = e => { let best = null, bb = Infinity;
    for (const l of labs) { const d = Math.hypot(l.x - e.mid[0], l.y - e.mid[1]); if (d < bb) { bb = d; best = l; } }
    return best ? best.t.trim() : null; };
  if (!hyp || !opp || !adj) return null;
  return { opp: nameOf(opp), adj: nameOf(adj), hyp: nameOf(hyp), angle: A.t.replace(/[^\d.]/g, '') };
};
// "Set up the equation using the sine ratio": pick the choice whose right-hand
// side is exactly opposite/hypotenuse (or the cos/tan equivalent).
window.__duo.solveSetupEquation = function () {
  const ins = this.curInstruction();
  if (!/set up the equation/i.test(ins)) return null;
  const T = this.triangleLabels(); if (!T) return null;
  const want = /cosine|cos/i.test(ins) ? [T.adj, T.hyp]
             : /tangent|tan/i.test(ins) ? [T.opp, T.adj]
             : [T.opp, T.hyp];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/\s|°|degree[s]?/gi, '');
    const m = t.match(/=(.+)$/); if (!m) return false;
    const r = m[1];
    return r === want[0] + '/' + want[1] || r === 'frac' + want[0] + want[1];
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveSetupEquation', /set up the equation/i]);
;'__duo ready';
