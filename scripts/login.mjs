// One-time sign-in for a machine that has no session yet.
//   node scripts/login.mjs
//
// Opens a real (headed) Chromium on the SAME persistent profile run.mjs uses,
// so whatever you log in as is the session run.mjs picks up afterwards. Nothing
// is typed for you and no password is stored anywhere: you sign in yourself, in
// a real browser, including any 2FA/captcha, and the cookie lands in the profile.
//
// ponytail: deliberately not a credential-stuffing login. Duolingo's cookie is
// good for about a year and refreshes itself, so storing a password to replay a
// login flow would be more attack surface for a thing you do roughly annually.
import { chromium } from 'playwright';
import path from 'node:path';

const D = path.dirname(new URL(import.meta.url).pathname);
const PROFILE = path.join(D, '.pw-profile');

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = ctx.pages()[0] || await ctx.newPage();

const already = (await ctx.cookies('https://www.duolingo.com')).find(c => c.name === 'jwt_token');
if (already) {
  console.log('This profile already has a Duolingo session. Sign out in the window if you want to switch accounts.');
}

await page.goto('https://www.duolingo.com/?isLoggingIn=true', { waitUntil: 'domcontentloaded' });
console.log('Sign in in the browser window. Waiting…');

try {
  // Resolves as soon as Duolingo hands out a session cookie, however you got there.
  await page.waitForFunction(() => document.cookie.includes('logged_in=1'), null, { timeout: 5 * 60_000 });
} catch {
  console.error('Timed out after 5 minutes without a session. Nothing saved.');
  await ctx.close();
  process.exit(1);
}

const jwt = (await ctx.cookies('https://www.duolingo.com')).find(c => c.name === 'jwt_token')?.value;
if (!jwt) {
  console.error('Logged in, but no jwt_token cookie appeared. Nothing saved.');
  await ctx.close();
  process.exit(1);
}

let who = 'unknown';
try {
  const uid = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).sub;
  who = await page.evaluate(async u => {
    const r = await fetch(`/2017-06-30/users/${u}?fields=username`);
    return (await r.json()).username;
  }, uid);
} catch { /* cosmetic only */ }

console.log(`Signed in as ${who}. Session saved to the profile — run.mjs will use it. You can close this window.`);
await ctx.close();
