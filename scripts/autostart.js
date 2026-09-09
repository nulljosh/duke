// Injected by ext.js after duo.js on every duolingo.com page load. Picks the
// loop from localStorage.duoCourse so a hard reload (course rotation, crash,
// Chrome restart) restarts the farm with no operator.
(async () => {
  const k = localStorage.duoCourse; if (!k || !window.__duo) return;
  const f = k === 'math' ? 'boot.js' : /^(chess|music)$/.test(k) ? null : 'langBoot.js';
  if (!f) return;
  try { (0, eval)(await (await fetch('http://127.0.0.1:8777/' + f, { cache: 'no-store' })).text()); }   // serve.py copy is freshest
  catch (e) { const s = document.createElement('script'); s.src = chrome?.runtime?.getURL ? chrome.runtime.getURL(f) : f; document.head.appendChild(s); }
})();
