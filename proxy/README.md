# SkyTrack proxy (Cloudflare Workers, free plan)

Caches adsb.lol / adsb.fi answers for a few seconds so every user shares the same requests.

1. Create a free Cloudflare account (no card needed).
2. `cd proxy && npx wrangler login && npx wrangler deploy`
3. Test: `curl https://skytrack-proxy.<your-subdomain>.workers.dev/v2/point/41/29/50`
   - `{"ac":[...],"src":"adsb.lol"}` → works. `502` with 403 in the message → Cloudflare IPs are blocked by the feeds.
4. Put the URL in `PROXY_URL` in `src/data.js` (empty = proxy off).
