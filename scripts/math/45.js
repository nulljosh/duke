
// The sector click radius was too small — the points landed on the spinner's
// hub instead of the wedges. Use ~0.65 of the radius, and find the wheel by its
// largest circular element.


// "favorable outcomes = 2, total outcomes = 6" — the probability is the ratio,
// stated in the prompt rather than read off a spinner.
window.__duo.statedOutcomes = function () {
  const t = this.mathParts().concat([this.curInstruction()]).join(' ').replace(/\s/g, '').toLowerCase();
  const f = t.match(/favorableoutcomes,?=,?(-?\d+(?:\.\d+)?)/);
  const n = t.match(/totaloutcomes,?=,?(-?\d+(?:\.\d+)?)/);
  return (f && n) ? [parseFloat(f[1]), parseFloat(n[1])] : null;
};


// The wheel's wedges are real elements (class "spinner-segment"), so click
// their own centroids instead of guessing a circle. Sample each path and
// average — for a wedge that point is inside the shape.
window.__duo.spinnerSegments = function () {
  const d = this.diagram(); if (!d) return null;
  const doc = d.f.contentDocument;
  const segs = [...doc.querySelectorAll('path,polygon')]
    .filter(e => /spinner-segment/i.test(e.getAttribute('class') || ''))
    .filter(e => !/pointer/i.test(e.getAttribute('class') || ''));
  if (!segs.length) return null;
  const fr = d.f.getBoundingClientRect();
  const out = [];
  const seen = new Set();
  for (const el of segs) {
    if (typeof el.getTotalLength !== 'function') continue;
    let L = 0; try { L = el.getTotalLength(); } catch (e) { continue; }
    if (!L) continue;
    const ctm = el.getScreenCTM(); if (!ctm) continue;
    const svg = el.ownerSVGElement;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      const q = el.getPointAtLength((i / 40) * L);
      const p = svg.createSVGPoint(); p.x = q.x; p.y = q.y;
      const t = p.matrixTransform(ctm);
      sx += t.x; sy += t.y; n++;
    }
    if (!n) continue;
    const pt = [Math.round(fr.left + sx / n), Math.round(fr.top + sy / n)];
    const key = pt[0] + ',' + pt[1];
    if (seen.has(key)) continue;             // border + fill duplicate each wedge
    seen.add(key);
    out.push({ el, css: pt, shot: this.toShot(pt) });
  }
  return out.length ? out : null;
};
(function () {
  const base = window.__duo.spinnerClickPoints;
  window.__duo.spinnerClickPoints = function () {
    const f = this.promptFraction(); if (!f) return base.call(this);
    const [a, b] = f;
    const segs = this.spinnerSegments();
    if (!segs || segs.length !== b) return base.call(this);
    return { need: a, of: b, points: segs.slice(0, a).map(s => s.shot) };
  };
})();
;'__duo ready';

// curInstruction returns the aligned math block here, so the "probability"
// wording in the title was missed and the raw favorable count got typed.


window.__duo.GLOSSARY.unshift(
  [/operation for independent events/i, ['multiply']],
  [/operation for mutually exclusive|operation for either.{0,10}or/i, ['add']],
  [/independent events.{0,30}probability/i, ['multiply']],
  [/probability of (both|all).{0,20}(events|happening)/i, ['multiply']],
  [/probability of (either|one or the other)/i, ['add']],
  [/certain event/i, ['1']],
  [/impossible event/i, ['0']],
  [/complement/i, ['subtract', '1minus']],
);
;'__duo ready';

// Compound probability: "AND"/"both"/"then" means multiply, "OR"/"either" means
// add. Choices are the two candidate expressions, so pick by the connective.
window.__duo.solveCompoundProbability = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  if (ch.length < 2) return null;
  const kinds = ch.map(e => {
    const t = this.plainMath(this.choiceLatex(e));
    if (/\+/.test(t)) return 'add';
    if (/cdot|times|\*/.test(t)) return 'mul';
    return null;
  });
  if (!kinds.includes('add') || !kinds.includes('mul')) return null;
  const full = this.promptLatex().map(l => this.ascii(l)).join(' ').toLowerCase()
    .replace(/\\[a-z]+/g, ' ');
  const wantMul = /\band\b|both|then|followed by|independent/.test(full);
  const wantAdd = /\bor\b|either/.test(full);
  if (wantMul === wantAdd) return null;
  const i = kinds.indexOf(wantMul ? 'mul' : 'add');
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveCompoundProbability', /probability/i]);
;'__duo ready';

// "Probability of spinning a 7 then 8": independent events multiply, so the
// answer is P(a) * P(b) computed from the spinner's sections.
window.__duo.compoundProbabilityValue = function () {
  const S = this.spinnerSections(); if (!S || !S.length) return null;
  const full = this.promptLatex().map(l => this.ascii(l)).join(' ')
    .replace(/\\[a-z]+/g, ' ').replace(/[{}]/g, ' ');
  const flat = full.toLowerCase();
  const mul = /\band\b|both|then|followed by/.test(flat);
  const add = /\bor\b|either/.test(flat);
  if (!mul && !add) return null;
  // the outcomes named in the prompt, in order
  const toks = (full.match(/[A-Za-z0-9]+/g) || []);
  const names = [];
  for (const t of toks) if (S.some(s => s.toLowerCase() === t.toLowerCase())) names.push(t);
  if (names.length < 2) return null;
  const p = x => S.filter(s => s.toLowerCase() === x.toLowerCase()).length / S.length;
  const v = mul ? p(names[0]) * p(names[1]) : p(names[0]) + p(names[1]);
  return isFinite(v) ? v : null;
};
(function () {
  const base = window.__duo.solveCompoundProbability;
  window.__duo.solveCompoundProbability = function () {
    const v = this.compoundProbabilityValue();
    if (v !== null) {
      const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
      const i = ch.findIndex(e => { const q = this.choiceValue(e); return q !== null && Math.abs(q - v) < 1e-9; });
      if (i >= 0) return { i };
    }
    return base.call(this);
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    if (/probability/i.test(this.promptLatex().join(' '))) {
      const v = this.compoundProbabilityValue();
      if (v !== null) {
        for (let d = 1; d <= 200; d++) { const n = v * d;
          if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d; }
      }
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// "P(A and B) = P(A)·P(B)" means INDEPENDENT; with ≠ it means dependent.
window.__duo.solveIndependence = function () {
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
  const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
  if (!words.some(w => /dependentevents|independentevents/.test(w))) return null;
  const raw = this.promptLatex().map(l => this.ascii(l)).join(' ');
  const neq = /\\neq|≠|\\ne\b/.test(raw);
  const want = neq ? 'dependentevents' : 'independentevents';
  const i = words.findIndex(w => w === want);
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveIndependence', /probability events|independent|dependent/i]);
;'__duo ready';

// The prompt can state the individual probabilities directly:
// "P(heart) = 1/4, P(club) = 1/4" — combine them by the connective.
window.__duo.statedProbabilities = function () {
  const out = [];
  for (const l of this.promptLatex()) {
    const raw = this.ascii(l);
    const re = /P\s*\(\s*\\?(?:textbf|text)?\s*\{?\s*([A-Za-z0-9 ]+?)\s*\}?\s*\)\s*(?:&)?\s*=\s*(\\frac\s*\{\s*-?\d+(?:\.\d+)?\s*\}\s*\{\s*-?\d+(?:\.\d+)?\s*\}|-?\d+(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(raw))) {
      const v = this.evalTrigExpr(m[2]);
      if (v !== null) out.push({ name: m[1].trim().toLowerCase(), v });
    }
  }
  return out.length ? out : null;
};


// products of two fractions can have a denominator up to b^2 (26*26 = 676), so
// the fraction search needs a wider range than 400
(function () {
  const asFraction = v => {
    for (let d = 1; d <= 2000; d++) {
      const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d;
    }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const P = this.statedProbabilities();
    if (P && P.length >= 2) {
      const flat = this.promptLatex().map(l => this.ascii(l)).join(' ')
        .replace(/\\[a-z]+/g, ' ').toLowerCase();
      const mul = /\band\b|both|then|followed by/.test(flat);
      const add = /\bor\b|either/.test(flat);
      if (mul !== add) {
        const v = mul ? P[0].v * P[1].v : P[0].v + P[1].v;
        const f = asFraction(v);
        if (f) return f;
        return Math.round(v * 10000) / 10000;
      }
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// "Event A: 2, 4, 6 — total outcomes: 6": the event is listed as a set, so its
// probability is the set's size over the total.
window.__duo.statedEventSet = function () {
  const lines = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/[{}~\\]/g, ' ').replace(/[−–—]/g, '-'));
  let members = null, total = null;
  for (const t of lines) {
    const e = t.match(/event\s*[A-Za-z]?\s*:?\s*([-\d,\s]+)$/i);
    if (e) { const v = (e[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number); if (v.length) members = v; }
    const n = t.match(/total\s*outcomes\s*:?\s*(-?\d+(?:\.\d+)?)/i);
    if (n) total = parseFloat(n[1]);
  }
  return (members && total) ? { members, total } : null;
};

// "event B = 5, 6 , total outcomes = 6" — one line, "=" not ":", and the two
// parts separated by a comma.
window.__duo.statedEventSet = function () {
  const text = this.promptLatex().map(l => this.ascii(l)
    .replace(/\\(mathbf|textbf|text|emphasis|left|right)\b/g, '')
    .replace(/[{}~\\]/g, ' ').replace(/[−–—]/g, '-')).join(' ');
  const n = text.match(/total\s*outcomes\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  if (!n) return null;
  const total = parseFloat(n[1]);
  const before = text.slice(0, n.index);
  const e = before.match(/event\s*[A-Za-z]?\s*[:=]\s*([-\d,\s]+)$/i);
  if (!e) return null;
  const members = (e[1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return members.length ? { members, total } : null;
};
;'__duo ready';

// curInstruction here IS the data line ("event b = 5,6, total outcomes = 6"),
// so matching /total/ on it fired the wrong branch. Use the title line.
window.__duo.promptTitle = function () {
  for (const l of this.promptLatex()) {
    const m = this.ascii(l).match(/\\textbf\{([^{}]*)\}/);
    if (m && /[a-z]{3}/i.test(m[1])) return m[1].toLowerCase();
  }
  return this.curInstruction().toLowerCase();
};
(function () {
  const asFraction = v => {
    for (let d = 1; d <= 2000; d++) { const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d; }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const E = this.statedEventSet();
    if (E) {
      const title = this.promptTitle();
      if (/how many|number of (favorable )?outcomes/.test(title)) return E.members.length;
      if (/total outcomes/.test(title)) return E.total;
      if (/probability/.test(title)) { const f = asFraction(E.members.length / E.total); if (f) return f; }
    }
    return bo.call(this);
  };
})();
;'__duo ready';

// Conditional probability: given P(A and B) and P(B), P(A|B) = P(A and B)/P(B).
// Also covers the "is P(A|B) == P(A)?" dependence check.
window.__duo.condProbParts = function () {
  const text = this.promptLatex().map(l => this.ascii(l)).join(' ');
  const grab = re => { const m = text.match(re); return m ? this.evalTrigExpr(m[1]) : null; };
  const joint = grab(/P\s*\(\s*A\s*(?:\\?(?:textbf|text)?\s*\{?\s*and\s*\}?)\s*B\s*\)\s*&?\s*=\s*(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}|-?[\d.]+)/i);
  const pb = grab(/P\s*\(\s*B\s*\)\s*&?\s*=\s*(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}|-?[\d.]+)/i);
  const pa = grab(/P\s*\(\s*A\s*\)\s*&?\s*=\s*(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}|-?[\d.]+)/i);
  return { joint, pa, pb };
};
(function () {
  const asFraction = v => {
    for (let d = 1; d <= 2000; d++) { const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d; }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const C = this.condProbParts();
    if (C.joint !== null && C.pb) {
      const title = this.promptTitle();
      if (/conditional|given|p\(a\s*\|/.test(title) || /conditional|given/.test(this.curInstruction())) {
        const f = asFraction(C.joint / C.pb); if (f) return f;
      }
    }
    return bo.call(this);
  };
  // "determine dependence": independent iff P(A and B) == P(A)*P(B)
  const bt = window.__duo.solveIndependence;
  window.__duo.solveIndependence = function () {
    const r = bt.call(this); if (r) return r;
    const C = this.condProbParts();
    if (C.joint === null || !C.pa || !C.pb) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const half = s => (s.length % 2 === 0 && s.slice(0, s.length / 2) === s.slice(s.length / 2)) ? s.slice(0, s.length / 2) : s;
    const words = ch.map(e => half(this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, '')));
    const indep = Math.abs(C.joint - C.pa * C.pb) < 1e-9;
    const i = words.findIndex(w => indep ? w === 'independentevents' || w === 'independent'
                                          : w === 'dependentevents' || w === 'dependent');
    return i < 0 ? null : { i };
  };
})();
;'__duo ready';

// The guided "determine dependence" lesson asks for P(A|B) as an intermediate
// step, so compute it whenever the joint and P(B) are both stated.
(function () {
  const asFraction = v => {
    for (let d = 1; d <= 2000; d++) { const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d; }
    return null;
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = bo.call(this);
    if (v !== null && v !== undefined) return v;
    const C = this.condProbParts();
    if (C.joint !== null && C.pb) { const f = asFraction(C.joint / C.pb); if (f) return f; }
    return v;
  };
})();
;'__duo ready';

// "Are events A and B independent?" answered as "Yes, because..." / "No,
// because...": independent iff P(A|B) == P(A), i.e. joint == P(A)*P(B).
window.__duo.solveIndependentYesNo = function () {
  if (!/independent/i.test(this.curInstruction())) return null;
  const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
  const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
  if (!words.some(w => w.startsWith('yes')) || !words.some(w => w.startsWith('no'))) return null;
  const C = this.condProbParts();
  let indep = null;
  if (C.joint !== null && C.pa && C.pb) indep = Math.abs(C.joint - C.pa * C.pb) < 1e-9;
  else if (C.joint !== null && C.pb && C.pa) indep = Math.abs(C.joint / C.pb - C.pa) < 1e-9;
  if (indep === null) {
    // the lesson's own steps: compare the P(A|B) it just accepted with P(A)
    const t = document.body.innerText.replace(/\s+/g, ' ');
    const cond = t.match(/P\s*\(\s*A\s*\|\s*B\s*\)[^\d]{0,20}(\d+)\s*\/?\s*(\d+)?/i);
    const pa = t.match(/P\s*\(\s*A\s*\)[^\d]{0,20}(\d+)\s*\/?\s*(\d+)?/i);
    if (cond && pa) {
      const c = parseFloat(cond[1]) / (cond[2] ? parseFloat(cond[2]) : 1);
      const a = parseFloat(pa[1]) / (pa[2] ? parseFloat(pa[2]) : 1);
      indep = Math.abs(c - a) < 1e-9;
    }
  }
  if (indep === null) return null;
  const i = words.findIndex(w => indep ? w.startsWith('yes') : w.startsWith('no'));
  return i < 0 ? null : { i };
};
window.__duo.RULES.unshift(['solveIndependentYesNo', /independent/i]);
;'__duo ready';

// In the guided dependence lesson the values are established step by step and
// shown on the page as accepted answers ("1/2", "1/3", ...). Read those rather
// than re-deriving, then compare P(A|B) with P(A).
window.__duo.lessonStepValues = function () {
  const t = document.body.innerText.replace(/\s+/g, ' ');
  const grab = label => {
    const re = new RegExp(label + '[^]{0,80}?(\\d+)\\s*/\\s*(\\d+)', 'i');
    const m = t.match(re);
    return m ? parseFloat(m[1]) / parseFloat(m[2]) : null;
  };
  return {
    pa: grab('find P\\(A\\)'),
    pb: grab('find P\\(B\\)'),
    joint: grab('find P\\(A and B\\)'),
    cond: grab('P\\(A\\s*\\|\\s*B\\)\\s*=')
  };
};
(function () {
  const base = window.__duo.solveIndependentYesNo;
  window.__duo.solveIndependentYesNo = function () {
    const r = base.call(this); if (r) return r;
    if (!/independent/i.test(this.curInstruction())) return null;
    const ch = [...document.querySelectorAll('[data-test="challenge-choice"]')];
    const words = ch.map(e => this.ascii(e.innerText).toLowerCase().replace(/[^a-z]/g, ''));
    if (!words.some(w => w.startsWith('yes')) || !words.some(w => w.startsWith('no'))) return null;
    const V = this.lessonStepValues();
    let indep = null;
    if (V.pa !== null && V.pb !== null && V.joint !== null)
      indep = Math.abs(V.joint - V.pa * V.pb) < 1e-9;
    else if (V.pa !== null && V.cond !== null)
      indep = Math.abs(V.cond - V.pa) < 1e-9;
    if (indep === null) return null;
    const i = words.findIndex(w => indep ? w.startsWith('yes') : w.startsWith('no'));
    return i < 0 ? null : { i };
  };
  const bo = window.__duo.solveOutputAt;
  window.__duo.solveOutputAt = function () {
    const v = bo.call(this); if (v !== null && v !== undefined) return v;
    const ins = this.curInstruction().toLowerCase();
    const V = this.lessonStepValues();
    const asFraction = x => { for (let d = 1; d <= 2000; d++) { const n = x * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) return (d === 1) ? String(Math.round(n)) : Math.round(n) + '/' + d; } return null; };
    if (/conditional|p\(a\s*\|/.test(ins) && V.joint !== null && V.pb) return asFraction(V.joint / V.pb);
    return v;
  };
})();
;'__duo ready';

// MathML renders a fraction as separated digits ("1 3" for 1/3), so the "a/b"
// regex found nothing. Accept both forms.
window.__duo.lessonStepValues = function () {
  const t = document.body.innerText.replace(/\s+/g, ' ');
  const grab = label => {
    let m = t.match(new RegExp(label + '[^]{0,90}?(\\d+)\\s*/\\s*(\\d+)', 'i'));
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    m = t.match(new RegExp(label + '[^]{0,90}?\\b(\\d+)\\s+(\\d+)\\b', 'i'));
    if (m) { const a = parseFloat(m[1]), b = parseFloat(m[2]);
      if (b && a <= b) return a / b; }
    return null;
  };
  return {
    pa: grab('find P\\(A\\)'),
    pb: grab('find P\\(B\\)'),
    joint: grab('find P\\(A and B\\)'),
    cond: grab('P\\(A\\s*\\|\\s*B\\)\\s*=')
  };
};
;'__duo ready';
