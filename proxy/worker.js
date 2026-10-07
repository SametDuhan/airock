// SkyTrack live-data proxy (Cloudflare Workers, free plan).
// Same URL shape as adsb.lol (/v2/point/LAT/LON/NM, /v2/hex/HEX,...) so the app can use it like any other feed.
// Answers are cached at the edge for a few seconds: however many users ask, the upstream feeds see few requests.
const UA = 'SkyTrack-proxy (+https://github.com/SametDuhan/airock)';
const TTL = 5; // seconds a point answer is shared between all users
const UP = [
  { name: 'adsb.lol', point: (la, lo, r) => `https://api.adsb.lol/v2/point/${la}/${lo}/${r}`, other: p => `https://api.adsb.lol${p}` },
  { name: 'adsb.fi', point: (la, lo, r) => `https://opendata.adsb.fi/api/v2/lat/${la}/lon/${lo}/dist/${r}`, other: p => `https://opendata.adsb.fi/api${p}` }];
const json = (body, status = 200, ttl = 0) => new Response(body, { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': `public, max-age=${ttl}` } });

async function upstream(urls) {
  let err = 'no upstream';
  for (const u of urls) {
    try { const r = await fetch(u.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) });
      if (r.ok) { const j = await r.json(); return JSON.stringify({ ac: j.ac || j.aircraft || [], src: u.name }); }
      err = `${u.name}: HTTP ${r.status}`; } catch (e) { err = `${u.name}: ${e.message}`; }
  }
  throw new Error(err);
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*' } });
    const url = new URL(req.url), m = url.pathname.match(/^\/v2\/point\/(-?[\d.]+)\/(-?[\d.]+)\/(\d+)$/);
    let urls, ttl = TTL;
    if (m) { // snap to a 0.25° grid and widen the radius a bit: nearby users share one cache entry
      const snap = x => (Math.round(+x * 4) / 4).toFixed(2), la = snap(m[1]), lo = snap(m[2]), r = Math.min(250, +m[3] + 12);
      if (Math.abs(la) > 90 || Math.abs(lo) > 180 || !(r > 0)) return json('{"error":"bad point"}', 400);
      urls = UP.map(u => ({ name: u.name, url: u.point(la, lo, r) })); url.pathname = `/v2/point/${la}/${lo}/${r}`;
    } else if (/^\/v2\/(hex|callsign|reg|type)\/[A-Za-z0-9,-]{2,400}$/.test(url.pathname)) {
      urls = UP.map(u => ({ name: u.name, url: u.other(url.pathname) })); ttl = 3;
    } else return json('{"error":"not found"}', 404);
    const key = new Request(url.origin + url.pathname), cache = caches.default, hit = await cache.match(key);
    if (hit) return hit;
    try { const res = json(await upstream(urls), 200, ttl); ctx.waitUntil(cache.put(key, res.clone())); return res; }
    catch (e) { return json(JSON.stringify({ error: e.message }), 502); }
  }
};
