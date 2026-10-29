
// "Enter the value of sin(θ)" / "select the match" for a ratio: read the
// triangle's numeric sides and give the exact fraction (Duolingo wants 15/17,
// not 0.882).
window.__duo.thetaRatio = function (fn) {
  const T = this.triangleLabelsAt(null); if (!T) return null;
  const n = s => (s !== null && /^-?\d+(\.\d+)?$/.test(String(s))) ? parseFloat(s) : null;
  const o = n(T.opp), a = n(T.adj), h = n(T.hyp);
  const pair = fn === 'sin' ? [o, h] : fn === 'cos' ? [a, h] : [o, a];
  return (pair[0] === null || pair[1] === null) ? null : pair;
};
(function () {
  const RE = /value of (sin|cos|tan)|(sin|cos|tan)\s*\(?\s*(theta|θ)/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins) && this.diagramFresh()) {
      const fn = /cos/i.test(ins) ? 'cos' : /tan/i.test(ins) ? 'tan' : 'sin';
      const p = this.thetaRatio(fn);
      if (p) {
        const g = (x, y) => y ? g(y, x % y) : Math.abs(x);
        const k = g(p[0], p[1]);
        return (p[1] / k === 1) ? String(p[0] / k) : (p[0] / k) + '/' + (p[1] / k);
      }
    }
    return bo.call(this);
  };
  const bt = window.__duo.typeAnswer;
  window.__duo.typeAnswer = function () {
    if (document.querySelector('[data-test="challenge-text-input"]') && RE.test(this.curInstruction())) {
      const v = this.solveOutputAt();
      if (typeof v === 'string' && /\d/.test(v)) { this.type(v); return v; }
    }
    return bt.call(this);
  };
  const bm = window.__duo.solveTrigMatch;
  window.__duo.solveTrigMatch = function () {
    const r = bm.call(this); if (r) return r;
    // choices are the bare names sin(θ)/cos(θ)/tan(θ) — match the shown fraction
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const names = ch.map(e => (this.plainMath(this.choiceLatex(e)).match(/^(sin|cos|tan)/i) || [])[1]);
    if (names.filter(Boolean).length !== ch.length) return null;
    let want = null;
    for (const t of this.mathParts().slice().reverse()) {
      const m = t.replace(/\s/g, '').match(/^(?:frac)?(\d+)\/?(\d+)$/);
      if (m) { want = [parseFloat(m[1]), parseFloat(m[2])]; break; }
    }
    if (!want) return null;
    for (const fn of ['sin', 'cos', 'tan']) {
      const p = this.thetaRatio(fn);
      if (p && p[0] === want[0] && p[1] === want[1]) {
        const i = names.findIndex(nm => nm && nm.toLowerCase() === fn);
        if (i >= 0) return { i };
      }
    }
    return null;
  };
})();
;'__duo ready';

// Unit 178: inverse trig. "Calculate the angle to the nearest whole number"
// with a shown equation like sin^{-1}(15/17) or tan(θ)=3/4.
window.__duo.solveInverseTrig = function () {
  const D = 180 / Math.PI;
  const INV = { sin: Math.asin, cos: Math.acos, tan: Math.atan };
  for (const t of this.mathParts().concat([this.curInstruction().replace(/\s/g, '')])) {
    const s = t.replace(/\s|°|degrees?/gi, '');
    let m = s.match(/(sin|cos|tan)\^?\{?-1\}?\(([^()]+)\)/i)          // sin^{-1}(15/17)
         || s.match(/arc(sin|cos|tan)\(([^()]+)\)/i);
    if (m) {
      const v = this.evalTrigExpr(m[2]) ?? this.evalTrigExpr('(' + m[2] + ')');
      if (v !== null) { const a = INV[m[1].toLowerCase()](v) * D; if (isFinite(a)) return a; }
    }
    m = s.match(/(sin|cos|tan)\(?(?:theta|θ|x)\)?=(.+)$/i);            // tan(θ) = 3/4
    if (m) {
      const v = this.evalTrigExpr(m[2]);
      if (v !== null) { const a = INV[m[1].toLowerCase()](v) * D; if (isFinite(a)) return a; }
    }
  }
  // no equation printed: derive the ratio from the triangle
  const ins = this.curInstruction();
  const fn = /cos/i.test(ins) ? 'cos' : /tan/i.test(ins) ? 'tan' : /sin/i.test(ins) ? 'sin' : null;
  if (fn && this.diagramFresh()) {
    const p = this.thetaRatio(fn);
    if (p) { const a = INV[fn](p[0] / p[1]) * D; if (isFinite(a)) return a; }
  }
  return null;
};
(function () {
  const RE = /calculate the angle|find the angle|measure of (the )?angle|angle to the nearest|inverse/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins)) {
      const a = this.solveInverseTrig();
      if (a !== null) {
        const dp = /hundredth/i.test(ins) ? 2 : /tenth/i.test(ins) ? 1 : 0;
        return Number(a.toFixed(dp));
      }
    }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const a = this.solveInverseTrig();
      if (a !== null) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        let bi = -1, bd = Infinity;
        ch.forEach((e, i) => { const q = this.choiceValue(e); if (q === null) return;
          const d = Math.abs(q - a); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0 && bd < 1.5) return { i: bi };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Law of Sines: each side pairs with the angle OPPOSITE it. Work out that
// pairing from the triangle's geometry, then keep the choice that respects it.
window.__duo.sideAnglePairs = function () {
  const V = this.trianglePolygon(); if (!V) return null;
  const labs = this.diagramLabels() || [];
  const angles = labs.filter(l => /°/.test(l.t));
  const sides = labs.filter(l => !/°/.test(l.t) && (/^-?\d+(\.\d+)?$/.test(l.t) || /^[a-z]$/i.test(l.t)));
  if (angles.length < 2 || sides.length < 2) return null;
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2] }));
  const nearest = (pt, list, key) => list.reduce((best, c) =>
    Math.hypot(c[key][0] - pt.x, c[key][1] - pt.y) < Math.hypot(best[key][0] - pt.x, best[key][1] - pt.y) ? c : best);
  const vtxOf = a => { let bi = 0, bd = Infinity;
    V.forEach((v, i) => { const d = Math.hypot(v[0] - a.x, v[1] - a.y); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const out = [];
  for (const s of sides) {
    const e = nearest(s, edges, 'mid');
    const opp = angles.find(a => { const vi = vtxOf(a); return vi !== e.a && vi !== e.b; });
    if (opp) out.push({ side: s.t.trim(), angle: opp.t.replace(/[^\d.]/g, '') });
  }
  return out.length >= 2 ? out : null;
};
window.__duo.solveLawOfSines = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const P = this.sideAnglePairs(); if (!P) return null;
  const ok = (side, ang) => P.some(p => p.side === side && Math.abs(parseFloat(p.angle) - parseFloat(ang)) < 0.5);
  const hits = [];
  ch.forEach((e, i) => {
    const t = this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°/gi, '');
    const m = t.match(/^frac([a-z0-9.]+)sin\((\d+(?:\.\d+)?)\)=frac([a-z0-9.]+)sin\((\d+(?:\.\d+)?)\)$/i);
    if (!m) return;
    if (ok(m[1], m[2]) && ok(m[3], m[4])) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solveLawOfSines', /select the match|law of sines|which equation/i]);
;'__duo ready';

// Law of Sines also appears inverted: sin(A)/a = sin(B)/b, and the unknown may
// be the ANGLE (sin(x)) rather than a side.


// A bare letter can label either a side or an unknown ANGLE. Decide by
// position: near a vertex means angle, near an edge midpoint means side.
window.__duo.sideAnglePairs = function () {
  const V = this.trianglePolygon(); if (!V) return null;
  const labs = this.diagramLabels() || [];
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
    a, b, mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2] }));
  const dV = l => Math.min(...V.map(v => Math.hypot(v[0] - l.x, v[1] - l.y)));
  const dE = l => Math.min(...edges.map(e => Math.hypot(e.mid[0] - l.x, e.mid[1] - l.y)));
  const angles = [], sides = [];
  for (const l of labs) {
    const t = l.t.trim();
    if (/°/.test(t)) { angles.push(l); continue; }
    if (!/^-?\d+(\.\d+)?$/.test(t) && !/^[a-z]$/i.test(t)) continue;
    (dV(l) <= dE(l) ? angles : sides).push(l);
  }
  if (angles.length < 2 || sides.length < 2) return null;
  const vtxOf = a => { let bi = 0, bd = Infinity;
    V.forEach((v, i) => { const d = Math.hypot(v[0] - a.x, v[1] - a.y); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const edgeOf = s => edges.reduce((best, e) =>
    Math.hypot(e.mid[0] - s.x, e.mid[1] - s.y) < Math.hypot(best.mid[0] - s.x, best.mid[1] - s.y) ? e : best);
  const out = [];
  for (const s of sides) {
    const e = edgeOf(s);
    const opp = angles.find(a => { const vi = vtxOf(a); return vi !== e.a && vi !== e.b; });
    if (opp) out.push({ side: s.t.trim(), angle: opp.t.replace(/°/g, '').trim() });
  }
  return out.length >= 2 ? out : null;
};
(function () {
  const base = window.__duo.solveLawOfSines;
  window.__duo.solveLawOfSines = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (ch.length < 2) return null;
    const P = this.sideAnglePairs(); if (!P) return base.call(this);
    const norm = s => String(s).trim();
    const ok = (ang, side) => P.some(p => norm(p.side) === norm(side) && norm(p.angle) === norm(ang));
    const hits = [];
    ch.forEach((e, i) => {
      const t = this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°/gi, '');
      let m = t.match(/^fracsin\(([a-z0-9.]+)\)([a-z0-9.]+)=fracsin\(([a-z0-9.]+)\)([a-z0-9.]+)$/i);
      if (m) { if (ok(m[1], m[2]) && ok(m[3], m[4])) hits.push(i); return; }
      m = t.match(/^frac([a-z0-9.]+)sin\(([a-z0-9.]+)\)=frac([a-z0-9.]+)sin\(([a-z0-9.]+)\)$/i);
      if (m && ok(m[2], m[1]) && ok(m[4], m[3])) hits.push(i);
    });
    return hits.length === 1 ? { i: hits[0] } : base.call(this);
  };
})();
;'__duo ready';

// Vertex-vs-edge distance is too close to call for a corner label. The choices
// themselves say which symbols are angles: anything inside sin(...) is an angle.
(function () {
  const base = window.__duo.sideAnglePairs;
  window.__duo.sideAnglePairs = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const texts = ch.map(e => this.plainMath(this.choiceLatex(e)).replace(/degree[s]?|°/gi, ''));
    const inSin = new Set();
    for (const t of texts) for (const m of t.matchAll(/sin\(([a-z0-9.]+)\)/gi)) inSin.add(m[1]);
    if (!inSin.size) return base.call(this);
    const V = this.trianglePolygon(); if (!V) return base.call(this);
    const labs = this.diagramLabels() || [];
    const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({
      a, b, mid: [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2] }));
    const angles = [], sides = [];
    for (const l of labs) {
      const raw = l.t.trim(), key = raw.replace(/°/g, '');
      if (!/^-?\d+(\.\d+)?$/.test(key) && !/^[a-z]$/i.test(key)) continue;
      (/°/.test(raw) || inSin.has(key) ? angles : sides).push(l);
    }
    if (angles.length < 2 || sides.length < 2) return base.call(this);
    const vtxOf = a => { let bi = 0, bd = Infinity;
      V.forEach((v, i) => { const d = Math.hypot(v[0] - a.x, v[1] - a.y); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const edgeOf = s => edges.reduce((best, e) =>
      Math.hypot(e.mid[0] - s.x, e.mid[1] - s.y) < Math.hypot(best.mid[0] - s.x, best.mid[1] - s.y) ? e : best);
    const out = [];
    for (const s of sides) {
      const e = edgeOf(s);
      const opp = angles.find(a => { const vi = vtxOf(a); return vi !== e.a && vi !== e.b; });
      if (opp) out.push({ side: s.t.trim(), angle: opp.t.replace(/°/g, '').trim() });
    }
    return out.length >= 2 ? out : base.call(this);
  };
})();
;'__duo ready';

// Solve the Law of Sines for whichever quantity is unknown:
//   unknown side  x = a * sin(X) / sin(A)
//   unknown angle X = asin( x * sin(A) / a )
window.__duo.solveLawOfSinesValue = function () {
  const P = this.sideAnglePairs(); if (!P || P.length < 2) return null;
  const D = Math.PI / 180;
  const isNum = s => /^-?\d+(\.\d+)?$/.test(String(s));
  const known = P.find(p => isNum(p.side) && isNum(p.angle));
  if (!known) return null;
  const k = parseFloat(known.side) / Math.sin(parseFloat(known.angle) * D);
  for (const p of P) {
    if (p === known) continue;
    if (!isNum(p.side) && isNum(p.angle)) {              // unknown side
      const v = k * Math.sin(parseFloat(p.angle) * D);
      if (isFinite(v)) return { kind: 'side', v };
    }
    if (isNum(p.side) && !isNum(p.angle)) {              // unknown angle
      const s = parseFloat(p.side) / k;
      if (Math.abs(s) <= 1) { const v = Math.asin(s) * 180 / Math.PI; if (isFinite(v)) return { kind: 'angle', v }; }
    }
  }
  return null;
};
(function () {
  const RE = /value of x|measure of x|find x|solve for x/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins) && this.diagramFresh()) {
      const r = this.solveLawOfSinesValue();
      if (r) { const dp = /hundredth/i.test(ins) ? 2 : /tenth/i.test(ins) ? 1 : 0;
        return Number(r.v.toFixed(dp)); }
    }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction()) && this.diagramFresh()) {
      const r = this.solveLawOfSinesValue();
      if (r) {
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        let bi = -1, bd = Infinity;
        ch.forEach((e, i) => { const q = this.choiceValue(e); if (q === null) return;
          const d = Math.abs(q - r.v); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0 && bd < 1.5) return { i: bi };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Law of Cosines guided steps: "subtract to find the value of x^2" wants the
// x^2 value, not x. Evaluate whatever arithmetic the prompt has built up.
window.__duo.solveStepExpression = function () {
  const ins = this.curInstruction();
  const wantSquare = /value of x\^?2|x\^2/i.test(ins);
  // the last printed line that is a complete arithmetic expression
  for (const t of this.mathParts().slice().reverse()) {
    const s = t.replace(/\s|°|degrees?/gi, '');
    const m = s.match(/^(?:x\^?2=)?(.+?)=?$/);
    if (!m) continue;
    const body = m[1];
    if (!/[-+*/]/.test(body) && !/sin|cos|tan/i.test(body)) continue;
    const v = this.evalTrigExpr(body);
    if (v === null || !isFinite(v)) continue;
    const dp = /hundredth/i.test(ins) ? 2 : /whole|integer/i.test(ins) ? 0 : 1;
    return wantSquare ? Number(v.toFixed(dp)) : Number(v.toFixed(dp));
  }
  return null;
};
(function () {
  const RE = /subtract to find|multiply to find|add to find|value of x\^?2|evaluate/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.solveStepExpression(); if (v !== null) return v;
    }
    return bo.call(this);
  };
})();

// Law of Cosines: c^2 = a^2 + b^2 - 2ab*cos(C)
window.__duo.lawOfCosines = function () {
  const P = this.sideAnglePairs();
  const labs = (this.diagramLabels() || []);
  const nums = labs.filter(l => /^-?\d+(\.\d+)?$/.test(l.t)).map(l => parseFloat(l.t));
  const angs = labs.filter(l => /°/.test(l.t)).map(l => parseFloat(l.t.replace(/[^\d.]/g, '')));
  if (nums.length < 2 || angs.length < 1) return null;
  const [a, b] = nums, C = angs[0];
  const D = Math.PI / 180;
  const c2 = a * a + b * b - 2 * a * b * Math.cos(C * D);
  return isFinite(c2) ? { c2, c: Math.sqrt(c2) } : null;
};


// "Take the square root to find x" — the guided step wants sqrt of the x^2 the
// lesson just established, which is printed on the page as the accepted answer
// to the previous step.
window.__duo.prevStepValue = function () {
  const t = document.body.innerText.replace(/\s+/g, ' ');
  const m = t.match(/value of\s*𝑥?\s*\^?2?[^.]*\.\s*(-?\d+(?:\.\d+)?)/i)
        || t.match(/𝑥\s*2\s*=\s*(-?\d+(?:\.\d+)?)/)
        || t.match(/x\s*\^?2\s*=\s*(-?\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
};


// "Select the point translated 1 unit left and 1 unit up" — apply the stated
// vector to the plotted point and match the coordinate-pair choice.
window.__duo.solveTranslatedPoint = function () {
  const ins = this.curInstruction().replace(/\s/g, '');
  if (!/translat/i.test(ins)) return null;
  let dx = 0, dy = 0, seen = false;
  for (const m of ins.matchAll(/(\d+)units?(left|right|up|down)/gi)) {
    const n = parseFloat(m[1]); seen = true;
    if (/left/i.test(m[2])) dx -= n; else if (/right/i.test(m[2])) dx += n;
    else if (/up/i.test(m[2])) dy += n; else dy -= n;
  }
  if (!seen) return null;
  const P = this.plottedPoints();
  const src = P.length === 1 ? P[0] : (this.promptPairs()[0] || null);
  if (!src) return null;
  const want = [src[0] + dx, src[1] + dy];
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => { const p = this.choicePair(e);
    return p && Math.abs(p[0] - want[0]) < 1e-6 && Math.abs(p[1] - want[1]) < 1e-6; });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveTranslatedPoint', /translat/i]);
;'__duo ready';
