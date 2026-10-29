
// Graders return EITHER [ok, {value}] OR {isCorrect, feedback:{value}, displayAnswer:{value}}.
// One reader for both, and the typed/choice probes use it.
(function () {
  const D = window.__duo;
  D.gOk = r => Array.isArray(r) ? r[0] === true : !!(r && r.isCorrect === true);
  D.gText = r => {
    if (!r) return '';
    if (Array.isArray(r)) return (r[1] && (r[1].value || r[1])) ? String(r[1].value || r[1]) : '';
    return String((r.displayAnswer && r.displayAnswer.value) || (r.feedback && r.feedback.value) || '');
  };
  D.gAnswer = function (r) {
    const v = this.gText(r); if (!v) return null;
    const i = v.indexOf('mathbf{');
    if (i >= 0) { let d = 0, j = i + 6; for (; j < v.length; j++) { if (v[j] === '{') d++; else if (v[j] === '}' && --d === 0) break; } return v.slice(i + 7, j); }
    const m = v.match(/Correct Answer:\s*\}?\s*(.+)$/); return m ? m[1].trim() : v.trim();
  };
  D.graderText = function () {
    const grade = this.grader(); if (!grade) return null;
    let r = null; for (const p of [this.curBlob(), { keyboardInput: { value: '' } }, {}]) { try { r = grade(p); if (r) break; } catch (e) {} }
    return r ? this.gAnswer(r) : null;
  };
  D.solveTypeFill = function () {
    const b = this.curBlob(); if (!b || !b.grading_function) return null;
    if (!(b.layout === 'typeFill' || (b.pants && b.pants.type === 'keyboard'))) return null;
    const grade = this.grader(); if (!grade) return null;
    const probe = v => { try { return grade({ keyboardInput: { value: v } }); } catch (e) { return null; } };
    const a = this.gAnswer(probe('')); const cands = [];
    if (a !== null) { const s = a.replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, x, y) => String(+x / +y)).replace(/[−–]/g, '-').replace(/\\[a-zA-Z]+|[{}\s]/g, '');
      const n = parseFloat(s); if (isFinite(n)) cands.push(this.asFraction(n), String(n)); cands.push(s); }
    const sh = b.shirt && b.shirt.value && b.shirt.value.match(/duoblank\{([^}]*)\}/); if (sh) cands.push(sh[1].trim());
    for (const c of cands) if (this.gOk(probe(c))) return c;
    return null;
  };
})();
;'__duo ready';

// ---- interactive widgets whose output has null slots (table fills) ----
// {updated_rows:[[2,null],[4,null]]}: fill the nulls, in order, from the numbers
// after "=" in the display answer, then from all its numbers, then from
// permutations of the widget's token bank. The grader verifies every candidate.
(function () {
  const D = window.__duo;
  D.feedbackNums = function (grade, probe) {
    let r; try { r = grade(probe); } catch (e) { return { raw: '', nums: [], eq: [] }; }
    const v = this.gText(r);
    const s = v.replace(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/g, (_, a, b) => String(+a / +b)).replace(/[−–]/g, '-').replace(/\\[a-zA-Z]+/g, ' ');
    return { raw: s, nums: (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number),
      eq: [...s.matchAll(/=\s*(-?\d+(?:\.\d+)?)/g)].map(m => +m[1]) };
  };
  D.inputVars = function () {
    const b = this.curBlob(); const h = b && b.pants && b.pants.html; if (!h) return null;
    const m = h.match(/INPUT_VARIABLES\s*=\s*(\{[\s\S]*?\});/); if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  };
  const nullPaths = (o, p, out) => { if (Array.isArray(o)) o.forEach((v, i) => v === null ? out.push(p.concat(i)) : nullPaths(v, p.concat(i), out));
    else if (o && typeof o === 'object') for (const k in o) o[k] === null ? out.push(p.concat(k)) : nullPaths(o[k], p.concat(k), out); return out; };
  const fill = (cur, paths, vals) => { const c = JSON.parse(JSON.stringify(cur)); paths.forEach((p, i) => { let o = c; for (let j = 0; j < p.length - 1; j++) o = o[p[j]]; o[p[p.length - 1]] = vals[i]; }); return c; };
  const perms = (arr, k) => { const out = []; const go = (pre, rest) => { if (pre.length === k) { out.push(pre); return; } rest.forEach((v, i) => go(pre.concat(v), rest.slice(0, i).concat(rest.slice(i + 1)))); }; go([], arr); return out; };
  const base = D.interactiveCandidates;
  D.interactiveCandidates = function (cur, fb) {
    const out = base.call(this, cur, fb) || [];
    const paths = nullPaths(cur, [], []); if (!paths.length) return out;
    const n = paths.length;
    if (fb.eq && fb.eq.length >= n) out.push(fill(cur, paths, fb.eq.slice(0, n)));
    if (fb.nums && fb.nums.length >= n) { out.push(fill(cur, paths, fb.nums.slice(0, n))); out.push(fill(cur, paths, fb.nums.slice(-n))); }
    const iv = this.inputVars(); const toks = iv && Array.isArray(iv.tokens) ? iv.tokens.filter(t => typeof t === 'number') : [];
    if (toks.length && toks.length <= 8 && n <= toks.length) for (const p of perms(toks, n)) out.push(fill(cur, paths, p));
    return out;
  };
})();
;'__duo ready';

// ---- 2026-09-08: language courses ----
// Language challenges are not "blob" challenges: the fiber's `challenge` object
// IS the answer key (correctIndex / correctIndices / correctTokens /
// correctSolutions / pairs). Nothing to grade, just read and click. Word-bank
// tokens here are real <button>s, so native click works (unlike the Math bank).
// ponytail: no per-type classes — one field-driven dispatch. Unknown shape → hand back.
(function () {
  const D = window.__duo;
  D.chal = function () {
    const el = document.querySelector('[data-test^="challenge "]'); if (!el) return null;
    let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber$'))], d = 0;
    while (f && d++ < 12) { if (f.memoizedProps && f.memoizedProps.challenge) return f.memoizedProps.challenge; f = f.return; }
    return null;
  };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const tokText = e => { const s = e.querySelector('[data-test="challenge-tap-token-text"]'); return txt(s || e); };
  const choiceText = c => txt({ innerText: typeof c === 'string' ? c : (c.text || c.phrase || c.character || c.transliteration || '') });
  // ponytail: placed tokens live outside [data-test="word-bank"] and match the same
  // selector; clicking one un-places it. Scope to the bank when there is one
  // (translate/tapComplete); match-pairs has no bank, so fall back to the page.
  const bank = () => [...((document.querySelector('[data-test="word-bank"]') || document).querySelectorAll('[data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])'))]
    .filter(b => b.getAttribute('aria-disabled') !== 'true' && !b.disabled);

  D.solveLang = async function () {
    const c = this.chal(); if (!c || c.challengeBlob) return null;
    const dom = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const skip = document.querySelector('[data-test="player-skip"]');
    // listen / speak: never guess audio, take the skip Duolingo offers
    if (/^(listen|speak|selectPronunciation|listenComplete|listenSpeak)$/.test(c.type) && skip && !(c.correctTokens || []).length && typeof c.correctIndex !== 'number') { skip.click(); return 'skip:' + c.type; }  // ponytail: speak ships correctTokens:[] (truthy)
    if (Array.isArray(c.pairs) && c.pairs.length) {              // match the pairs
      const live = () => bank().filter(b => b.getAttribute('aria-disabled') !== 'true');
      for (const p of c.pairs) {
        const a = Object.values(p).filter(v => typeof v === 'string' && !/^https?:/.test(v)).map(s => s.toLowerCase());   // characterMatch uses character/transliteration
        const hit = live().filter(b => a.includes(tokText(b))).slice(0, 2);
        if (hit.length < 2) continue;                              // ponytail: never click a lone tile, it offsets every later pair
        for (const b of hit) { b.click(); await this.sleep(350); }
      }
      return live().length ? null : 'pairs';
    }
    const blank = Array.isArray(c.displayTokens) ? c.displayTokens.filter(t => t && t.isBlank).map(t => t.text).join('') : '';   // cloze: "Type the missing word"
    const ce = document.querySelector('[data-test^="challenge "] [contenteditable="true"]');
    if (ce && blank) {                                            // partialReverseTranslate: blank is a contenteditable span
      ce.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, blank);
      await this.sleep(200); return 'type:ce';
    }
    const input = document.querySelector('[data-test="challenge-text-input"], textarea[data-test="challenge-translate-input"]');
    const sol = (c.correctSolutions && c.correctSolutions[0]) || (c.correctTokens && c.correctTokens.join(' ')) || blank || null;
    if (input && sol) {
      Object.getOwnPropertyDescriptor(input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, sol);
      input.dispatchEvent(new Event('input', { bubbles: true })); return 'type';
    }
    if (Array.isArray(c.correctTokens) && bank().length) {        // word bank, in order
      const words = c.correctTokens.map(t => t.trim()).filter(t => /[\p{L}\p{N}]/u.test(t));   // ponytail: "¿" "," "?" are tokens but never tiles
      const have = words.every(t => bank().some(b => tokText(b) === t.toLowerCase()));
      const kb = document.querySelector('[data-test="player-toggle-keyboard"]') || [...document.querySelectorAll('button')].find(b => /USE KEYBOARD/i.test(b.innerText));
      if (!have && kb && sol) {                                    // a tile is missing: type the sentence instead
        kb.click(); await this.sleep(400);
        const ta = document.querySelector('textarea, [data-test="challenge-text-input"]'); if (!ta) return null;
        Object.getOwnPropertyDescriptor(ta.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(ta, sol);
        ta.dispatchEvent(new Event('input', { bubbles: true })); return 'type:kb';
      }
      for (const t of words) {
        const b = bank().find(b => tokText(b) === t.toLowerCase());
        if (!b) return null;                                       // token missing → hand back, no heart spent
        b.click(); await this.sleep(250);
      }
      return 'tokens';
    }
    if (Array.isArray(c.correctIndices) && c.correctIndices.length && !dom.length && bank().length) {   // tapComplete: fill blanks from the bank, in order
      for (const i of c.correctIndices) {
        const w = choiceText((c.choices || [])[i]); const b = bank().find(b => tokText(b) === w);
        if (!b) return null;
        b.click(); await this.sleep(250);
      }
      return 'tapIndices';
    }
    if (Array.isArray(c.correctIndices) && c.correctIndices.length && dom.length) {
      const want = c.correctIndices.map(i => choiceText((c.choices || [])[i]));
      const idx = dom.map((e, i) => [i, txt(e)]).filter(([, t]) => want.includes(t)).map(([i]) => i);
      (idx.length === want.length ? idx : c.correctIndices).forEach(i => dom[i] && dom[i].click()); return 'indices';
    }
    if (typeof c.correctIndex === 'number' && dom.length) {
      const w = choiceText((c.choices || [])[c.correctIndex]);
      const strip = e => txt(e).replace(/^\d+\s+/, '');                 // tiles read "1 ești"
      const i = dom.findIndex(e => strip(e) === w);                      // ponytail: no includes(): "e" matched "ești"
      dom[i >= 0 ? i : c.correctIndex].click(); return 'index';
    }
    return null;
  };

  // Try the language key first; Math (challengeBlob) and unknown shapes fall through.
  const base = D.solve;
  D.solve = async function () {
    const r = this.read();
    if (r.hearts === 0) return { stop: 'no hearts', r };
    if (r.blame && /CONTINUE/i.test(r.next || '')) { await this.go(); return { ok: true, was: r.type, next: this.read() }; }
    if (!r.type && /CONTINUE/i.test(r.next || '')) { await this.go(); await this.sleep(600); return { ok: true, was: 'interstitial', next: this.read() }; }  // ponytail: mid-lesson Duo animation, no challenge
    let via = null; try { via = await this.solveLang(); } catch (e) { via = null; }
    if (!via) return base.call(this);
    // study ledger: what was asked and what the answer was (private notebook, langBoot flushes it)
    try { const c = this.chal() || {}; const ans = (c.correctSolutions && c.correctSolutions[0]) || (c.correctTokens && c.correctTokens.filter(t => /[\p{L}\p{N}]/u.test(t)).join(' ')) ||
      (typeof c.correctIndex === 'number' && choiceText((c.choices || [])[c.correctIndex])) || (Array.isArray(c.correctIndices) && c.correctIndices.map(i => choiceText((c.choices || [])[i])).join(' ')) || '';
      (this.ledgerLang = this.ledgerLang || []).push({ at: new Date().toISOString(), type: c.type, prompt: c.prompt || r.prompt || '', answer: ans, via, href: location.pathname }); } catch (e) {}
    await this.sleep(300);
    const after = await this.go();
    if (after.blame === 'blame-incorrect') return { stop: 'wrong', via, r, after };
    if (after.next) await this.go();
    return { ok: true, was: r.type + ':' + via, next: this.read() };
  };
})();
;'__duo ready';

// ---- 2026-09-08: Duolingo chess ----
// The puzzle key ships on the fiber: chal().chessPuzzleInfo.correctMoves (UCI)
// and chal().fen (side to move = board orientation). The board is a Rive canvas:
// synthetic events do nothing, only real `computer` clicks move a piece, and the
// select→drop pair needs ~0.5s between clicks or the second one is swallowed.
// Board = canvas rect inset 9.75% left / 10% top, 80% wide. `computer` takes
// SCREENSHOT pixels (1568 wide), not CSS, so chessPlan() scales by 1568/innerWidth.
// ponytail: promotion picker is a canvas popup below the square, queen leftmost;
// offsets measured once at s=62.5px — recheck if the board size changes.
(function () {
  const D = window.__duo;
  D.chessBoard = function () { return [...document.querySelectorAll('[data-test^="challenge "] canvas')].sort((a, b) => b.width - a.width)[0] || null; };
  D.chessPlan = function (shotW = 1568) {
    const c = this.chal(); if (!c || !c.chessPuzzleInfo) return null;
    const cv = this.chessBoard(); if (!cv) return null;
    const r = cv.getBoundingClientRect(), k = shotW / innerWidth;
    const bx = r.left + r.width * 0.0975, by = r.top + r.height * 0.1, s = r.width * 0.8 / 8;
    const white = c.fen.split(' ')[1] === 'w';
    const sq = q => { let f = q.charCodeAt(0) - 97, rk = +q[1] - 1; if (!white) { f = 7 - f; rk = 7 - rk; }
      return [Math.round((bx + s * (f + 0.5)) * k), Math.round((by + s * (7 - rk + 0.5)) * k)]; };
    const moves = c.chessPuzzleInfo.correctMoves.flatMap(m => String(m).split(/\s+/)).filter(Boolean);   // "f1d3 f1e2" = two alternatives in one entry
    const clicks = moves.map(m => {
      const a = sq(m.slice(0, 2)), b = sq(m.slice(2, 4)), out = [a, b];
      // promotion: picker centred under the square, clamped 2.3 squares inside the
      // board's right edge; the queen is the leftmost icon, 1.45 squares left of centre
      // promotion picker: 4.5 squares wide, centred under the pawn but clamped inside the
      // board; the queen sits 0.8 squares in from the picker's left edge, 2.2 squares below
      if (m[4]) { const left = Math.max(bx, Math.min(b[0] / k - 2.25 * s, bx + 8 * s - 4.5 * s)); out.push([Math.round((left + 0.8 * s) * k), Math.round(b[1] + 2.2 * s * k)]); }
      return out;
    });
    return { white, moves, clicks };
  };
  // CONTINUE through the result screen and return the next puzzle's plan, or a
  // {noPuzzle} read of whatever else is on screen (choice question, /learn).
  D.chessNext = async function () {
    const n = document.querySelector('[data-test="player-next"]'); if (n) n.click();
    for (let i = 0; i < 30; i++) {
      await this.sleep(300);
      const c = this.chal(), nb = document.querySelector('[data-test="player-next"]');
      if (c && c.chessPuzzleInfo && !document.querySelector('[data-test^="blame"]')) return this.chessPlan();
      if (nb && /CONTINUE/i.test(nb.innerText) && !c) nb.click();
    }
    const r = this.read();
    return { noPuzzle: true, type: r.type, prompt: r.prompt, choices: r.choices, next: r.next, href: location.href,
      txt: (document.querySelector('[data-test^="challenge "]') || document.body).innerText.slice(0, 200) };
  };
})();
;'__duo ready';
