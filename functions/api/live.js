// Edge-cached view of the live runner, for the landing page demo.
//
// ponytail: the page could fetch the tunnel directly — CORS is already open —
// but then every visitor hits the Mac, and the runner's rate limit would start
// 429ing the real apps. This caches one response for everyone: N visitors, one
// origin request per CACHE_SECONDS.
//
// Only the fields the demo draws are passed through. The account handle is not
// one of them; a marketing page does not need to publish a username.
const ORIGIN = 'https://pwnlingo-status.heyitsmejosh.com';
const CACHE_SECONDS = 10;

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/live', context.request.url).toString());

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let body;
  try {
    const [stateRes, fenRes] = await Promise.all([
      fetch(`${ORIGIN}/state`, { signal: AbortSignal.timeout(4000) }),
      fetch(`${ORIGIN}/fen`, { signal: AbortSignal.timeout(4000) }),
    ]);
    if (!stateRes.ok) throw new Error(`state ${stateRes.status}`);

    const s = await stateRes.json();
    const fen = fenRes.ok ? (await fenRes.json()).fen : null;

    body = {
      live: true,
      track: s.track,
      fen,
      xp: s.xp != null && s.xp0 != null ? s.xp - s.xp0 : null,
      puzzles: s.puzzles,
      misses: s.misses,
      lessons: s.lessons,
      streak: s.streak ?? null,
      paused: s.paused === true,
      // Anything older than this and the Mac is asleep or the tunnel is down;
      // the page falls back to its scripted demo rather than showing a frozen board.
      at: s.at,
    };
  } catch {
    body = { live: false };
  }

  const res = new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
