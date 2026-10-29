
// ---- "Evaluate when x = N" slider ----
// A slider sets the input and the prompt echoes it back as f(<x>) = ... . Read the
// live x out of that echo and close the loop; the slider's px-per-unit is unknown,
// so calibrate from the first move like the \duodisplay slider.
Object.assign(window.__duo, {
  evalTargetX() {
    const A = this.ascii(this.promptLatex().join(' '))
      .replace(/emphasis|mathbf|textbf|text|\\/g, ' ').replace(/[{}~]/g, ' ');
    const m = A.match(/evaluate when\s*x\s*=\s*(-?[\d.]+)/i) || A.match(/when\s*x\s*=\s*(-?[\d.]+)/i);
    return m ? parseFloat(m[1]) : null;
  },
  evalCurrentX() {
    for (const s of this.promptLatex().slice().reverse()) {
      const m = this.ascii(s).replace(/mathbf|textbf|text|\\|\{|\}|~|\s/g, '').match(/^f\((-?[\d.]+)\)/);
      if (m) return parseFloat(m[1]);
    }
    return null;
  },
  async solveEvalSlider() {
    const want = this.evalTargetX(); if (want === null) return false;
    const f = [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)
      .find(x => x.contentDocument.querySelector('.slider1d-thumb,.slider2d-thumb'));
    if (!f) return false;
    const th = () => f.contentDocument.querySelector('.slider1d-thumb,.slider2d-thumb');
    const pos = () => {
      const fr = f.getBoundingClientRect(), r = th().getBoundingClientRect();
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
    };
    let step = 40;
    for (let k = 0; k < 8; k++) {
      const cur = this.evalCurrentX();
      if (cur === null) return false;
      if (Math.abs(cur - want) < 1e-9) return true;
      const from = pos();
      const dx = (want - cur) * step;
      await this.dragXY(th(), f, from, [Math.round(from[0] + dx), from[1]]);
      const after = this.evalCurrentX();
      if (after === null) return false;
      if (Math.abs(after - want) < 1e-9) return true;
      if (after !== cur) step = dx / (after - cur); else step *= 1.6;
    }
    return Math.abs((this.evalCurrentX() ?? NaN) - want) < 1e-9;
  },
});


// ---- table-fill via the diagram's own API (unit 144/145) ----
// This challenge is a mathChallengeBlob whose table is filled by DRAGGING tokens,
// not by a keypad — which is why cell clicks, keypad clicks and synthetic keys all
// did nothing, and why the "keypad" looked unreachable (it is a drawer translated
// down by exactly the viewport height and only opens for other challenge types).
// The diagram iframe exposes the live instance as window.mathDiagram:
//   rows            [[x, y], ...] with null for each blank
//   tokens          the bank's values
//   handleCellDrop(row, col, value, tokenEl)  the real drop path
//   setCellValue / updateCell / notifyUpdateSubscribers
// Use handleCellDrop so the token bank stays in sync with the answer state.
Object.assign(window.__duo, {
  diagram() {
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)) {
      const M = f.contentWindow.mathDiagram;
      if (M && M.rows) return { f, M };
    }
    return null;
  },

  // the rule y = f(x): prefer the prompt's formula, else fit from the filled rows
  tableRule() {
    for (const s of this.promptLatex().slice().reverse()) {
      if (!/=/.test(this.ascii(s))) continue;
      const f = this.compile(s);
      if (f) { try { if (isFinite(f(1))) return f; } catch (e) {} }
    }
    const d = this.diagram(); if (!d) return null;
    const done = d.M.rows.filter(r => r[0] !== null && r[1] !== null)
      .map(r => [parseFloat(this.ascii(String(r[0]))), parseFloat(this.ascii(String(r[1])))])
      .filter(r => !isNaN(r[0]) && !isNaN(r[1]));
    if (done.length < 2) return null;
    const cands = [
      x => Math.abs(x),
      x => x,
      x => -x,
      x => x * x,
    ];
    // a linear fit from the first two known rows, as a fallback
    const [a, b] = done;
    if (a[0] !== b[0]) {
      const m = (b[1] - a[1]) / (b[0] - a[0]), c = a[1] - m * a[0];
      cands.push(x => m * x + c);
    }
    return cands.find(fn => done.every(([x, y]) => Math.abs(fn(x) - y) < 1e-6)) || null;
  },

  async solveDiagramTable() {
    const d = this.diagram(); if (!d) return false;
    const M = d.M;
    const blanks = [];
    M.rows.forEach((r, i) => r.forEach((v, j) => { if (v === null) blanks.push([i, j]); }));
    if (!blanks.length) return false;
    const rule = this.tableRule(); if (!rule) return false;

    const bankEls = () => [...d.f.contentDocument.querySelectorAll('.token, [class*="token"]')]
      .filter(e => e.offsetParent !== null && String(e.textContent).trim());

    let did = 0;
    for (const [i, j] of blanks) {
      const other = M.rows[i][1 - j];
      const x = parseFloat(this.ascii(String(other)));
      if (isNaN(x)) continue;
      let v;
      try { v = j === 1 ? rule(x) : null; } catch (e) { continue; }
      if (v === null || !isFinite(v)) continue;
      const want = String(Math.round(v * 100) / 100);
      const tok = bankEls().find(e => this.ascii(String(e.textContent).trim()) === want);
      let ok = false;
      try { ok = M.handleCellDrop(i, j, want, tok || undefined); } catch (e) { ok = false; }
      if (!ok) {
        // fall back to writing the value straight into the model
        M.rows[i][j] = want;
        try { M.updateCell(i, j, want); M.notifyUpdateSubscribers(); } catch (e) {}
      }
      await this.sleep(450);
      if (M.rows[i][j] !== null) did++;
    }
    return did === blanks.length;
  },
});
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    const d = this.diagram();
    if (d && d.M.rows.some(r => r.some(v => v === null))) {
      if (await this.solveDiagramTable()) return true;
    }
    return await base.call(this);
  };
})();
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    const d = this.diagram();
    if (d && d.M.rows.some(r => r.some(v => v === null))) return { kind: 'diagramtable', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// ---- use the diagram's own coordinate maths ----
// The Grid2D instance exposes gridToPixel / pixelToGrid on its prototype. That is
// exact, so prefer it over fitting a scale from axis labels (which has repeatedly
// been the source of subtle bugs: empty tspans parsing as 0, labels split across
// text nodes, the plot running past the last label).
Object.assign(window.__duo, {
  gridApi() {
    for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)) {
      const M = f.contentWindow.mathDiagram;
      if (M && typeof M.gridToPixel === 'function') return { f, M };
    }
    return null;
  },

  // grid coords -> page coords
  gToPage(x, y) {
    const g = this.gridApi(); if (!g) return null;
    let p;
    try { p = g.M.gridToPixel({ x, y }); } catch (e) { try { p = g.M.gridToPixel(x, y); } catch (e2) { return null; } }
    if (!p) return null;
    const fr = g.f.getBoundingClientRect();
    const px = p.x !== undefined ? p.x : p[0], py = p.y !== undefined ? p.y : p[1];
    if (!isFinite(px) || !isFinite(py)) return null;
    return [Math.round(fr.left + px), Math.round(fr.top + py)];
  },

  // page coords -> grid coords
  pageToG(px, py) {
    const g = this.gridApi(); if (!g) return null;
    const fr = g.f.getBoundingClientRect();
    let p;
    try { p = g.M.pixelToGrid({ x: px - fr.left, y: py - fr.top }); }
    catch (e) { try { p = g.M.pixelToGrid(px - fr.left, py - fr.top); } catch (e2) { return null; } }
    if (!p) return null;
    const x = p.x !== undefined ? p.x : p[0], y = p.y !== undefined ? p.y : p[1];
    return isFinite(x) && isFinite(y) ? [x, y] : null;
  },
});
;'__duo ready';

// "Select the matching equation": sample the drawn curve in grid coordinates and
// keep the choice whose compiled function agrees with it.
window.__duo.solveMatchEquation = function () {
  const c = this.curvePath(); if (!c) return null;
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push(c.at(i / 12));
  if (pts.length < 5) return null;
  const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (!ch.length) return null;
  const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
  const hits = [];
  S.forEach((s, i) => {
    const f = this.compile(s); if (!f) return;
    let ok = 0, n = 0;
    for (const [x, y] of pts) {
      let v; try { v = f(x); } catch (e) { return; }
      if (!isFinite(v)) continue;
      n++; if (Math.abs(v - y) < 0.35) ok++;
    }
    if (n >= 5 && ok === n) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.splice(2, 0, ['solveMatchEquation', /matching equation|equation.*graph|graph.*equation/i]);
;'__duo ready';

// the equation can be matched against a TABLE of values rather than a drawn curve
(function () {
  const base = window.__duo.solveMatchEquation;
  window.__duo.solveMatchEquation = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    const d = this.diagram();
    const rows = d && d.M.rows
      ? d.M.rows.map(x => [parseFloat(this.ascii(String(x[0]))), parseFloat(this.ascii(String(x[1])))])
          .filter(p => !isNaN(p[0]) && !isNaN(p[1]))
      : (this.fnTable() || []);
    if (rows.length < 2) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const hits = [];
    S.forEach((s, i) => {
      const f = this.compile(s); if (!f) return;
      let ok = true;
      for (const [x, y] of rows) {
        let v; try { v = f(x); } catch (e) { ok = false; break; }
        if (!isFinite(v) || Math.abs(v - y) > 1e-6) { ok = false; break; }
      }
      if (ok) hits.push(i);
    });
    return hits.length === 1 ? { i: hits[0] } : r;
  };
})();
;'__duo ready';

// ---- "Graph the function" (single draggable point) ----
// The diagram component reports its position in GRID units (P.x, P.y), so there is
// no need for an axis-label scale at all — which matters because these screens
// often have no labels for grid2D() to fit. Drag, read the component back, and
// calibrate pixels-per-unit from what actually happened.
Object.assign(window.__duo, {
  dragComponent() {
    const d = this.diagram(); if (!d || !d.M.components) return null;
    const inner = d.M.components.components;
    const arr = Array.isArray(inner) ? inner
      : (inner && inner.values ? [...inner.values()] : Object.values(inner || {}));
    const P = arr.find(c => c && typeof c.x === 'number' && typeof c.y === 'number' && '_targetX' in c);
    if (!P) return null;
    const el = d.f.contentDocument.querySelector('g.point.draggable-point, .draggable-point');
    return { f: d.f, M: d.M, P, el: P.element || el };
  },

  // where the movable point belongs: the vertex of the compiled function
  graphTarget() {
    let f = null;
    for (const s of this.promptLatex().slice().reverse()) {
      if (!/=/.test(this.ascii(s))) continue;
      const g = this.compile(s);
      if (g) { try { if (isFinite(g(0)) || isFinite(g(1))) { f = g; break; } } catch (e) {} }
    }
    if (!f) return null;
    let best = null;
    for (let x = -10; x <= 10; x += 0.5) {
      let v; try { v = f(x); } catch (e) { continue; }
      if (!isFinite(v)) continue;
      if (!best || v < best[1]) best = [x, v];
    }
    if (!best) return null;
    return [Math.round(best[0] * 2) / 2, Math.round(best[1] * 2) / 2];
  },

  async solveGraphPoint() {
    const want = this.graphTarget(); if (!want) return false;
    const D = this.dragComponent(); if (!D || !D.el) return false;
    const at = () => [D.P.x, D.P.y];
    const centre = () => {
      const fr = D.f.getBoundingClientRect(), r = D.el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)];
    };
    let px = 45, py = -45;                       // starting guess, calibrated below
    for (let k = 0; k < 8; k++) {
      const cur = at();
      if (cur[0] === null || cur[1] === null) return false;
      if (Math.abs(cur[0] - want[0]) < 1e-6 && Math.abs(cur[1] - want[1]) < 1e-6) return true;
      const from = centre(); if (!from) return false;
      const to = [Math.round(from[0] + (want[0] - cur[0]) * px),
                  Math.round(from[1] + (want[1] - cur[1]) * py)];
      await this.dragXY(D.el, D.f, from, to);
      const after = at();
      if (after[0] === null || after[1] === null) return false;
      if (after[0] !== cur[0]) px = ((to[0] - from[0]) / (after[0] - cur[0]));
      if (after[1] !== cur[1]) py = ((to[1] - from[1]) / (after[1] - cur[1]));
      if (after[0] === cur[0] && after[1] === cur[1]) { px *= 1.5; py *= 1.5; }
    }
    const fin = at();
    return Math.abs(fin[0] - want[0]) < 1e-6 && Math.abs(fin[1] - want[1]) < 1e-6;
  },
});
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (/graph the function/i.test(this.prompt()) && this.dragComponent() && this.graphTarget()) {
      if (await this.solveGraphPoint()) return true;
    }
    return await base.call(this);
  };
})();
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    if (/graph the function/i.test(this.prompt()) && this.dragComponent() && this.graphTarget())
      return { kind: 'graphpoint', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// diagram() required M.rows, so it found the Table instance but never the Grid2D
// one — which is why the graph solvers saw "no diagram". Return any instance and
// let each caller check for the shape it needs.
window.__duo.diagram = function () {
  for (const f of [...document.querySelectorAll('iframe')].filter(x => x.contentDocument)) {
    const M = f.contentWindow.mathDiagram;
    if (M) return { f, M };
  }
  return null;
};
(function () {
  const base = window.__duo.solveDiagramTable;
  window.__duo.solveDiagramTable = async function () {
    const d = this.diagram();
    if (!d || !d.M.rows) return false;
    return base.call(this);
  };
})();
(function () {
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    const p = basePlan.call(this); if (p) return p;
    return null;
  };
})();
;'__duo ready';

// now that diagram() returns the Grid2D instance too, the table plan/drag wrappers
// must check for rows before touching them
(function () {
  const basePlan = window.__duo.plan;
  window.__duo.plan = function () {
    try { return basePlan.call(this); } catch (e) { return null; }
  };
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    try { return await baseDrag.call(this); } catch (e) { return false; }
  };
})();
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    const d = this.diagram();
    if (d && d.M.rows && d.M.rows.some(r => r.some(v => v === null)))
      return { kind: 'diagramtable', from: [0, 0], to: [0, 0] };
    if (/graph the function/i.test(this.prompt()) && this.dragComponent() && this.graphTarget())
      return { kind: 'graphpoint', from: [0, 0], to: [0, 0] };
    return null;
  };
})();
;'__duo ready';

// prompt() returns the last text-bearing line, which on these screens is the
// FORMULA, not the "Graph the function" header — so gating on that phrase never
// matched. Gate on the widget being present instead.
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this); if (p) return p;
    if (this.dragComponent() && this.graphTarget()) return { kind: 'graphpoint', from: [0, 0], to: [0, 0] };
    return null;
  };
  const baseDrag = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.dragComponent() && this.graphTarget()) {
      if (await this.solveGraphPoint()) return true;
    }
    return await baseDrag.call(this);
  };
})();
;'__duo ready';

// "Fill in the blank" over a diagram table: the blank cell renders as "?" (so
// M.rows shows it as text, not null), and the answer is TYPED, not dragged.
// Infer the rule from the complete rows and type the missing value.


// A blank cell does NOT always mean a drag: "Fill in the blank" shows a "?" cell but
// wants a typed answer. If there is a text input, never claim this as a drag plan —
// otherwise autoDrag fails and run2 stops on needdrag without ever typing.
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this);
    if (p && (p.kind === 'tablefill' || p.kind === 'diagramtable')
        && document.querySelector('[data-test="challenge-text-input"]')) return null;
    return p;
  };
})();
;'__duo ready';

// A constant equation (y = 7) has no variable, so linear() returns null and every
// slope/intercept solver gave up. Its slope is 0 and its intercept is the constant.

window.__duo.RULES = window.__duo.RULES.filter(r => r[0] !== 'solveRateValue');
window.__duo.RULES.splice(2, 0,
  ['solveRateValue', /select the rate of change|what is the rate of change|select the slope|what is the slope/i]);
;'__duo ready';

// the slope can be asked of a "y = ..." line, not just "f(x) = ..."
(function () {
  const base = window.__duo.solveRateValue;
  window.__duo.solveRateValue = function () {
    const r = base.call(this);
    if (r && r.i !== undefined) return r;
    let want = null;
    for (const s of this.promptLatex().slice().reverse()) {
      if (!/=/.test(this.ascii(s))) continue;
      const ab = this.formulaAB(s);
      if (ab) { want = ab.m; break; }
    }
    if (want === null) return r;
    const ann = [...document.querySelectorAll('[data-test="challenge-choice"] annotation')].map(a => a.textContent);
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (!ch.length) return r;
    const S = ann.length === ch.length ? ann : ch.map(e => this.ascii(e.innerText));
    const i = S.findIndex(s => { const v = this.numTok(s); return v !== null && Math.abs(v - want) < 1e-9; });
    return i < 0 ? r : { i, want };
  };
})();
;'__duo ready';
