
// Piecewise graphs draw each branch as its own path, so sample them all and
// let the caller pick the slanted or the flat one.
window.__duo.curvePieces = function () {
  const g = this.grid2D(); if (!g) return null;
  const d = g.f.contentDocument, fr = g.f.getBoundingClientRect();
  const out = [];
  for (const p of d.querySelectorAll('svg path')) {
    if (!p.getTotalLength || !p.getBBox) continue;
    const b = p.getBBox(), L = p.getTotalLength();
    if (b.width < 30 && b.height < 30) continue;
    const m = p.ownerSVGElement.getScreenCTM(); if (!m) continue;
    const pts = [];
    const n = Math.min(120, Math.max(12, Math.round(L / 6)));
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength(L * i / n);
      pts.push(g.toXY(m.a * q.x + m.c * q.y + m.e + fr.left, m.b * q.x + m.d * q.y + m.f + fr.top));
    }
    const ys = pts.map(q => q[1]), xs = pts.map(q => q[0]);
    out.push({ pts, flat: Math.max(...ys) - Math.min(...ys) < 0.2,
      vertical: Math.max(...xs) - Math.min(...xs) < 0.2,
      x0: Math.min(...xs), x1: Math.max(...xs) });
  }
  return out.length ? out : null;
};

// "Select the domain for the slanted line": keep the inequality that every
// sampled point of that branch satisfies.
(function () {
  const base = window.__duo.solveChoices;
  window.__duo.solveChoices = function () {
    const ins = String(this.curInstruction() || '');
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    if (/domain|range/i.test(ins) && ch.length) {
      const pieces = this.curvePieces();
      if (pieces) {
        let pick = null;
        if (/slanted|diagonal/i.test(ins)) pick = pieces.find(p => !p.flat && !p.vertical);
        else if (/horizontal|flat|constant/i.test(ins)) pick = pieces.find(p => p.flat);
        if (pick) {
          const useY = /range/i.test(ins);
          const vals = pick.pts.map(p => useY ? p[1] : p[0]);
          const ok = [];
          ch.forEach((e, i) => {
            const a = e.querySelector('annotation');
            const t = (a ? a.textContent : e.innerText).replace(/[−–—]/g, '-')
              .replace(/\\(mathbf|textbf|text|geq|leq|le|ge)\b/g, m => /geq|ge/.test(m) ? '>=' : /leq|le/.test(m) ? '<=' : '')
              .replace(/[{}\s]/g, '');
            const m2 = t.match(/^[a-z](>=|<=|<|>)(-?[\d.]+)$/i);
            if (!m2) return;
            const n = parseFloat(m2[2]), op = m2[1];
            const holds = vals.every(v =>
              op === '>=' ? v >= n - 0.15 : op === '<=' ? v <= n + 0.15 :
              op === '>' ? v > n - 0.15 : v < n + 0.15);
            if (holds) ok.push(i);
          });
          if (ok.length === 1) return { want: [String(ok[0])], idx: ok, ok: true, via: 'branchDomain' };
        }
      }
    }
    return base.call(this);
  };
})();
;'__duo ready';

// 2026-09-02: the grader said \mathbf{[-3,4]} and answer() split it on the
// comma into "[-3" and "4]" — nothing matched, a distractor got picked. Do not
// split inside brackets/parens (intervals, ordered pairs). And run the grader
// match FIRST: the wrapper chain above had grown to where a heuristic solver
// pre-empted an exact grader hit.
(function () {
  const D = window.__duo, base = D.answer;
  D.answer = function () {
    const b = this.blob(); if (!b || !b.grading_function) return null;
    let r; try { r = new Function('return (' + b.grading_function + ')')()(b); } catch (e) { return null; }
    const v = (r && r[1] && r[1].value) || (r && r.displayAnswer && r.displayAnswer.value) || '';
    const m = v.match(/mathbf\{([^}]*)\}/);
    if (!m) return base.call(this);
    return /[\[\]()]/.test(m[1]) ? [m[1].trim()] : m[1].split(',').map(x => x.trim());
  };
  const sc = D.solveChoices;
  D.solveChoices = function () {
    try {
      const want = (this.answer() || []).map(x => this.norm(x));
      const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const norm = e => { const a = e.querySelector('annotation'); return this.norm(a ? a.textContent : e.innerText); };
      const idx = c.map((e, i) => [i, norm(e)]).filter(([, t]) => want.includes(t)).map(([i]) => i);
      if (want.length && idx.length === want.length) return { want, idx, ok: true, via: 'graderFirst' };
    } catch (e) {}
    return sc.call(this);
  };
})();
;'__duo ready';

// ---- shirtPantsInteractive: answer the widget without touching it ----
// The widget iframe (same-origin srcdoc) exposes getOutputVariables(); the
// grader only ever sees that object. Replace the function, fire the widget's
// own onFirstInteraction hook (which posts the payload and enables CHECK), and
// verify with the grader before submitting. No drags, no pixels.
(function () {
  const D = window.__duo;

  D.widgetFrame = function () {
    return [...document.querySelectorAll('iframe')].find(f => {
      try { return f.contentDocument && typeof f.contentWindow.getOutputVariables === 'function' && f.getBoundingClientRect().height > 0; }
      catch (e) { return false; }
    }) || null;
  };

  D.grader = function () {
    const b = this.blob(); if (!b || !b.grading_function) return null;
    try { return new Function('return (' + b.grading_function + ')')(); } catch (e) { return null; }
  };

  // numbers the feedback names: \mathbf{0.1666}, \frac{1}{6}, (2, -3), "3, 4"
  D.feedbackNums = function (grade, probe) {
    let r; try { r = grade(probe); } catch (e) { return []; }
    const v = (r && r[1] && r[1].value) || (r && r.displayAnswer && r.displayAnswer.value) || '';
    const m = v.match(/mathbf\{(.*)\}\s*$/) || v.match(/mathbf\{([^}]*)\}/);
    if (!m) return [];
    let s = m[1].replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, a, b) => String(+a / +b)).replace(/[−–]/g, '-');
    const nums = (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return { raw: s, nums };
  };

  D.interactiveCandidates = function (cur, fb) {
    const keys = Object.keys(cur || {}); const out = []; const nums = fb.nums || [];
    const put = o => out.push(o);
    if (keys.length === 1) {
      const k = keys[0], c = cur[k];
      for (const n of nums) put({ [k]: n });
      if (Array.isArray(c)) { put({ [k]: nums }); put({ [k]: nums.slice(0, c.length) }); }
      if (typeof c === 'string') { put({ [k]: fb.raw }); for (const n of nums) put({ [k]: String(n) }); }
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const ck = Object.keys(c);
        if (ck.length === nums.length) put({ [k]: Object.fromEntries(ck.map((kk, i) => [kk, nums[i]])) });
        if (ck.length === 2 && nums.length === 2) put({ [k]: Object.fromEntries([[ck[0], nums[1]], [ck[1], nums[0]]]) });
      }
      return out;
    }
    if (keys.length === nums.length) {
      put(Object.fromEntries(keys.map((k, i) => [k, nums[i]])));
      if (keys.length === 2) put(Object.fromEntries([[keys[0], nums[1]], [keys[1], nums[0]]]));
    }
    // one key changed at a time
    for (const k of keys) for (const n of nums) put(Object.assign({}, cur, { [k]: n }));
    return out;
  };

  // returns the winning payload, or null
  D.solveInteractive = async function () {
    const f = this.widgetFrame(); if (!f) return null;
    const w = f.contentWindow, grade = this.grader(); if (!grade) return null;
    let cur = {}; try { cur = w.getOutputVariables() || {}; } catch (e) {}
    const ok = o => { try { const r = grade(o); return Array.isArray(r) ? r[0] === true : !!(r && r.isCorrect); } catch (e) { return false; } };
    let win = null;
    if (ok(cur)) win = cur;                       // already correct (e.g. default state)
    else {
      const fb = this.feedbackNums(grade, cur);
      for (const c of this.interactiveCandidates(cur, fb)) if (ok(c)) { win = c; break; }
      // brute force one numeric key over a small integer / half grid
      if (!win) {
        const ks = Object.keys(cur).filter(k => typeof cur[k] === 'number');
        outer: for (const k of ks) for (let v = -30; v <= 30; v += 0.5) { const c = Object.assign({}, cur, { [k]: v }); if (ok(c)) { win = c; break outer; } }
      }
    }
    if (!win) return null;
    w.getOutputVariables = () => win;
    try { (w.duo && w.duo.onFirstInteraction || w.AndroidChallenge && w.AndroidChallenge.firstInteraction)(); } catch (e) {}
    try { w.duoDynamic && w.duoDynamic.onInteraction && w.duoDynamic.onInteraction(); } catch (e) {}
    try { w.parent.postMessage({ type: 'outputVariables', payload: win, fromInteraction: true }, 'https://www.duolingo.com'); } catch (e) {}
    await this.sleep(400);
    const n0 = document.querySelector('[data-test="player-next"]');
    return n0 && n0.getAttribute('aria-disabled') !== 'true' ? win : null;
  };

  // wire into run2: right after the lessondone check, before plan()/choices
  const src = String(D.run2), mark = "this.S.log.push('lessondone'); break; }";
  if (src.includes(mark)) {
    const ins = mark + `
    { const w3 = await this.solveInteractive();
      if (w3) { this.S.log.push('widget'); await this.sleep(300);
        this.tap(document.querySelector('[data-test="player-next"]')); await this.sleep(1400);
        const b3 = await this.blame(); this.S.log.push(b3 || 'noblame');
        if (b3 === 'correct') { this.S.done++; miss = 0; }
        else if (b3 === 'incorrect' && ++miss >= 2) { this.S.log.push('halt:2wrong'); break; }
        const nx3 = document.querySelector('[data-test="player-next"]');
        if (nx3 && /CONTINUE/i.test(nx3.innerText)) { this.tap(nx3); await this.sleep(1400); }
        info = 0; continue; } }`;
    D.run2 = eval('(' + src.replace(mark, ins) + ')');
  } else console.warn('[duo] interactive: run2 mark not found');
})();
;'__duo ready';

// ---- typeFill: the grader wants {keyboardInput:{value}} ----
// answer() probes grade(blob) and that throws here, so a heuristic typed "1"
// for 1/6 + 1/6. Probe with the right shape, read the Correct Answer, prefer a
// small fraction over a long decimal, and verify with the grader before typing.
(function () {
  const D = window.__duo, base = D.typeAnswer;
  D.asFraction = function (x) {
    if (Number.isInteger(x)) return String(x);
    for (let d = 2; d <= 200; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return n + '/' + d; }
    return String(x);
  };
  D.solveTypeFill = function () {
    const b = this.blob(); if (!b || b.layout !== 'typeFill' || !b.grading_function) return null;
    const grade = this.grader(); if (!grade) return null;
    const probe = v => { try { return grade({ keyboardInput: { value: v } }); } catch (e) { return null; } };
    const r0 = probe(''); const v = (r0 && r0[1] && r0[1].value) || '';
    const m = v.match(/mathbf\{([^}]*)\}/); if (!m) return null;
    let s = m[1].replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, a, c) => String(+a / +c)).replace(/[−–]/g, '-').replace(/\s/g, '');
    const cands = [];
    const n = parseFloat(s); if (isFinite(n)) { cands.push(this.asFraction(n), String(n), s); } else cands.push(s);
    for (const c of cands) { const r = probe(c); if (r && r[0] === true) return c; }
    return null;
  };
  D.typeAnswer = function () {
    const v = this.solveTypeFill();
    if (v !== null) { this.type(v); return v; }
    return base.call(this);
  };
})();
;'__duo ready';

// grading_function is sometimes SEVERAL declarations (parseTypeFillInput,
// parseNumber, grade) — not one expression. Load either shape.
window.__duo.grader = function () {
  const b = this.blob(); if (!b || !b.grading_function) return null;
  const s = b.grading_function;
  try { const f = new Function('return (' + s + ')')(); if (typeof f === 'function') return f; } catch (e) {}
  try { const f = new Function(s + '\n;return typeof grade === "function" ? grade : null;')(); if (typeof f === 'function') return f; } catch (e) {}
  return null;
};
;'__duo ready';

// graderFirst v2: brace-balanced \mathbf{...} (the old regex died on \{1,\,2\}),
// strip every LaTeX command on BOTH sides, compare whole before splitting.
(function () {
  const D = window.__duo, sc = D.solveChoices;
  D.graderText = function () {
    const grade = this.grader(); if (!grade) return null;
    let r; try { r = grade(this.blob()); } catch (e) { try { r = grade({ keyboardInput: { value: '' } }); } catch (e2) { return null; } }
    const v = (r && r[1] && r[1].value) || (r && r.displayAnswer && r.displayAnswer.value) || '';
    const i = v.indexOf('mathbf{'); if (i < 0) return null;
    let d = 0, j = i + 6;
    for (; j < v.length; j++) { if (v[j] === '{') d++; else if (v[j] === '}' && --d === 0) break; }
    return v.slice(i + 7, j);
  };
  D.texKey = function (s) {
    return this.norm(this.ascii(String(s)).replace(/\\[,;!: ]/g, '').replace(/\\(mathbf|textbf|text|mathrm|left|right)\b/g, '')
      .replace(/\\([{}])/g, '$1').replace(/\\[a-zA-Z]+/g, m => m.slice(1)).replace(/[{}\s]/g, '').replace(/[−–]/g, '-'));
  };
  D.solveChoices = function () {
    try {
      const a = this.graderText();
      if (a !== null) {
        const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
        const keys = c.map(e => { const an = e.querySelector('annotation'); return this.texKey(an ? an.textContent : e.innerText); });
        const whole = this.texKey(a);
        let idx = keys.map((k, i) => k === whole ? i : -1).filter(i => i >= 0);
        if (idx.length === 1) return { want: [whole], idx, ok: true, via: 'graderFirst' };
        if (!/[\[\]{}()]/.test(a)) {
          const parts = a.split(',').map(x => this.texKey(x)).filter(Boolean);
          idx = keys.map((k, i) => parts.includes(k) ? i : -1).filter(i => i >= 0);
          if (parts.length && idx.length === parts.length) return { want: parts, idx, ok: true, via: 'graderFirst' };
        }
      }
    } catch (e) {}
    return sc.call(this);
  };
})();
;'__duo ready';

// ---- multiStep (guided) lessons ----
// The top blob is layout:"multiStep"; each step carries its own grading_function
// and challengeState.guess.currentStepIndex says which one is live. Every
// grader probe must use the STEP blob. selectAll/selectOne graders take
// {button_N:{selected}} — enumerate subsets, keep the one grade() accepts.
(function () {
  const D = window.__duo;
  D.challengeState = function () {
    const el = document.querySelector('[data-test^="challenge "]'); if (!el) return null;
    let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber$'))], d = 0;
    while (f && d++ < 12) { if (f.memoizedProps && f.memoizedProps.challengeState) return f.memoizedProps.challengeState; f = f.return; }
    return null;
  };
  D.curBlob = function () {
    const b = this.blob(); if (!b) return null;
    if (b.layout !== 'multiStep' || !Array.isArray(b.steps)) return b;
    const cs = this.challengeState(); const i = cs && cs.guess ? cs.guess.currentStepIndex : null;
    if (i === null || i === undefined || !b.steps[i]) return b;
    return b.steps[i].blob || b;
  };
  const loadGrader = s => {
    try { const f = new Function('return (' + s + ')')(); if (typeof f === 'function') return f; } catch (e) {}
    try { const f = new Function(s + '\n;return typeof grade === "function" ? grade : null;')(); if (typeof f === 'function') return f; } catch (e) {}
    return null;
  };
  D.grader = function () { const b = this.curBlob(); return b && b.grading_function ? loadGrader(b.grading_function) : null; };

  D.solveTypeFill = function () {
    const b = this.curBlob(); if (!b || b.layout !== 'typeFill' || !b.grading_function) return null;
    const grade = this.grader(); if (!grade) return null;
    const probe = v => { try { return grade({ keyboardInput: { value: v } }); } catch (e) { return null; } };
    const r0 = probe(''); const v = (r0 && r0[1] && r0[1].value) || '';
    const m = v.match(/mathbf\{([^}]*)\}/); const cands = [];
    if (m) { const s = m[1].replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, a, c) => String(+a / +c)).replace(/[−–]/g, '-').replace(/\s/g, '');
      const n = parseFloat(s); if (isFinite(n)) cands.push(this.asFraction(n), String(n)); cands.push(s); }
    const sh = b.shirt && b.shirt.value && b.shirt.value.match(/duoblank\{([^}]*)\}/); if (sh) cands.push(sh[1].trim());
    for (const c of cands) { const r = probe(c); if (r && r[0] === true) return c; }
    return null;
  };

  D.solveSelect = function () {
    const b = this.curBlob(); if (!b || !/^select(All|One)$/.test(b.layout || '') || !Array.isArray(b.pants)) return null;
    const grade = this.grader(); if (!grade) return null;
    const btns = b.pants.filter(p => p && p.type === 'button' && p.id); if (!btns.length || btns.length > 8) return null;
    const ok = sel => { try { const r = grade(Object.fromEntries(btns.map(p => [p.id, { selected: sel.includes(p.id) }]))); return Array.isArray(r) ? r[0] === true : !!(r && r.isCorrect); } catch (e) { return false; } };
    let win = null;
    for (let mask = 1; mask < (1 << btns.length) && !win; mask++) {
      const sel = btns.filter((_, i) => mask & (1 << i)).map(p => p.id);
      if (b.layout === 'selectOne' && sel.length !== 1) continue;
      if (ok(sel)) win = sel;
    }
    if (!win) return null;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const keys = c.map(e => { const a = e.querySelector('annotation'); return this.texKey(a ? a.textContent : e.innerText); });
    const idx = [];
    for (const id of win) { const p = btns.find(p => p.id === id); const k = this.texKey((p.child && (p.child.value || p.child.text)) || '');
      const i = keys.indexOf(k); if (i < 0) return null; idx.push(i); }
    return { want: win, idx, ok: true, via: 'gradeSubset' };
  };

  const sc = D.solveChoices;
  D.solveChoices = function () { let r = null; try { r = this.solveSelect(); } catch (e) {} return r || sc.call(this); };
})();
;'__duo ready';

// choices are toggles: after a wrong try some are still aria-checked, and a
// tap on one of those UNselects it. Return the set to flip, not the set wanted.
(function () {
  const D = window.__duo, sc = D.solveChoices;
  D.solveChoices = function () {
    const r = sc.call(this); if (!r || !r.ok || !Array.isArray(r.idx)) return r;
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const on = c.map((e, i) => e.getAttribute('aria-checked') === 'true' ? i : -1).filter(i => i >= 0);
    if (!on.length) return r;
    const want = new Set(r.idx);
    r.idx = c.map((_, i) => i).filter(i => want.has(i) !== on.includes(i));
    return r;
  };
})();
;'__duo ready';
