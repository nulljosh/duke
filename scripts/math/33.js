
// "Complete the table with frequencies": blanks sit in the body and the TOTAL
// line is filled, so each blank is total minus the rest of its column (or row).
window.__duo.solveTableBlanks = async function () {
  const T = this.tableCells(); if (!T) return false;
  const d = this.diagram(); if (!d) return false;
  const cells = T.cells;
  const blanks = cells.filter(c => c.empty); if (!blanks.length) return false;
  const val = c => parseFloat(c.t);
  const near = (a, b) => Math.abs(a - b) < 12;
  const maxY = Math.max(...cells.map(c => c.y)), maxX = Math.max(...cells.map(c => c.x));
  const want = blanks.map(b => {
    for (const [same, isTotal] of [[c => near(c.x, b.x), c => near(c.y, maxY)],
                                   [c => near(c.y, b.y), c => near(c.x, maxX)]]) {
      const line = cells.filter(same);
      const total = line.find(c => c !== b && isTotal(c) && isFinite(val(c)));
      if (!total) continue;
      const others = line.filter(c => c !== b && c !== total && isFinite(val(c)));
      if (others.length !== line.length - 2) continue;
      const v = val(total) - others.reduce((a, c) => a + val(c), 0);
      if (isFinite(v)) return v;
    }
    return null;
  });
  if (want.some(v => v === null)) return false;
  const fr = d.f.getBoundingClientRect();
  const centre = el => { const r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  for (let i = 0; i < blanks.length; i++) {
    const tok = this.bankTokens().find(o => parseFloat(o.t) === want[i] && o.el.isConnected);
    if (!tok || !blanks[i].el) return false;
    await this.dragXY(tok.el, d.f, centre(tok.el), centre(blanks[i].el));
    await this.sleep(320);
  }
  return true;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveTableBlanks()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// Two-way table with labels: read every leaf text node in the frame with its
// position, then treat the top row as column headers and the left column as row
// headers. Joint frequency = the cell where a row and column label meet;
// marginal frequency = that label's TOTAL entry.
window.__duo.labeledTable = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const items = [...doc.querySelectorAll('div,span,text,tspan')]
    .filter(e => e.children.length === 0 && e.textContent.trim())
    .map(e => { const r = e.getBoundingClientRect();
      return { t: e.textContent.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (items.length < 6) return null;
  const num = i => /^-?\d+(\.\d+)?$/.test(i.t);
  const heads = items.filter(i => !num(i));
  const vals = items.filter(num);
  if (!heads.length || !vals.length) return null;
  const topY = Math.min(...heads.map(h => h.y));
  const cols = heads.filter(h => Math.abs(h.y - topY) < 20).sort((a, b) => a.x - b.x);
  const rows = heads.filter(h => Math.abs(h.y - topY) >= 20).sort((a, b) => a.y - b.y);
  if (!cols.length || !rows.length) return null;
  const at = (r, c) => {
    let best = null, bd = Infinity;
    for (const v of vals) {
      const dd = Math.abs(v.y - r.y) + Math.abs(v.x - c.x);
      if (dd < bd) { bd = dd; best = v; }
    }
    return best && bd < 120 ? parseFloat(best.t) : null;
  };
  return { cols, rows, at, norm: s => s.toLowerCase().replace(/[^a-z0-9]/g, '') };
};
window.__duo.frequencyAnswer = function () {
  const ins = this.curInstruction();
  if (!/frequency/.test(ins)) return null;
  const T = this.labeledTable(); if (!T) return null;
  const q = T.norm(ins);
  const find = list => list.filter(h => q.includes(T.norm(h.t)));
  const rowHit = find(T.rows).filter(h => !/^total$/i.test(h.t));
  const colHit = find(T.cols).filter(h => !/^total$/i.test(h.t));
  if (/joint/.test(ins) && rowHit.length && colHit.length) return T.at(rowHit[0], colHit[0]);
  if (/marginal/.test(ins)) {
    const totalCol = T.cols.find(c => /^total$/i.test(c.t));
    const totalRow = T.rows.find(r => /^total$/i.test(r.t));
    if (rowHit.length && totalCol) return T.at(rowHit[0], totalCol);
    if (colHit.length && totalRow) return T.at(totalRow, colHit[0]);
    // no explicit total header: sum the label's line
    if (rowHit.length) return T.cols.reduce((a, c) => { const v = T.at(rowHit[0], c); return v === null ? a : a + v; }, 0);
    if (colHit.length) return T.rows.reduce((a, r) => { const v = T.at(r, colHit[0]); return v === null ? a : a + v; }, 0);
  }
  if (rowHit.length && colHit.length) return T.at(rowHit[0], colHit[0]);
  return null;
};
(function () {
  const RE = /frequency/i;
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (RE.test(this.curInstruction())) { const v = this.frequencyAnswer(); if (v !== null && v !== undefined) return v; }
    return bo.call(this);
  };
  const bt = window.__duo.solveTransformedValue;
  window.__duo.solveTransformedValue = function () {
    if (RE.test(this.curInstruction())) {
      const v = this.frequencyAnswer();
      if (v !== null && v !== undefined) {
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

// Unit 171+ mixes in definition questions with nothing to compute. A short
// glossary keyed on distinctive prompt wording; each entry lists the word the
// blank wants. Falls through when the prompt is not a definition.
window.__duo.GLOSSARY = [
  [/dot plot uses dots.*show the/i, ['frequency']],
  [/histogram/i, ['bins', 'intervals', 'frequency']],
  [/box plot|box-and-whisker/i, ['quartiles', 'median']],
  [/middle value|half the (data|values) (are|is) below/i, ['median']],
  [/most (frequent|common) value/i, ['mode']],
  [/sum of the values divided|average of the/i, ['mean']],
  [/spread of the middle|interquartile/i, ['range', 'iqr']],
  [/difference between the (largest|maximum) and/i, ['range']],
  [/outlier/i, ['outlier']],
  [/strength and direction/i, ['correlation']],
  [/line of best fit|trend line/i, ['residual', 'slope']],
  [/predicted value|expected value on the line/i, ['predicted']],
  [/observed value|actual data point/i, ['observed']],
  [/symmetric|skewed/i, ['skewed', 'symmetric']],
];
window.__duo.solveGlossary = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const ins = this.curInstruction();
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  for (const [re, answers] of this.GLOSSARY) {
    if (!re.test(ins)) continue;
    for (const a of answers) {
      const i = words.findIndex(w => w === a || w.startsWith(a));
      if (i >= 0) return { i };
    }
  }
  return null;
};
window.__duo.RULES.unshift(['solveGlossary', /fill in the blank|uses dots|plot|median|mean|mode|outlier/i]);
;'__duo ready';

// "Make the total frequency 11" with a displayed sum "total = 7 + <slider>":
// solve the shown arithmetic for the slider value.
window.__duo.solveSumSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  const parts = this.mathParts();
  const goal = parts.concat([this.curInstruction()]).join(' ').replace(/\s/g, '')
    .match(/make(?:the)?[a-z]*?(-?\d+(?:\.\d+)?)$/i);
  if (!goal) return false;
  const target = parseFloat(goal[1]);
  const line = parts.find(t => /duodisplay/.test(t) && /=/.test(t));
  if (!line) return false;
  const rhs = line.split('=').pop();
  for (let v = S.s.min; v <= S.s.max; v += S.s.step) {
    const expr = rhs.replace(/duodisplay-?[\d.]+-?[\d.]+/, '(' + v + ')')
                    .replace(/duodisplay/, '(' + v + ')');
    const g = this.compile(expr); if (!g) continue;
    let out; try { out = g(0); } catch (e) { continue; }
    if (isFinite(out) && Math.abs(out - target) < 1e-9) return await this.setSlider2d(v);
  }
  return false;
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (this.slider2d() && await this.solveSumSlider()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// two fixes: find the goal in an individual prompt line (the joined string ends
// with the template, not the target), and substitute into the RAW LaTeX where
// \duodisplay{6}{1} still has delimited arguments.
window.__duo.solveSumSlider = async function () {
  const S = this.slider2d(); if (!S) return false;
  let target = null;
  for (const t of this.mathParts().concat([this.curInstruction().replace(/\s/g, '')])) {
    const m = t.match(/make[a-z]*?(-?\d+(?:\.\d+)?)$/i);
    if (m) { target = parseFloat(m[1]); break; }
  }
  if (target === null) return false;
  const raw = this.promptLatex().find(l => /duodisplay/.test(this.ascii(l)) && /=/.test(this.ascii(l)));
  if (!raw) return false;
  for (let v = S.s.min; v <= S.s.max; v += S.s.step) {
    const expr = this.ascii(raw)
      .replace(/\\duodisplay\{[^{}]*\}\{[^{}]*\}/g, '(' + v + ')')
      // \frac{1}{3} must become (1)/(3) BEFORE braces are stripped
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\(mathbf|textbf|text)\b/g, '')
      .replace(/\\cdot|\\times/g, '*')
      // "16\pi" vs "\pi r^2": pi cancels on both sides, so drop it.
      .replace(/\\pi/g, '(3.141592653589793)')
      .replace(/[{}\s\\]/g, '')
      .split('=').pop();
    const g = this.compile(expr); if (!g) continue;
    let out; try { out = g(0); } catch (e) { continue; }
    if (isFinite(out) && Math.abs(out - target) < 1e-9) return await this.setSlider2d(v);
  }
  return false;
};
;'__duo ready';

window.__duo.GLOSSARY.unshift(
  [/taller stacks/i, ['more']],
  [/shorter stacks/i, ['less', 'fewer']],
  [/each dot represents/i, ['onedatapoint', 'one', 'datapoint']],
  [/wider (box|spread)/i, ['more']],
  [/the (mean|average) is (pulled|affected)/i, ['outliers', 'outlier']],
  [/resistant to outliers|not affected by outliers/i, ['median']],
);
;'__duo ready';

// run2 checks plan() BEFORE the choice branch, so any plan on a screen that is
// really multiple choice (or a text input) sends it down the drag path and the
// question never gets answered. Interactive-widget plans only apply when there
// is nothing to click or type.
(function () {
  const base = window.__duo.plan;
  window.__duo.plan = function () {
    const p = base.call(this);
    if (!p) return null;
    const soft = ['slider2d', 'gridpoint', 'plotdata', 'tablefill'].includes(p.kind);
    if (soft && (document.querySelector('[data-test="challenge-choice"]') ||
                 document.querySelector('[data-test="challenge-text-input"]'))) return null;
    return p;
  };
})();
;'__duo ready';

// Unit 171 dot plots live in their own iframe (class "dot-plot") and are drawn
// as plain SVG marks, not diagram components. Read the marks' screen x, group
// them into columns, and map each column to its axis label.
window.__duo.dotPlot = function () {
  const f = [...document.querySelectorAll('iframe')]
    .find(fr => { try { return /dot-plot/.test(fr.contentDocument.body.innerHTML.slice(0, 4000)); } catch (e) { return false; } });
  if (!f) return null;
  const doc = f.contentDocument;
  const marks = [...doc.querySelectorAll('circle,ellipse,image,path')]
    .filter(e => /dot|point|marker/i.test(e.getAttribute('class') || ''))
    .map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })
    .filter(m => m.x || m.y);
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
window.__duo.dotPlotAnswer = function () {
  const ins = this.curInstruction();
  if (!/frequency/.test(ins)) return null;
  const C = this.dotPlot(); if (!C) return null;
  if (/total frequency/.test(ins)) return Object.values(C).reduce((a, b) => a + b, 0);
  const m = ins.replace(/\s/g, '').match(/value(-?\d+(?:\.\d+)?)/);
  if (m) { const v = parseFloat(m[1]); return v in C ? C[v] : null; }
  return null;
};


// each dot renders as several stacked <path> layers, so collapse marks that sit
// on the same spot before counting


// Dot plot "Plot the data 8, 9, 10, 10, 11, 12": one draggable dot per axis
// value, dragged UP to that value's frequency.
window.__duo.solveDotPlotBuild = async function () {
  const pts = this.gridPoints(); if (pts.length < 2) return false;
  if (!pts.every(p => Math.abs(p.y) < 1e-9 || p.y >= 0)) return false;
  const line = this.promptLatex()
    .map(l => this.ascii(l).replace(/\\(mathbf|textbf|text|left|right)\b/g, '').replace(/[{}\s\\]/g, ''))
    .find(t => /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)+$/.test(t));
  if (!line) return false;
  const data = line.split(',').map(Number);
  const freq = {};
  for (const v of data) freq[v] = (freq[v] || 0) + 1;
  for (const p of pts) {
    const want = freq[p.x] || 0;
    if (Math.abs(p.y - want) < 1e-9) continue;
    await this.dragPointTo(p, p.x, want);
  }
  return this.gridPoints().every(p => Math.abs(p.y - (freq[p.x] || 0)) < 1e-6);
};
(function () {
  const base = window.__duo.autoDrag;
  window.__duo.autoDrag = async function () {
    if (await this.solveDotPlotBuild()) return true;
    return await base.call(this);
  };
})();
;'__duo ready';

// the LaTeX puts a thin space between items, so the flattened list is
// "8,,9,,10,,10,,11,,12" — collapse repeated separators before parsing
(function () {
  const base = window.__duo.solveDotPlotBuild;
  window.__duo.solveDotPlotBuild = async function () {
    const pts = this.gridPoints(); if (pts.length < 2) return false;
    const line = this.promptLatex()
      .map(l => this.ascii(l).replace(/\\(mathbf|textbf|text|left|right)\b/g, '').replace(/[{}\s\\]/g, '').replace(/,+/g, ','))
      .find(t => /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)+$/.test(t));
    if (!line) return await base.call(this);
    const freq = {};
    for (const v of line.split(',').map(Number)) freq[v] = (freq[v] || 0) + 1;
    for (const p of pts) {
      const want = freq[p.x] || 0;
      if (Math.abs(p.y - want) < 1e-9) continue;
      await this.dragPointTo(p, p.x, want);
    }
    return this.gridPoints().every(p => Math.abs(p.y - (freq[p.x] || 0)) < 1e-6);
  };
})();
;'__duo ready';

// Dot-plot dots ignore synthetic pointer events entirely — they only respond to
// a real OS-level mouse drag (the Chrome `computer` tool). This helper computes
// the drags needed; the caller performs them.
// Dots move BETWEEN columns (they are not stretched vertically): a column needs
// as many dots as the value's frequency in the data.
window.__duo.dotPlotDrags = function () {
  const pts = this.gridPoints(); if (pts.length < 2) return null;
  const line = this.promptLatex()
    .map(l => this.ascii(l).replace(/\\(mathbf|textbf|text|left|right)\b/g, '').replace(/[{}\s\\]/g, '').replace(/,+/g, ','))
    .find(t => /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)+$/.test(t));
  if (!line) return null;
  const data = line.split(',').map(Number);
  const need = {};
  for (const v of data) need[v] = (need[v] || 0) + 1;
  const have = {};
  for (const p of pts) have[p.x] = (have[p.x] || 0) + 1;
  const surplus = [], deficit = [];
  for (const p of pts) {
    const n = need[p.x] || 0;
    if ((have[p.x] || 0) > n) { surplus.push(p); have[p.x]--; }
  }
  for (const x of Object.keys(need).map(Number))
    for (let k = (have[x] || 0); k < need[x]; k++) deficit.push(x);
  if (surplus.length !== deficit.length) return null;
  const d = this.diagram(), fr = d.f.getBoundingClientRect(), g = d.M.grid;
  const scr = p => { const el = p.element.querySelector('circle') || p.element, r = el.getBoundingClientRect();
    return [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)]; };
  const colX = x => { const same = pts.find(p => p.x === x); return same ? scr(same)[0] : null; };
  const out = [];
  surplus.forEach((p, i) => {
    const x = deficit[i], cx = colX(x);
    if (cx === null) return;
    const from = scr(p);
    out.push({ from, to: [cx, from[1] - 26] });   // land above the column to stack
  });
  return out.length ? out : null;
};
;'__duo ready';

// total frequency = how many dots are plotted; when the dots are diagram
// components rather than raw SVG marks, just count them
(function () {
  const base = window.__duo.dotPlotAnswer;
  window.__duo.dotPlotAnswer = function () {
    const v = base.call(this); if (v !== null && v !== undefined) return v;
    const ins = this.curInstruction();
    if (!/frequency/.test(ins)) return null;
    const pts = this.plottedPoints();
    if (!pts.length) return null;
    if (/total frequency/.test(ins)) return pts.length;
    const m = ins.replace(/\s/g, '').match(/value(-?\d+(?:\.\d+)?)/);
    if (m) { const x = parseFloat(m[1]); return pts.filter(p => Math.abs(p[0] - x) < 1e-9).length; }
    return null;
  };
})();
;'__duo ready';

// The Chrome `computer` tool works in SCREENSHOT space (1568 wide), while the
// page reports CSS pixels (innerWidth 1864 here). Emit both so the caller can
// drag with the right numbers — mixing the two silently misses every target.
window.__duo.toShot = function (xy) {
  const s = 1568 / window.innerWidth;
  return [Math.round(xy[0] * s), Math.round(xy[1] * s)];
};
(function () {
  const base = window.__duo.dotPlotDrags;
  window.__duo.dotPlotDrags = function () {
    const d = base.call(this); if (!d) return null;
    return d.map(g => ({ from: this.toShot(g.from), to: this.toShot(g.to), css: g }));
  };
})();
;'__duo ready';
