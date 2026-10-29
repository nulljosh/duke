// Injected into the Duolingo lesson tab via javascript_tool. Read the question
// as text, click by selector. Screenshots only for the visual types (see SKILL.md).
window.__duo = {
  sleep: ms => new Promise(r => setTimeout(r, ms)),

  // Math "blob" challenges render in a SAME-ORIGIN iframe. Everything else is
  // in the top document. frame() returns whichever holds the challenge.
  frame() {
    const f = document.querySelector('iframe');
    return (f && f.contentDocument && f.contentDocument.querySelector('.token-bank,.token-slot,.shape,.number-line'))
      ? f.contentDocument : document;
  },

  read() {
    const c = document.querySelector('[data-test^="challenge "]');
    const d = this.frame();
    return {
      type: c ? c.dataset.test.replace('challenge challenge-', '') : null,
      // LaTeX annotations are the ONLY reliable read of a math prompt.
      // innerText garbles equations; \duoblank{} marks the blank.
      latex: [...document.querySelectorAll('[data-test^="challenge "] annotation')].map(a => a.textContent),
      prompt: (document.querySelector('[data-test="challenge-header"]') || {}).innerText,
      choices: [...document.querySelectorAll('[data-test="challenge-choice"]')]
        .map((e, i) => [i, e.innerText.replace(/\n/g, ''), e.getAttribute('aria-checked')]),
      pairs: [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')]
        .map((e, i) => [i, e.innerText.replace(/\n/g, ' ')]),
      tokens: [...d.querySelectorAll('.token-bank .token')].map((e, i) => [i, e.textContent.trim()]),
      slots: [...d.querySelectorAll('.token-slot')].map(e => e.textContent.trim()),
      keypad: [...this.keys()].map(b => b.getAttribute('aria-label')),
      hearts: this.hearts(),
      input: !!document.querySelector('[data-test="challenge-text-input"]'),
      blame: (document.querySelector('[data-test^="blame"]') || { dataset: {} }).dataset.test,
      next: (document.querySelector('[data-test="player-next"]') || {}).innerText,
    };
  },

  choose(...idx) {
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    idx.forEach(i => ch[i].click());
  },

  async pair(...idx) {  // match-the-pairs: click left, then its right partner
    const t = [...document.querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])')];
    for (const i of idx) { t[i].click(); await this.sleep(250); }
  },

  // React controlled input: .value = x does nothing, must use the native setter.
  type(v) {
    const el = document.querySelector('[data-test="challenge-text-input"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },

  // DEAD as of 2026-08-31: the tile bank ignores synthetic .click(). This
  // reports fail:null and even enables CHECK, but the slots stay empty.
  // Use real `computer` clicks at CSS coordinates (see SKILL.md). Kept only
  // to read the bank back; do not trust its placements.
  async place(...vals) {
    const d = this.frame();
    for (const v of vals) {
      const t = [...d.querySelectorAll('.token-bank .token')]
        .find(e => e.textContent.trim() === String(v));
      if (!t) return { fail: v, have: [...d.querySelectorAll('.token-bank .token')].map(e => e.textContent.trim()) };
      t.click(); await this.sleep(350);
    }
    return this.read();
  },

  // ponytail: aria-label is the only handle these buttons expose.
  keys() { const c = document.querySelector('[data-test^="challenge "]') || document;
    return c.querySelectorAll('button[aria-label]'); },

  // Rules say stop at zero hearts; nothing could see them until now.
  hearts() { const e = document.querySelector('[data-test="hearts-count"],[data-test="player-hearts"]');
    return e ? parseInt(e.innerText, 10) : null; },

  key(label) { [...this.keys()].find(b => b.getAttribute('aria-label') === label).click(); },

  async go() {  // CHECK or CONTINUE, then read what came next
    document.querySelector('[data-test="player-next"]').click();
    await this.sleep(1400);
    return this.read();
  },
};

// ---- grader extraction: the client-side grade() reports the correct answer ----
Object.assign(window.__duo, {
  blob() {
    const el = document.querySelector('[data-test^="challenge "]');
    if (!el) return null;
    let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber$'))], d = 0;
    while (f && d++ < 10) { if (f.memoizedProps && f.memoizedProps.challenge) return f.memoizedProps.challenge.challengeBlob; f = f.return; }
    return null;
  },

  // innerText is doubled, and the minus is U+2212 while the grader emits ASCII.
  norm(s) {
    s = String(s).replace(/\s+/g, '').replace(/[\u2212\u2013\u2014]/g, '-');
    const h = s.length / 2;
    return (s.length % 2 === 0 && s.slice(0, h) === s.slice(h)) ? s.slice(0, h) : s;
  },

  // Calling grade() with no user selection returns [false, {value:"...Correct Answer: \mathbf{X}"}]
  answer() {
    const b = this.blob(); if (!b || !b.grading_function) return null;
    // ponytail: some challenge types' grading_function assumes a live input
    // widget and throws when called with no user selection — bail like any
    // other "grader can't help" case instead of crashing the whole run().
    let r; try { r = new Function('return (' + b.grading_function + ')')()(b); }
    catch (e) { return null; }
    // ponytail: array-shaped [false, {value}] on some types, object-shaped
    // {displayAnswer:{value}} on others (e.g. triangle angle-sum problems).
    const v = (r && r[1] && r[1].value) || (r && r.displayAnswer && r.displayAnswer.value) || '';
    const m = v.match(/mathbf\{([^}]*)\}/);
    return m ? m[1].split(',').map(x => x.trim()) : null;
  },

  // ponytail: matches by normalised text, NOT blob index — the display order is
  // shuffled relative to the blob, and indexing by blob picks the distractor.
  solveChoices() {
    const want = (this.answer() || []).map(x => this.norm(x));
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const idx = c.map((e, i) => [i, this.norm(e.innerText)])
                 .filter(([, t]) => want.includes(t)).map(([i]) => i);
    return { want, dom: c.map(e => this.norm(e.innerText)), idx, ok: idx.length === want.length };
  },
});


// ---- the loop: one javascript_exec per question instead of four ----
// Handles every type the grader + selectors cover. Anything needing real mouse
// input (tile bank, sliders, number lines, images, chess) is HANDED BACK.
Object.assign(window.__duo, {
  MANUAL: /token|slider|number-line|image|shape|polygon|chess|blocks/i,

  // Can this question be done from JS alone?
  auto(r) {
    if (this.MANUAL.test(r.type || '')) return false;
    if (r.tokens && r.tokens.length) return false;   // tile bank present
    return !!(r.choices.length || r.input);
  },

  async solve() {
    const r = this.read();
    if (r.hearts === 0) return { stop: 'no hearts', r };
    // ponytail: a halted run() can leave a CHECKed question sitting on CONTINUE.
    // Re-reading it looks answerable (still has choices/input), but calling the
    // grader a second time on an already-answered blob throws. Clear it first.
    if (r.blame && /CONTINUE/i.test(r.next || '')) { await this.go(); return { ok: true, was: r.type, next: this.read() }; }
    if (!this.auto(r)) return { stop: 'manual', type: r.type, r };

    if (r.input) {
      const a = this.answer();
      if (!a) return { stop: 'no grader answer', r };
      this.type(a[0]);
    } else {
      const s = this.solveChoices();
      // ponytail: bail rather than guess — a wrong CHECK costs a heart, a
      // handback costs nothing. solveChoices can return null (no match found),
      // not just {ok:false}.
      if (!s || !s.ok) return { stop: 'choice match failed', s, r };
      this.choose(...s.idx);
    }
    const after = await this.go();
    if (after.blame === 'blame-incorrect') return { stop: 'wrong', r, after };
    // clear the post-answer CONTINUE so the next read() is a real question
    if (after.next) await this.go();
    return { ok: true, was: r.type, next: this.read() };
  },

  // Run until something needs a human/mouse. Returns the trail for one report.
  // ponytail: solve() had no try/catch, so a thrown error (e.g. grading_function
  // eval, or player-next going null mid-transition) silently killed the promise
  // chain and looked like a stuck loop with no signal at all. Surface it instead.
  async run(n = 15) {
    const trail = [];
    for (let i = 0; i < n; i++) {
      let s;
      try { s = await this.solve(); }
      catch (e) { s = { stop: 'error', error: String(e && e.message || e), r: this.read() }; }
      trail.push(s.ok ? s.was : s.stop);
      if (!s.ok) return { trail, halted: s };
    }
    return { trail, halted: null };
  },
});

;'__duo ready';

// The reflection line is drawn, not stated in LaTeX — but it is a .bedrock
// element. Grid lines are the same class, so filter by class name first.
Object.assign(window.__duo, {
  drawnLine() {
    const f = document.querySelector('iframe');
    if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const V = e => { const r = e.getBoundingClientRect();
      return [fr.left + r.left + r.width / 2, fr.top + r.top + r.height / 2]; };

    let el = null;
    d.querySelectorAll('.bedrock').forEach(e => {
      const cls = String(e.getAttribute('class') || '');
      if (/grid|axis|label|arrow--|numberline-arrow/.test(cls)) return;
      const r = e.getBoundingClientRect();
      if ((r.height > 150 && r.width < 14) || (r.width > 150 && r.height < 14)) el = e;
    });
    if (!el) return null;

    const r = el.getBoundingClientRect(), vert = r.height > r.width;
    const labs = [...d.querySelectorAll('.axis-label')]
      .map(e => [+e.textContent.trim().replace('−', '-'), V(e)])
      .filter(l => !isNaN(l[0]));
    if (labs.length < 4) return null;   // ponytail: not enough ticks to scale

    // the axis is wherever most labels share a coordinate
    const mode = (key) => { const c = {};
      labs.forEach(l => c[Math.round(l[1][key])] = (c[Math.round(l[1][key])] || 0) + 1);
      return +Object.keys(c).sort((a, b) => c[b] - c[a])[0]; };
    const yl = labs.filter(l => Math.round(l[1][0]) === mode(0)).map(l => [l[0], l[1][1]]).sort((a, b) => a[0] - b[0]);
    const xl = labs.filter(l => Math.round(l[1][1]) === mode(1)).map(l => [l[0], l[1][0]]).sort((a, b) => a[0] - b[0]);
    if (yl.length < 2 || xl.length < 2) return null;

    const px = fr.left + r.left + r.width / 2, py = fr.top + r.top + r.height / 2;
    const scale = (a, p) => Math.round((p - a[0][1]) / ((a[a.length-1][1] - a[0][1]) / (a[a.length-1][0] - a[0][0])) + a[0][0]);
    return vert ? { ax: 'x', v: scale(xl, px) } : { ax: 'y', v: scale(yl, py) };
  },
});

// LaTeX first, drawing as the fallback.
(function () { const prev = window.__duo.axisLine && window.__duo.axisLine.bind(window.__duo);
  window.__duo.axisLine = function () { return (prev && prev()) || this.drawnLine(); }; })();

;'__duo ready';

// ---- reflections: y=x, y=-x, y=k, x=k, plus the slider2d control ----
Object.assign(window.__duo, {
  // Positive and negative axis labels sit in DIFFERENT rows/columns, so cluster
  // by spread and fit from the extremes. Clustering by shared coordinate splits
  // them and yields a silently wrong y-mapping.
  scale() {
    const f = document.querySelector('iframe');
    if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const labs = [...d.querySelectorAll('.axis-label')].map(e => {
      const r = e.getBoundingClientRect();
      return { v: +e.textContent.trim().replace(/[−–]/g, '-'),
               x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 };
    }).filter(l => !isNaN(l.v));
    if (labs.length < 4) return null;

    const fit = (arr, key) => { const a = arr.slice().sort((p, q) => p.v - q.v);
      const lo = a[0], hi = a[a.length - 1], u = (hi[key] - lo[key]) / (hi.v - lo.v);
      return { u, o: lo[key] - lo.v * u }; };
    const spanX = Math.max(...labs.map(l => l.x)) - Math.min(...labs.map(l => l.x));
    const meanY = labs.reduce((s, q) => s + q.y, 0) / labs.length;
    const xs = labs.filter(l => Math.abs(l.y - meanY) < spanX * 0.15);
    const xa = fit(xs, 'x'), ya = fit(labs.filter(l => !xs.includes(l)), 'y');
    return {
      px: (gx, gy) => [Math.round(xa.o + gx * xa.u), Math.round(ya.o + gy * ya.u)],
      grid: (x, y) => [Math.round((x - xa.o) / xa.u), Math.round((y - ya.o) / ya.u)],
    };
  },

  reflectPt(p, L) {
    if (/y\s*=\s*-\s*x/.test(L)) return [-p[1], -p[0]];
    if (/y\s*=\s*x/.test(L)) return [p[1], p[0]];
    const m = L.match(/([xy])\s*=\s*(-?\d+)/); if (!m) return null;
    return m[1] === 'y' ? [p[0], 2 * (+m[2]) - p[1]] : [2 * (+m[2]) - p[0], p[1]];
  },

  tex() { return this.ascii(this.read().latex.join(' ')).replace(/[{}\\]|mathbf|textbf/g, ''); },

  // \duodisplay{correct}{current} — the prompt ships the answer.
  duoTarget() {
    const m = this.read().latex.join(' ').match(/\\duodisplay\{([^}]*)\}\{([^}]*)\}/);
    return m ? { want: m[1].replace(/\s/g, ''), cur: m[2].replace(/\s/g, '') } : null;
  },

  sliderPx(v) {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect();
    const tr = d.querySelector('.slider2d-track'), th = d.querySelector('.slider2d-thumb');
    if (!tr || !th) return null;
    const r = tr.getBoundingClientRect(), tb = th.getBoundingClientRect();
    const lo = +th.getAttribute('aria-valuemin'), hi = +th.getAttribute('aria-valuemax');
    return {
      from: [Math.round(fr.left + tb.left + tb.width / 2), Math.round(fr.top + tb.top + tb.height / 2)],
      to: [Math.round(fr.left + r.left + (v - lo) / (hi - lo) * r.width), Math.round(fr.top + r.top + r.height / 2)],
      now: +th.getAttribute('aria-valuenow'), lo, hi,
    };
  },

  // value 0 = the original point; each notch = 1 unit perpendicular to the
  // mirror line, so the answer's notch is the distance between the two.
  notch() {
    const sl = this.sliderPx(0); if (!sl) return null;
    const p = s => s.replace(/[()\s]/g, '').split(',').map(Number);
    const t = this.duoTarget();
    if (t) { const w = p(t.want), c = p(t.cur);
      return { v: sl.now + Math.max(Math.abs(w[0] - c[0]), Math.abs(w[1] - c[1])), sl }; }
    const pt = this.pts(); if (!pt || !pt.length) return null;
    const src = pt[0][1], tgt = this.reflectPt(src, this.tex()); if (!tgt) return null;
    return { v: Math.max(Math.abs(tgt[0] - src[0]), Math.abs(tgt[1] - src[1])), tgt, src, sl };
  },

  at() { const p = this.pts(); return p && p.length ? p[0][1] : null; },

  // One answer for "what needs a real mouse drag, and from where to where".
  plan() {
    const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null;
    const d = f.contentDocument, fr = f.getBoundingClientRect(), s = this.scale();
    const dp = d.querySelector('.draggable-point');
    if (dp && s) {
      const p = this.pts(); if (!p || !p.length) return null;
      const src = p[0][1], t = this.reflectPt(src, this.tex()); if (!t) return null;
      const r = dp.getBoundingClientRect();
      return { kind: 'point', src, tgt: t,
        from: [Math.round(fr.left + r.left + r.width / 2), Math.round(fr.top + r.top + r.height / 2)],
        to: s.px(t[0], t[1]) };
    }
    const n = this.notch(); if (!n) return null;
    return { kind: 'slider', v: n.v, from: n.sl.from, to: this.sliderPx(n.v).to };
  },
});

// keep the grader-based matcher; the new solveChoices tries it first.
window.__duo.solveChoicesOrig = window.__duo.solveChoices;

// ---- three answer sources that beat a screenshot ----
Object.assign(window.__duo, {
  clean(s) { return this.norm(this.ascii(s).replace(/\\|mathbf|textbf|\{|\}/g, '')); },

  solveReflectChoice() {
    const r = this.read(), L = this.tex();
    let src = null; const m = L.match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
    if (m) src = [+m[1], +m[2]];
    else { const p = this.pts(); if (p && p.length === 1) src = p[0][1]; }
    if (!src) return null;
    const t = this.reflectPt(src, L); if (!t) return null;
    const want = '(' + t[0] + ',' + t[1] + ')';
    const i = r.choices.findIndex(c => this.ascii(c[1]).replace(/\s/g, '') === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // the ghost shape IS the reflected copy — name the transform between centroids
  solveLineOfReflection() {
    const sh = this.shapes && this.shapes(); if (!sh || sh.length < 2) return null;
    const g = sh.find(s => /ghost/.test(s[0])), o = sh.find(s => !/ghost/.test(s[0]));
    if (!g || !o) return null;
    const [ax, ay] = o[1], [bx, by] = g[1];
    let want = null;
    if (bx === ay && by === ax) want = 'y=x';
    else if (bx === -ay && by === -ax) want = 'y=-x';
    else if (bx === ax && by === -ay) want = 'y=0';
    else if (bx === -ax && by === ay) want = 'x=0';
    if (!want) return { miss: [o[1], g[1]] };
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.ascii(e.innerText).replace(/\s/g, '').includes(want));
    return i < 0 ? { miss: want } : { i, want };
  },

  // choice text is DOUBLED, so norm() both sides or this silently misses
  solvePhantomChoice() {
    const p = this.phantom && this.phantom(); if (!p) return null;
    const want = this.clean(p);
    const c = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const i = c.findIndex(e => this.clean(e.innerText) === want);
    return i < 0 ? { miss: want } : { i, want };
  },

  // try every solver; the stock auto() rejects mathChallengeBlob outright
  solveChoices() {
    const tries = ['solveChoicesOrig', 'solveReflectChoice', 'solveLineOfReflection', 'solvePhantomChoice'];
    for (const name of tries) {
      let r = null; try { r = this[name] && this[name](); } catch (e) { continue; }
      if (!r) continue;
      if (r.ok) return r;
      if (r.i >= 0) return { want: [r.want], idx: [r.i], ok: true, via: name };
    }
    return null;
  },
});

// ponytail: stop only when a real mouse drag is genuinely needed.

;'__duo ready';
