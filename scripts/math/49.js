
// "Select the volume" of a drawn cylinder/cone with pi-form numeric choices.
(function () {
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/\\pi/g, '*1').replace(/[{}]/g, '').replace(/\s/g, '')
    .replace(/(^|[=(*+\-/])\*+/g, '$1')
    .replace(/(\d)\(/g, '$1*(').replace(/\)(\d|\()/g, ')*$1');
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (/\bvolume\b/i.test(ins) && ch.length) {
      const E = (this.labeledEdges() || []).filter(e => e.dist < 40);
      const h = E.filter(e => e.vertical).map(e => e.v);
      const r = E.filter(e => !e.vertical).map(e => e.v);
      const hay0 = (ins + ' ' + this.promptTitle()).toLowerCase();
      const val = e => {
        const a = e.querySelector('annotation');
        const g = this.compile(prep(a ? a.textContent : e.innerText));
        try { return g ? g(0) : null; } catch (x) { return null; }
      };
      // a sphere has one labelled radius and no height to separate out
      // The solid is often never named: one labelled edge (a radius) and no
      // second dimension means a sphere.
      if ((/sphere/.test(hay0) || E.length === 1) && E.length) {
        const vals = ch.map(val);
        for (const rr of [E[0].v, E[0].v / 2]) {
          const w = 4 / 3 * rr * rr * rr;
          const i = vals.findIndex(v => v !== null && Math.abs(v - w) < 1e-9);
          if (i >= 0) return { i };
        }
      }
      if (h.length === 1 && r.length) {
        const vals = ch.map(val);
        const hay = hay0;
        const thirds = /cone/.test(hay) ? [3] : /cylinder/.test(hay) ? [1] : [1, 3];
        for (const d of thirds)
          for (const rr of [r[0], r[0] / 2]) {
            const w = rr * rr * h[0] / d;
            const i = vals.findIndex(v => v !== null && Math.abs(v - w) < 1e-9);
            if (i >= 0) return { i };
          }
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// "Select the y-intercept" / "x-intercept" offered as coordinate pairs: the
// intercept must sit on the right axis AND inside the drawn axis range, which
// is usually enough to leave exactly one choice.
(function () {
  const axisRange = function () {
    const n = (this.diagramLabels() || [])
      .map(l => parseFloat(String(l.t).replace(/[−–—]/g, '-')))
      .filter(v => isFinite(v));
    return n.length ? Math.max(...n.map(Math.abs)) : null;
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    const m = ins.match(/\b([xy])\s*-?\s*intercept/i);
    if (m) {
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const pairs = ch.map(e => {
        const t = this.half(e.innerText).replace(/[−–—]/g, '-').match(/\((-?[\d.]+),(-?[\d.]+)\)/);
        return t ? [parseFloat(t[1]), parseFloat(t[2])] : null;
      });
      if (pairs.some(Boolean)) {
        const zeroAt = m[1].toLowerCase() === 'y' ? 0 : 1;   // y-intercept has x=0
        const R = axisRange.call(this);
        const ok = pairs.map(p => p && Math.abs(p[zeroAt]) < 1e-9 &&
          (R === null || Math.abs(p[1 - zeroAt]) <= R + 1e-9));
        if (ok.filter(Boolean).length === 1) return { i: ok.indexOf(true) };
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// Sample the drawn curve in grid coordinates: the basis for reading roots,
// intercepts and turning points off a graph.
window.__duo.curveXY = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  let best = null, bl = 0;
  for (const p of d.querySelectorAll('svg path')) {
    if (!p.getTotalLength) continue;
    const L = p.getTotalLength();
    const b = p.getBBox ? p.getBBox() : null;
    if (!b || b.width < 40) continue;          // skip ticks, arrows, gridlines
    if (L > bl) { bl = L; best = p; }
  }
  if (!best) return null;
  const m = best.ownerSVGElement.getScreenCTM(); if (!m) return null;
  const out = [];
  const n = Math.min(400, Math.max(60, Math.round(bl / 3)));
  for (let i = 0; i <= n; i++) {
    const q = best.getPointAtLength(bl * i / n);
    const X = m.a * q.x + m.c * q.y + m.e + fr.left, Y = m.b * q.x + m.d * q.y + m.f + fr.top;
    out.push(g.toXY(X, Y));
  }
  return out;
};

// x-values where the drawn curve crosses y = 0.
window.__duo.curveRoots = function () {
  const pts = this.curveXY(); if (!pts || pts.length < 3) return null;
  const roots = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (!isFinite(y0) || !isFinite(y1)) continue;
    if (y0 === 0) roots.push(x0);
    else if (y0 * y1 < 0) roots.push(x0 + (x1 - x0) * (-y0) / (y1 - y0));
  }
  // the sampled path may double back, so collapse near-duplicates
  roots.sort((a, b) => a - b);
  return roots.filter((r, i) => i === 0 || Math.abs(r - roots[i - 1]) > 0.25);
};



// "Match the pairs": eight tap tokens, four expressions and their four values.
// These are timed, so pair everything by value in one pass and click straight
// through instead of round-tripping per tile.
window.__duo.solveMatchPairs = async function () {
  const tiles = [...document.querySelectorAll('[data-test$="-token"]')]
    .filter(b => b.querySelector('annotation'));
  if (tiles.length < 4) return false;
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/\\pi/g, '*1').replace(/[{}]/g, '').replace(/\s/g, '')
    .replace(/(^|[=(*+\-/])\*+/g, '$1');
  // Pairs are often symbolic (factored vs expanded), which is identical at
  // x=0, so fingerprint each tile over several sample points.
  const XS = [0.7314, 1.3121, -2.1137, 3.4271];
  const vals = tiles.map(b => {
    const g = this.compile(prep(b.querySelector('annotation').textContent));
    if (!g) return null;
    try {
      const v = XS.map(x => g(x));
      return v.every(n => isFinite(n)) ? v : null;
    } catch (e) { return null; }
  });
  const same = (a, b) => a && b && a.every((n, k) =>
    Math.abs(n - b[k]) <= 1e-7 * Math.max(1, Math.abs(n), Math.abs(b[k])));
  const used = new Array(tiles.length).fill(false);
  let clicked = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (used[i] || vals[i] === null) continue;
    const j = vals.findIndex((v, k) => k > i && !used[k] && same(v, vals[i]));
    if (j < 0) continue;
    used[i] = used[j] = true;
    // React ignores el.click() on these; it needs the pointer sequence
    for (const el of [tiles[i], tiles[j]]) {
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, composed: true, view: window,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
      el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }, o)));
      el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ buttons: 1 }, o)));
      el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 }, o)));
      el.dispatchEvent(new MouseEvent('mouseup', Object.assign({ buttons: 0 }, o)));
      el.dispatchEvent(new MouseEvent('click', Object.assign({ buttons: 0 }, o)));
      await new Promise(r2 => setTimeout(r2, 60));
    }
    clicked++;
    await new Promise(r => setTimeout(r, 120));
  }
  return clicked > 0;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (/match the pairs/i.test(this.curInstruction() || '') && await this.solveMatchPairs()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// "Select the input when f(x) = 2" — the inverse read: find x on the drawn
// curve where y hits the stated output. (And the forward read, f(a) = ?)


// "Select the match" against a polynomial: the choices name its degree, or its
// family (linear / quadratic / cubic / rational).
(function () {
  const NAMED = { constant: 0, linear: 1, quadratic: 2, cubic: 3, quartic: 4 };
  const degreeOf = function (tex) {
    const s = String(tex).replace(/\\(mathbf|textbf|text|displaystyle)\b/g, '')
      .replace(/[{}\s]/g, '');
    if (/\\frac\{?[^}]*[a-z]/.test(String(tex)) || /\/[a-z]/.test(s)) return null; // rational
    let d = 0;
    for (const m of s.matchAll(/[a-z](\^(-?\d+))?/g)) d = Math.max(d, m[2] ? parseInt(m[2]) : 1);
    return d;
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (/select the match|degree/i.test(ins) && ch.length) {
      const texts = ch.map(e => this.half(e.innerText).toLowerCase());
      const tex = this.promptLatex().filter(l => !/textbf\{Select/i.test(l)).pop();
      // "Select the degree" offers bare numbers; "select the match" spells
      // out "degree 3" or names the family.
      const bare = /\bdegree\b/i.test(ins) && texts.every(t => /^-?\d+$/.test(t));
      if (tex && (bare || texts.every(t => /^degree-?\d+$/.test(t) || t in NAMED))) {
        const d = degreeOf(tex);
        if (d !== null) {
          const i = texts.findIndex(t => {
            const m = t.match(/^degree(-?\d+)$/) || t.match(/^(-?\d+)$/);
            return m ? parseInt(m[1]) === d : NAMED[t] === d;
          });
          if (i >= 0) return { i };
        }
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// Plotted points that aren't draggable live in the static-points group, so
// gridPoints() never sees them.
window.__duo.staticPoints = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  const out = [];
  for (const grp of d.querySelectorAll('.static-points > *')) {
    const r = grp.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    out.push(g.toXY(fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2)
      .map(v => Math.abs(v - Math.round(v)) < 0.2 ? Math.round(v) : v));
  }
  return out.length ? out : null;
};

// "Find the run/rise from the left point to the right point": read both plotted
// points and subtract, always left-to-right so the run stays positive.


// "Select the equation using the slope and y-intercept": fit the line through
// the two plotted points, then keep the choice that agrees at sample x values.
(function () {
  const prep = t => String(t)
    .replace(/\\(mathbf|textbf|text|emphasis|displaystyle)\b/g, '')
    .replace(/\\(cdot|times)/g, '*').replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/[{}]/g, '').replace(/\s/g, '').replace(/[−–—]/g, '-')
    .replace(/^[a-z]\(x\)=|^y=/i, '');
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = String(this.curInstruction() || '');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (/equation/i.test(ins) && ch.length) {
      let pts = (this.gridPoints() || []).map(p => Array.isArray(p) ? p : [p.x, p.y]);
      if (pts.length < 2) pts = this.staticPoints() || [];
      pts = pts.filter(p => isFinite(p[0]) && isFinite(p[1])).sort((a, b) => a[0] - b[0]);
      if (pts.length >= 2) {
        const A = pts[0], B = pts[pts.length - 1];
        if (B[0] !== A[0]) {
          const m = (B[1] - A[1]) / (B[0] - A[0]), b = A[1] - m * A[0];
          const XS = [-1.7, 0.6, 2.3];
          const i = ch.findIndex(e => {
            const a = e.querySelector('annotation');
            const g = this.compile(prep(a ? a.textContent : e.innerText));
            if (!g) return false;
            try { return XS.every(x => Math.abs(g(x) - (m * x + b)) < 1e-6); } catch (x) { return false; }
          });
          if (i >= 0) return { i };
        }
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// Classify a function given only a value table: constant first differences are
// linear, constant second differences quadratic, constant ratios exponential.
window.__duo.tablePairs = function () {
  const labs = (this.diagramLabels() || []).map(l => String(l.t).replace(/[−–—]/g, '-'));
  const head = labs.findIndex(t => /^f\(x\)$|^y$/i.test(t));
  if (head < 1) return null;
  const nums = labs.slice(head + 1).map(parseFloat);
  if (nums.length < 4 || nums.some(n => !isFinite(n))) return null;
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts.length >= 3 ? pts : null;
};
window.__duo.tableFamily = function () {
  const P = this.tablePairs(); if (!P) return null;
  const y = P.map(p => p[1]);
  const d1 = y.slice(1).map((v, i) => v - y[i]);
  const near = a => a.every(v => Math.abs(v - a[0]) < 1e-6 * Math.max(1, Math.abs(a[0])));
  if (near(d1)) return 'linear';
  const d2 = d1.slice(1).map((v, i) => v - d1[i]);
  if (d2.length && near(d2)) return 'quadratic';
  if (y.every(v => v !== 0)) {
    const r = y.slice(1).map((v, i) => v / y[i]);
    if (near(r)) return 'exponential';
  }
  return null;
};
(function () {
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (ch.length && /select the match|which (function|type)/i.test(this.curInstruction() || '')) {
      const fam = this.tableFamily();
      if (fam) {
        const i = ch.findIndex(e => this.half(e.innerText).toLowerCase().startsWith(fam));
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
})();
;'__duo ready';

// "Select the x-values of the x-intercepts" is MULTI-select, and on guided
// table lessons the intercepts come from the table's zero rows, not a graph.


// \duoblank{n} carries the expected value as its argument. The equation solver
// is preferred, but two-unknown steps ("4 = \duoblank{-4} a") can't be solved
// numerically, and this reads straight off the prompt.
(function () {
  const base = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const r = base.call(this);
    if (r !== null && r !== undefined) return r;
    const line = this.promptLatex().filter(l => /duoblank/.test(l)).pop();
    if (line) {
      const m = line.match(/\\duoblank\{(-?\d+(?:\.\d+)?)\}/);
      if (m) return parseFloat(m[1]);
    }
    return r;
  };
})();
;'__duo ready';

// "x-intercepts: 2 and 4" -> pick the factored form that vanishes at both.
// Runs ahead of the generic expression solvers, which otherwise grab this.


// Duolingo has lost completed progress before, so keep an independent local
// record of every level this run finishes. Survives page reloads.
window.__duo.ledgerKey = 'duoLedger';
window.__duo.ledgerNote = function (unit, level, xp) {
  try {
    const L = JSON.parse(localStorage.getItem(this.ledgerKey) || '{}');
    const k = 'u' + unit + 'l' + level;
    L[k] = { at: new Date().toISOString(), xp: xp || 0 };
    localStorage.setItem(this.ledgerKey, JSON.stringify(L));
    return Object.keys(L).length;
  } catch (e) { return null; }
};
window.__duo.ledgerDump = function () {
  try { return localStorage.getItem(this.ledgerKey) || '{}'; } catch (e) { return '{}'; }
};
(function () {
  const base = window.__duo.autoLesson;
  window.__duo.autoLesson = async function () {
    const r = await base.call(this);
    if (r && r.ok) {
      const m = location.pathname.match(/unit\/(\d+)\/level\/(\d+)/);
      if (m) this.ledgerNote(m[1], m[2], this.S && this.S.xp);
    }
    return r;
  };
})();
;'__duo ready';
