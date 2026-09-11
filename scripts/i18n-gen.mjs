#!/usr/bin/env node
// i18n-gen: master i18n/strings.json -> web/locales/*.json + app/App/Localizable.xcstrings.
// Mirrors quotestreak/scripts/i18n-gen.mjs; only the output paths differ (this repo
// serves the landing from web/ and the native apps from app/App/).
// Never hand-edit the generated files — edit i18n/strings.json and re-run.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(readFileSync(resolve(root, "i18n/strings.json"), "utf8"));
const { sourceLanguage, locales } = src._meta;
const keys = Object.keys(src).filter((k) => k !== "_meta");

const outDir = resolve(root, "web/locales");
mkdirSync(outDir, { recursive: true });
for (const lng of locales) {
  const out = {};
  for (const k of keys) {
    const v = src[k][lng];
    if (lng === sourceLanguage || (v && v.length)) out[k] = v || src[k][sourceLanguage];
  }
  writeFileSync(resolve(outDir, `${lng}.json`), JSON.stringify(out, null, 2) + "\n");
}

const translated = (lng) => keys.filter((k) => lng === sourceLanguage || (src[k][lng] && src[k][lng].length)).length;
console.log(`i18n-gen: ${keys.length} keys -> web/locales/*.json`);
for (const lng of locales) console.log(`  ${lng}: ${translated(lng)}/${keys.length} translated`);

// Native String Catalog. SwiftUI's key for `Text("\(n) puzzles")` is "%lld puzzles",
// so the web's {n}/{s} tokens are rewritten to the printf specifiers Swift generates.
const swiftKey = (k) => k.replace(/\{n\d*\}/g, "%lld").replace(/\{s\d*\}/g, "%@");
// A translation may legitimately reorder arguments (Punjabi puts the course name
// before the duration where English puts it after). Plain %@/%lld is positional,
// so a reordered translation would print the wrong value in the wrong slot.
// Numbering each token by its position in the ENGLISH key makes order irrelevant:
// the token NAME carries the meaning, and %2$@ fetches the right argument wherever
// it lands. Keys stay unnumbered, because that's what Swift generates at the call site.
const swiftValue = (english, translated) => {
  const order = [...english.matchAll(/\{[ns]\d*\}/g)].map((m) => m[0]);
  const index = new Map(order.map((tok, i) => [tok, i + 1]));
  if (order.length < 2) return swiftKey(translated);
  return translated.replace(/\{[ns]\d*\}/g, (tok) =>
    `%${index.get(tok) ?? 1}$${tok.startsWith("{n") ? "lld" : "@"}`);
};
const strings = {};
for (const k of keys) {
  const localizations = {};
  for (const lng of locales) {
    const v = lng === sourceLanguage ? src[k][sourceLanguage] : src[k][lng];
    if (!v) continue;
    localizations[lng] = { stringUnit: { state: "translated", value: swiftValue(k, v) } };
  }
  strings[swiftKey(k)] = { extractionState: "manual", localizations };
}
writeFileSync(
  resolve(root, "app/App/Localizable.xcstrings"),
  JSON.stringify({ sourceLanguage, strings, version: "1.0" }, null, 2) + "\n"
);
console.log(`i18n-gen: ${keys.length} keys -> app/App/Localizable.xcstrings`);
