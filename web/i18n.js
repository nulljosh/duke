// cruise i18n runtime (vanilla, no framework). Loads generated locale JSON,
// swaps [data-i18n] text, exposes t(key, vars) for dynamic strings.
// Mirrors quotestreak/i18n.js — same convention, same fallback behaviour.
(function () {
  const SUPPORTED = ["en", "fr", "es", "zh", "pa"];
  const FALLBACK = "en";
  // ?lang= wins over the stored choice, which wins over the browser's — so a
  // link can carry a language (and so the translations are actually testable).
  const queried = new URLSearchParams(location.search).get("lang");
  const stored = localStorage.getItem("cruise.lang");
  const detected = (navigator.language || "en").slice(0, 2);
  const lang = SUPPORTED.includes(queried) ? queried
    : SUPPORTED.includes(stored) ? stored
    : SUPPORTED.includes(detected) ? detected
    : FALLBACK;

  let dict = {};
  let fallbackDict = {};

  async function loadDict(lng) {
    const r = await fetch(`locales/${lng}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(`locale ${lng} ${r.status}`);
    return r.json();
  }

  function t(key, vars) {
    let s = dict[key] ?? fallbackDict[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      // A missing key makes t() return the key itself; keep the inline English
      // copy rather than printing the key. This is what lets the long-form
      // landing prose stay untranslated without looking broken.
      const key = el.getAttribute("data-i18n");
      const value = t(key);
      if (value !== key) el.textContent = value;
    });
    document.documentElement.lang = lang;
  }

  const ready = (async () => {
    fallbackDict = await loadDict(FALLBACK);
    dict = lang === FALLBACK ? fallbackDict : await loadDict(lang).catch(() => fallbackDict);
    apply();
  })();

  window.I18N = { t, ready, lang, supported: SUPPORTED, set: (l) => { localStorage.setItem("cruise.lang", l); location.reload(); } };
})();
