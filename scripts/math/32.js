
// "Select the predicted input when y = 1" — the inverse direction: find the x
// on the trend line (formula or drawn) that produces the given y.
window.__duo.inputForY = function (y) {
  let f = null;
  for (const t of this.mathParts()) {
    const m = t.match(/^(?:y|[a-z]\(x\))=([^=]+)$/);
    if (m) { const g = this.compile(m[1].replace(/cdot|times/g, '*')); if (g) f = g; }
  }
  if (!f) {
    const c = this.allCurves(); if (!c.length) return null;
    const P = []; for (let i = 0; i <= 200; i++) { const p = c[0](i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); }
    P.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      if ((y0 - y) * (y1 - y) <= 0 && y0 !== y1) return Math.round((x0 + (x1 - x0) * (y - y0) / (y1 - y0)) * 100) / 100;
    }
    return null;
  }
  let best = null, bd = Infinity;
  for (let x = -20; x <= 20; x += 0.01) {
    let v; try { v = f(x); } catch (e) { continue; }
    const d = Math.abs(v - y);
    if (d < bd) { bd = d; best = x; }
  }
  return bd < 0.02 ? Math.round(best * 100) / 100 : null;
};
(function () {
  const RE = /predicted input|input when|value of x when/i;
  const base = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const ins = this.curInstruction();
    if (RE.test(ins)) {
      const m = ins.replace(/\s/g, '').match(/y=(-?\d+(?:\.\d+)?)/);
      if (m) {
        const x = this.inputForY(parseFloat(m[1]));
        if (x !== null) {
          const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
          const i = ch.findIndex(e => { const v = this.choiceValue(e); return v !== null && Math.abs(v - x) < 0.05; });
          if (i >= 0) return { i };
        }
      }
    }
    return base.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const ins = this.curInstruction();
    if (RE.test(ins)) {
      const m = ins.replace(/\s/g, '').match(/y=(-?\d+(?:\.\d+)?)/);
      if (m) { const x = this.inputForY(parseFloat(m[1])); if (x !== null) return x; }
    }
    return bo.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// "Select two points on the trend line": each choice offers a pair of points;
// keep the pair that actually lies on the drawn line.
window.__duo.solvePointsOnLine = function () {
  if (!/points on the (trend )?line/.test(this.curInstruction())) return null;
  const c = this.curvePath(); if (!c) return null;
  const P = []; for (let i = 0; i <= 200; i++) { const p = c.at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); }
  P.sort((a, b) => a[0] - b[0]);
  if (P.length < 5) return null;
  const yAt = x => { if (x < P[0][0] - 0.5 || x > P[P.length - 1][0] + 0.5) return null;
    for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return P[P.length - 1][1]; };
  // extrapolate along the fitted line for x outside the drawn range
  const m = (P[P.length - 1][1] - P[0][1]) / (P[P.length - 1][0] - P[0][0]);
  const b = P[0][1] - m * P[0][0];
  const at = x => { const v = yAt(x); return v === null ? m * x + b : v; };
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const hits = [];
  ch.forEach((e, i) => {
    const raw = this.choiceLatex(e).replace(/\\(mathbf|textbf|text|left|right)\b/g, '').replace(/[{}\s\\]/g, '');
    const pairs = [...raw.matchAll(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/g)].map(q => [parseFloat(q[1]), parseFloat(q[2])]);
    if (pairs.length < 2) return;
    if (pairs.every(p => Math.abs(at(p[0]) - p[1]) < 0.3)) hits.push(i);
  });
  return hits.length === 1 ? { i: hits[0] } : null;
};
window.__duo.RULES.unshift(['solvePointsOnLine', /points on the/i]);
;'__duo ready';

// Unit 169 residuals, done in guided steps. The highlighted "connected" point is
// drawn twice, so it is the coordinate that appears more than once.
window.__duo.connectedPoint = function () {
  const P = this.plottedPoints();
  const key = p => p[0] + ',' + p[1];
  const seen = {};
  for (const p of P) seen[key(p)] = (seen[key(p)] || 0) + 1;
  const dup = Object.keys(seen).filter(k => seen[k] > 1);
  if (dup.length !== 1) return null;
  return dup[0].split(',').map(Number);
};
window.__duo.lineYAt = function (x) {
  const c = this.curvePath(); if (!c) return null;
  const P = []; for (let i = 0; i <= 200; i++) { const p = c.at(i / 200); if (isFinite(p[0]) && isFinite(p[1])) P.push(p); }
  P.sort((a, b) => a[0] - b[0]); if (P.length < 5) return null;
  const m = (P[P.length - 1][1] - P[0][1]) / (P[P.length - 1][0] - P[0][0]);
  const b = P[0][1] - m * P[0][0];
  return Math.round((m * x + b) * 100) / 100;
};
(function () {
  const RE = /residual|connected point|predicted y|actual y/i;
  const answer = function () {
    const ins = this.curInstruction();
    if (!RE.test(ins)) return null;
    const pt = this.connectedPoint(); if (!pt) return null;
    if (/actual y/.test(ins)) return pt[1];
    if (/predicted y/.test(ins)) return this.lineYAt(pt[0]);
    if (/residual/.test(ins)) {
      const p = this.lineYAt(pt[0]);
      return p === null ? null : Math.round((pt[1] - p) * 100) / 100;
    }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = answer.call(this); if (v !== null && v !== undefined) return v;
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    const v = answer.call(this);
    if (v !== null && v !== undefined) {
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 0.05; });
      if (i >= 0) return { i };
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// Final residual step: "Subtract the predicted value from the actual value."
// Re-measuring the line here is wrong — the graph re-renders between steps — so
// use the two values this lesson already accepted, read back off the page.
window.__duo.answeredSteps = function () {
  const t = document.body.innerText.replace(/\s+/g, ' ');
  const grab = re => { const m = t.match(re); return m ? parseFloat(m[1]) : null; };
  return {
    actual: grab(/actual [^.]*?value[^.]*?\.\s*(-?\d+(?:\.\d+)?)/i),
    predicted: grab(/predicted [^.]*?value[^.]*?\.\s*(-?\d+(?:\.\d+)?)/i)
  };
};
(function () {
  const RE = /subtract the predicted|residual/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) {
      const A = this.answeredSteps();
      if (A.actual !== null && A.predicted !== null)
        return Math.round((A.actual - A.predicted) * 100) / 100;
    }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const A = this.answeredSteps();
      if (A.actual !== null && A.predicted !== null) {
        const v = A.actual - A.predicted;
        const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 0.05; });
        if (i >= 0) return { i };
      }
    }
    return bt.call(this);
  };
  window.__duo.RULES.unshift(['solveTransformedValue', RE]);
})();
;'__duo ready';

// When the prompt spells the arithmetic out ("residual = 2 - 3 ="), just
// evaluate it. Beats every heuristic and is immune to the graph re-rendering.
window.__duo.trailingExpression = function () {
  for (const t of this.mathParts().slice().reverse()) {
    const m = t.match(/=\s*(-?[\d.]+(?:[+\-*/][\d.]+)+)\s*=\s*$/) ||
              t.match(/^(-?[\d.]+(?:[+\-*/][\d.]+)+)=$/);
    if (!m) continue;
    const g = this.compile(m[1]);
    if (g) { try { const v = g(0); if (isFinite(v)) return Math.round(v * 1e6) / 1e6; } catch (e) {} }
  }
  return null;
};


// "Select the expression for the residual": the answer is the subtraction
// written actual - predicted, so match the operand ORDER, not just the value
// (6-5 and 5-6 both appear as choices).
window.__duo.solveResidualExpr = function () {
  if (!/expression for the residual/.test(this.curInstruction())) return null;
  const pt = this.connectedPoint();
  const actual = pt ? pt[1] : this.answeredSteps().actual;
  if (actual === null || actual === undefined) return null;
  const pred = pt ? this.lineYAt(pt[0]) : this.answeredSteps().predicted;
  if (pred === null || pred === undefined) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const i = ch.findIndex(e => {
    const m = this.plainMath(this.choiceLatex(e)).match(/^(-?[\d.]+)-(-?[\d.]+)$/);
    return m && Math.abs(parseFloat(m[1]) - actual) < 0.05 && Math.abs(parseFloat(m[2]) - pred) < 0.05;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveResidualExpr', /expression for the residual/i]);
;'__duo ready';

// The connected point is not always drawn twice. Test every plotted point:
// the right choice is "point's y - line's y at that x", and only one candidate
// matches in that order.
window.__duo.solveResidualExpr = function () {
  if (!/expression for the residual/.test(this.curInstruction())) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const ops = ch.map(e => {
    const m = this.plainMath(this.choiceLatex(e)).match(/^(-?[\d.]+)-(-?[\d.]+)$/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  });
  const hits = new Set();
  for (const p of this.plottedPoints()) {
    const ly = this.lineYAt(p[0]); if (ly === null) continue;
    ops.forEach((o, i) => {
      if (o && Math.abs(o[0] - p[1]) < 0.05 && Math.abs(o[1] - ly) < 0.05) hits.add(i);
    });
  }
  return hits.size === 1 ? { i: [...hits][0] } : null;
};
;'__duo ready';

// "Select the match at x = 5" with choices "predicted > observed" /
// "predicted < observed": compare the line to the data point at that x.
window.__duo.solvePredVsObs = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/\s+/g, ' '));
  if (!words.some(w => /predicted\s*[<>]\s*observed|observed\s*[<>]\s*predicted/.test(w))) return null;
  const m = this.curInstruction().replace(/\s/g, '').match(/x=(-?[\d.]+)/);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const pt = this.plottedPoints().find(p => Math.abs(p[0] - x) < 1e-6);
  const ly = this.lineYAt(x);
  if (!pt || ly === null || Math.abs(ly - pt[1]) < 1e-9) return null;
  const predHigher = ly > pt[1];
  const i = words.findIndex(w => {
    const q = w.match(/(predicted|observed)\s*([<>])\s*(predicted|observed)/);
    if (!q) return false;
    const leftIsPred = q[1] === 'predicted';
    const gt = q[2] === '>';
    return (leftIsPred === gt) ? predHigher : !predHigher;
  });
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solvePredVsObs', /select the match at|predicted|observed/i]);
;'__duo ready';

// Sometimes the prompt states both values outright ("observed = 11,
// predicted = 4") and the choices are the candidate expressions.
window.__duo.statedObsPred = function () {
  const t = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '');
  const o = t.match(/observed,?=(-?[\d.]+)/i), p = t.match(/predicted,?=(-?[\d.]+)/i);
  return (o && p) ? { obs: parseFloat(o[1]), pred: parseFloat(p[1]) } : null;
};
(function () {
  const base = window.__duo.solveResidualExpr;
  window.__duo.solveResidualExpr = function () {
    const S = this.statedObsPred();
    if (S) {
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const i = ch.findIndex(e => {
        const m = this.plainMath(this.choiceLatex(e)).match(/^(-?[\d.]+)-(-?[\d.]+)$/);
        return m && Math.abs(parseFloat(m[1]) - S.obs) < 0.05 && Math.abs(parseFloat(m[2]) - S.pred) < 0.05;
      });
      if (i >= 0) return { i };
    }
    return base.call(this);
  };
  window.__duo.RULES.unshift(['solveResidualExpr', /observed|predicted|residual/i]);
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const S = this.statedObsPred();
    if (S && /residual/.test(this.curInstruction())) return Math.round((S.obs - S.pred) * 100) / 100;
    return bo.call(this);
  };
})();
;'__duo ready';

// Unit 170: two-way tables. "Column totals" leaves the TOTAL row empty; read the
// body numbers row-major from the frame text, sum each column, and drag the
// matching tokens in.
window.__duo.solveTableTotals = async function () {
  const T = this.tableCells(); if (!T) return false;
  const empty = T.cells.filter(c => c.empty); if (!empty.length) return false;
  const d = this.diagram(); if (!d) return false;
  const txt = d.f.contentDocument.body.innerText.replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
  const body = txt.split(/TOTAL/i)[0];
  const ns = (body.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const filled = T.cells.length - empty.length;
  if (!ns.length || ns.length !== filled) return false;
  const cols = empty.length, rows = filled / cols;
  if (!Number.isInteger(rows)) return false;
  const ins = this.curInstruction();
  const wantRow = /row total/i.test(ins);
  const sums = [];
  if (wantRow) { for (let r = 0; r < rows; r++) sums.push(ns.slice(r * cols, r * cols + cols).reduce((a, b) => a + b, 0)); }
  else { for (let c = 0; c < cols; c++) { let s = 0; for (let r = 0; r < rows; r++) s += ns[r * cols + c]; sums.push(s); } }
  if (sums.length !== empty.length) return false;
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (let i = 0; i < empty.length; i++) {
    const tok = this.bankTokens().find(o => parseFloat(o.t) === sums[i] && o.el.isConnected);
    const cell = empty[i].el || empty[i].element;
    if (!tok || !cell) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(cell));
    await this.sleep(320);
  }
  return true;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveTableTotals()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// The frame text includes the header ("9TH 10TH"), which polluted the numbers.
// tableCells already carries each cell's value and x/y, so group by coordinate.
window.__duo.solveTableTotals = async function () {
  const T = this.tableCells(); if (!T) return false;
  const d = this.diagram(); if (!d) return false;
  const empty = T.cells.filter(c => c.empty);
  const full = T.cells.filter(c => !c.empty && isFinite(parseFloat(c.t)));
  if (!empty.length || !full.length) return false;
  const near = (a, b) => Math.abs(a - b) < 12;
  const byRow = /row total/i.test(this.curInstruction()) ||
                empty.every(c => near(c.x, empty[0].x)) === false && empty.every(c => near(c.y, empty[0].y)) === false;
  const sums = empty.map(e => {
    const sameCol = full.filter(c => near(c.x, e.x));
    const sameRow = full.filter(c => near(c.y, e.y));
    const grp = byRow ? sameRow : (sameCol.length ? sameCol : sameRow);
    return grp.length ? grp.reduce((a, c) => a + parseFloat(c.t), 0) : null;
  });
  if (sums.some(s => s === null)) return false;
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (let i = 0; i < empty.length; i++) {
    const tok = this.bankTokens().find(o => parseFloat(o.t) === sums[i] && o.el.isConnected);
    if (!tok || !empty[i].el) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(empty[i].el));
    await this.sleep(320);
  }
  return true;
};
;'__duo ready';

// "Enter the missing frequency": one body cell is blank and the TOTAL row/column
// is filled, so the answer is total minus the other entries in that line.
window.__duo.missingFrequency = function () {
  const T = this.tableCells(); if (!T) return null;
  const cells = T.cells;
  const blank = cells.find(c => c.empty || c.t === '?'); if (!blank) return null;
  const val = c => parseFloat(c.t);
  const near = (a, b) => Math.abs(a - b) < 12;
  const maxY = Math.max(...cells.map(c => c.y)), maxX = Math.max(...cells.map(c => c.x));
  for (const [same, totalAt] of [[c => near(c.x, blank.x), c => near(c.y, maxY)],
                                 [c => near(c.y, blank.y), c => near(c.x, maxX)]]) {
    const line = cells.filter(same);
    const total = line.find(c => c !== blank && totalAt(c) && isFinite(val(c)));
    if (!total) continue;
    const others = line.filter(c => c !== blank && c !== total && isFinite(val(c)));
    if (!others.length) continue;
    const v = val(total) - others.reduce((a, c) => a + val(c), 0);
    if (isFinite(v)) return v;
  }
  return null;
};
(function () {
  const RE = /missing (frequency|value|entry)|fill in the (blank|table)/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const v = this.missingFrequency(); if (v !== null) return v; }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.missingFrequency();
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
