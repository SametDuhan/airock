// Data layer: flights, routes and aircraft info.
// Both the Electron main process (require) and the browser (script tag) use this same code.
(function (root) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // adsb.lol rejects generic User-Agents (403); the main process sends a UA with contact info (the browser sets its own UA)
  const HEADERS = typeof window === 'undefined' ? { 'User-Agent': 'SkyTrack/0.5.0 (+https://github.com/SametDuhan/airock)' } : {};
  const get = (url, ms = 12000) => fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms) });

  /* ---------- adsb.lol (primary source: free, no key) ---------- */
  // The API only returns aircraft within 250 nautical miles of a point; there is no box query.
  // We split the visible area into ~600 km cells and cover each cell with a circle. The rate limit is tight (~10 requests/min),
  // so at most 2 circles (the central ones) are queried; wider views try OpenSky instead.
  const MAX_NM = 250, CELL_KM = 600, MAX_CIRCLES = 2;
  function cover(b, maxCircles = MAX_CIRCLES) {
    const s = +b.s, n = +b.n, w = +b.w, e = +b.e, mLat = (s + n) / 2, mLon = (w + e) / 2;
    const ny = Math.max(1, Math.ceil((n - s) * 111.2 / CELL_KM)), nx = Math.max(1, Math.ceil((e - w) * 111.2 * Math.cos(Math.min(Math.abs(s), Math.abs(n)) * Math.PI / 180) / CELL_KM));
    const cells = [];
    for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) {
      const cs = s + (n - s) * i / ny, cn = s + (n - s) * (i + 1) / ny, cw = w + (e - w) * j / nx, ce = w + (e - w) * (j + 1) / nx;
      const lat = (cs + cn) / 2, lon = (cw + ce) / 2, far = Math.max(km(lat, lon, cn, ce), km(lat, lon, cs, ce));
      cells.push({ lat, lon, r: Math.max(5, Math.min(MAX_NM, Math.ceil(far / 1.852 * 1.05))), d: (lat - mLat) ** 2 + (lon - mLon) ** 2 });
    }
    cells.sort((a, b) => a.d - b.d);
    const circles = cells.slice(0, maxCircles);
    // Rectangle covered by the chosen circles together (on partial coverage the client counts only this as "fetched")
    const covered = circles.reduce((o, c) => { const dLat = c.r * 1.852 / 111.2, dLon = dLat / Math.max(.05, Math.cos(c.lat * Math.PI / 180));
      return { s: Math.min(o.s, c.lat - dLat), n: Math.max(o.n, c.lat + dLat), w: Math.min(o.w, c.lon - dLon), e: Math.max(o.e, c.lon + dLon) }; }, { s: 90, n: -90, w: 360, e: -360 });
    return { circles, partial: cells.length > maxCircles, total: cells.length, covered };
  }
  // Internal units (same as the old OpenSky format): altitude m, speed m/s, vertical rate m/s
  const fromAdsb = a => { const g = a.alt_baro === 'ground', ft = g ? 0 : typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_geom || 0;
    return { id: a.hex, cs: (a.flight || '').trim() || a.r || a.hex.toUpperCase(), reg: a.r || '', type: a.t || '', country: '', lat: a.lat, lon: a.lon,
      ground: g, alt: ft / 3.281, spd: (a.gs || 0) / 1.944, hdg: a.track ?? a.true_heading ?? 0, vr: (a.baro_rate ?? a.geom_rate ?? 0) / 196.85,
      wd: a.wd ?? null, ws: a.ws ?? null, tas: a.tas ?? null, th: a.true_heading ?? null, sq: a.squawk || '', emg: a.emergency && a.emergency !== 'none' ? a.emergency : '', cat: a.category || '', mil: !!((a.dbFlags || 0) & 1) }; };
  // Two free community feeds with the same data format. Circles are spread over both, so each one stays well under its own rate limit
  // and a wide view covers twice as much. If a feed fails (e.g. 429), its circle is retried on the other one.
  const ALL_FEEDS = [
    { name: 'adsb.lol', point: (la, lo, r) => `https://api.adsb.lol/v2/point/${la}/${lo}/${r}`, hex: h => `https://api.adsb.lol/v2/hex/${h}`, by: (k, v) => `https://api.adsb.lol/v2/${k}/${v}` },
    { name: 'adsb.fi', point: (la, lo, r) => `https://opendata.adsb.fi/api/v2/lat/${la}/lon/${lo}/dist/${r}`, hex: h => `https://opendata.adsb.fi/api/v2/hex/${h}`, by: (k, v) => `https://opendata.adsb.fi/api/v2/${k}/${v}` },
    // airplanes.live: free for projects, but access has to be requested (contact@airplanes.live), otherwise it answers 403. Set on: true once you have it.
    { name: 'airplanes.live', on: false, point: (la, lo, r) => `https://api.airplanes.live/v2/point/${la}/${lo}/${r}`, hex: h => `https://api.airplanes.live/v2/hex/${h}`, by: (k, v) => `https://api.airplanes.live/v2/${k}/${v}` }];
  const FEEDS = ALL_FEEDS.filter(f => f.on !== false);
  const feedPause = {}; // feed name → time until which we skip it (after a 429 or an error)
  async function fromFeeds(first, fetchUrl, delayMs) {
    await sleep(delayMs); const errs = [];
    for (let k = 0; k < FEEDS.length; k++) {
      const f = FEEDS[(first + k) % FEEDS.length]; if (Date.now() < (feedPause[f.name] || 0)) { errs.push(f.name + ': paused'); continue; }
      try { const r = await get(fetchUrl(f)); if (r.status === 429) { feedPause[f.name] = Date.now() + 60000; throw new Error('rate limited (429)'); }
        if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return { name: f.name, ac: j.ac || j.aircraft || [] }; }
      catch (e) { errs.push(f.name + ': ' + e.message); }
    }
    throw new Error(errs.join(', '));
  }
  async function adsbLol(b) {
    const { circles, partial, covered } = cover(b, MAX_CIRCLES * FEEDS.length), seen = new Map(), used = new Set(), good = []; let okN = 0, lastErr = '';
    await Promise.all(circles.map(async (c, i) => {
      try {
        const r = await fromFeeds(i % FEEDS.length, f => f.point(c.lat.toFixed(3), c.lon.toFixed(3), c.r), Math.floor(i / FEEDS.length) * 350);
        r.ac.forEach(a => a.lat != null && a.lon != null && seen.set(a.hex, a)); used.add(r.name); okN++; good.push(c);
      } catch (e) { lastErr = e.message; }
    }));
    if (!okN) throw new Error(lastErr || 'no response');
    const part = partial || okN < circles.length;
    // cov: the circles that really answered [lat, lon, radius km]: only aircraft inside them can be called "gone" when an answer does not list them
    return { src: [...used].join(' + '), flights: [...seen.values()].map(fromAdsb), partial: part, covered: part ? covered : undefined, cov: good.map(c => [c.lat, c.lon, c.r * 1.852]) };
  }
  // Watchlist: current state of specific aircraft anywhere in the world (one request for all of them)
  async function watch(hexes) {
    if (!Array.isArray(hexes) || !hexes.length || hexes.length > 40 || !hexes.every(h => typeof h === 'string' && /^[0-9a-fA-F]{6}$/.test(h))) return { ok: false, error: 'invalid list' };
    try { const r = await fromFeeds(Math.floor(Math.random() * FEEDS.length), f => f.hex(hexes.join(',').toLowerCase()), 0);
      return { ok: true, flights: r.ac.filter(a => a.lat != null && a.lon != null).map(fromAdsb) };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // Worldwide search by callsign, registration, ICAO24 hex or aircraft type (not limited to what is on screen)
  async function find(q) {
    q = String(q || '').trim().toUpperCase(); if (!/^[A-Z0-9-]{2,10}$/.test(q)) return { ok: false, error: 'invalid query' };
    const kinds = ['callsign', 'reg']; if (/^[0-9A-F]{6}$/.test(q)) kinds.push('hex'); if (/^[A-Z0-9]{3,4}$/.test(q)) kinds.push('type');
    const rs = await Promise.allSettled(kinds.map(k => fromFeeds(0, f => f.by(k, k === 'hex' ? q.toLowerCase() : q), 0)));
    const seen = new Map(); let any = false;
    rs.forEach(r => { if (r.status !== 'fulfilled') return; any = true; r.value.ac.filter(a => a.lat != null && a.lon != null).forEach(a => { if (!seen.has(a.hex)) seen.set(a.hex, fromAdsb(a)); }); });
    return any ? { ok: true, flights: [...seen.values()].slice(0, 30) } : { ok: false, error: 'no answer' };
  }

  /* ---------- OpenSky (fallback source: the daily credit limit is low for anonymous use) ---------- */
  let openSkyPause = 0; // when credits run out (429), don't query OpenSky for 10 min
  // Optional OpenSky API client (client credentials, OAuth2): gives a much higher daily limit than anonymous use. Set from the app's Settings.
  let osAuth = null, osToken = null;
  function setOpenSky(id, secret) { osAuth = id && secret ? { id: String(id), secret: String(secret) } : null; osToken = null; openSkyPause = 0; return { ok: true, set: !!osAuth }; }
  async function osHeaders() {
    if (!osAuth) return {};
    if (!osToken || Date.now() > osToken.exp - 60000) {
      const r = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: osAuth.id, client_secret: osAuth.secret }), signal: AbortSignal.timeout(12000) });
      if (!r.ok) { osToken = null; return {}; } // wrong credentials: fall back to anonymous access
      const j = await r.json(); osToken = { t: j.access_token, exp: Date.now() + (j.expires_in || 1800) * 1000 };
    }
    return { Authorization: 'Bearer ' + osToken.t };
  }
  async function openSky(b) {
    if (Date.now() < openSkyPause) throw new Error('daily credits used up, waiting');
    const r = await fetch(`https://opensky-network.org/api/states/all?lamin=${b.s}&lomin=${b.w}&lamax=${b.n}&lomax=${b.e}`, { headers: { ...HEADERS, ...(await osHeaders().catch(() => ({}))) }, signal: AbortSignal.timeout(15000) });
    if (r.status === 429) { openSkyPause = Date.now() + 600000; throw new Error('daily credits used up (429)'); }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).states || []).filter(s => s[5] != null && s[6] != null).map(s => ({ id: s[0], cs: (s[1] || '').trim() || s[0].toUpperCase(), reg: '', type: '', country: s[2],
      lon: s[5], lat: s[6], ground: !!s[8], alt: s[8] ? 0 : s[7] ?? s[13] ?? 0, spd: s[9] || 0, hdg: s[10] || 0, vr: s[11] || 0, sq: s[14] || '', emg: '', cat: '' }));
  }

  // Close view: adsb.lol (fallback OpenSky). Wide view: OpenSky, which covers everywhere in one request (fallback: adsb.lol for the center).
  // Converts bounds to numbers and clamps them to a valid range (don't trust values coming from the renderer)
  function bounds(b) {
    const n = (x, m) => { x = +x; if (!Number.isFinite(x)) throw new Error('invalid bounds'); return Math.max(-m, Math.min(m, x)); };
    const o = { s: n(b?.s, 90), n: n(b?.n, 90), w: n(b?.w, 180), e: n(b?.e, 180) };
    if (o.s > o.n || o.w > o.e) throw new Error('invalid bounds');
    return o;
  }
  async function flights(b) {
    try { b = bounds(b); } catch (e) { return { ok: false, error: e.message }; }
    const os = async () => ({ partial: false, flights: await openSky(b) });
    if (!cover(b).partial) { // zoomed in: the community feeds cover the whole area; OpenSky only as a backup
      const errs = [];
      for (const [src, fn] of [['adsb', () => adsbLol(b)], ['OpenSky', os]]) { try { const r = await fn(); return { ok: true, src: r.src || src, ...r }; } catch (e) { errs.push(`${src}: ${e.message}`); } }
      return { ok: false, error: errs.join(' · ') };
    }
    // Wide view: the community feeds cover only the center, OpenSky covers everything. Ask both at the same time and merge (the community data wins),
    // so aircraft do not appear and disappear when the source changes from one request to the next.
    const [a, o] = await Promise.allSettled([adsbLol(b), os()]);
    if (a.status === 'fulfilled' && o.status === 'fulfilled') {
      const m = new Map(o.value.flights.map(f => [f.id, f])); a.value.flights.forEach(f => m.set(f.id, f));
      return { ok: true, src: a.value.src + ' + OpenSky', partial: false, flights: [...m.values()] };
    }
    if (a.status === 'fulfilled') return { ok: true, src: a.value.src, ...a.value };
    if (o.status === 'fulfilled') return { ok: true, src: 'OpenSky', ...o.value };
    return { ok: false, error: `adsb: ${a.reason?.message} · OpenSky: ${o.reason?.message}` };
  }

  /* ---------- adsbdb.com: route (by callsign) and aircraft info (by ICAO24 code) ---------- */
  // Only the city: "Arnavutköy, Istanbul" -> "Istanbul", "Shanghai (Pudong)" -> "Shanghai". A last part that looks like an abbreviation ("D.C.") is skipped.
  const cityName = s => { const parts = String(s || '').replace(/\s*\([^)]*\)/g, '').split(',').map(x => x.trim()).filter(Boolean); const last = parts[parts.length - 1];
    return parts.length > 1 && last.length > 3 && !last.includes('.') ? last : parts[0] || ''; };
  const ap = a => ({ code: a.iata_code || a.icao_code, icao: a.icao_code, name: cityName(a.municipality) || a.name, lat: a.latitude, lon: a.longitude });
  async function adsbdb(path) {
    const r = await get('https://api.adsbdb.com/v0/' + path, 10000);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).response;
  }
  async function route(cs) {
    if (typeof cs !== 'string' || !/^[A-Za-z0-9]{2,12}$/.test(cs)) return { ok: false, error: 'invalid callsign' };
    try {
      const fr = (await adsbdb('callsign/' + encodeURIComponent(cs)))?.flightroute;
      return { ok: true, route: fr ? { org: ap(fr.origin), dst: ap(fr.destination), airline: fr.airline?.name || '', airlineIata: fr.airline?.iata || '' } : null };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  async function aircraft(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F~]{6,8}$/.test(hex)) return { ok: false, error: 'invalid ICAO24' };
    try {
      const a = (await adsbdb('aircraft/' + encodeURIComponent(hex)))?.aircraft;
      return { ok: true, aircraft: a ? { type: [a.manufacturer, a.type].filter(Boolean).join(' '), icaoType: a.icao_type || '', reg: a.registration || '',
        owner: a.registered_owner || '', country: a.registered_owner_country_name || '', photo: a.url_photo || '', thumb: a.url_photo_thumbnail || '' } : null };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- planespotters.net: photos of an aircraft (larger than the adsbdb thumbnail; there can be several) ---------- */
  async function photos(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F]{6}$/.test(hex)) return { ok: false, error: 'invalid ICAO24' };
    try {
      const r = await get('https://api.planespotters.net/pub/photos/hex/' + hex.toLowerCase(), 10000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { ok: true, photos: ((await r.json()).photos || []).filter(p => p.thumbnail_large?.src).map(p => ({ src: p.thumbnail_large.src, link: p.link || '', by: p.photographer || '' })) };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- adsb.lol trace: positions the aircraft actually flew today ---------- */
  // trace_full holds the whole UTC day, which may include earlier legs: keep only the current flight. A new leg starts at the last point on
  // the ground, at a point flagged "new leg" (flags & 2), or after a long gap (a landing may never be seen, e.g. no coverage at the destination).
  // Point format: [seconds, lat, lon, altitude ft | "ground", groundspeed, track, flags, ...]. Downsampled to MAX_PTS points.
  const LEG_GAP_S = 1200;
  // A long silence only means a new flight if the aircraft was low on either side of it (landed/took off unseen). High on both sides it is
  // just a coverage hole (e.g. an ocean crossing) and the flight continues.
  const lowAlt = p => p[3] === 'ground' || (typeof p[3] === 'number' && p[3] < 15000);
  // ...unless the aircraft could not have flown on through the gap: if the two ends are much closer than a cruising aircraft would have covered
  // in that time, it landed (and turned around) without being seen, even when both ends are at altitude (e.g. coverage starts only after climb-out)
  const flewThrough = (a, b) => { const gs = typeof a[4] === 'number' && a[4] > 100 ? Math.min(a[4], 520) : 400, dt = (b[0] - a[0]) / 3600;
    const d = 12742 * Math.asin(Math.sqrt(Math.sin((b[1] - a[1]) * Math.PI / 360) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin((b[2] - a[2]) * Math.PI / 360) ** 2)); return d > .4 * gs * 1.852 * dt; };
  const gapBreak = (a, b) => b[0] - a[0] > LEG_GAP_S && (lowAlt(a) || lowAlt(b) || !flewThrough(a, b));
  const MAX_PTS = 500;
  const legStart = trace => { let i = trace.length - 1;
    while (i > 0 && trace[i][3] !== 'ground' && !(trace[i][6] & 2) && !gapBreak(trace[i - 1], trace[i])) i--; return i; };
  // Altitude / speed profile of the current flight: [seconds since the flight's first point, altitude ft, groundspeed kt], downsampled
  function profOf(trace) {
    const a = trace.slice(legStart(trace)).filter(p => typeof p[3] === 'number' || p[3] === 'ground'); if (!a.length) return [];
    const t0 = a[0][0], rows = a.map(p => [Math.round(p[0] - t0), p[3] === 'ground' ? 0 : p[3], typeof p[4] === 'number' ? Math.round(p[4]) : null]);
    const step = Math.max(1, Math.ceil(rows.length / 140)); return rows.filter((_, k) => k % step === 0 || k === rows.length - 1);
  }
  function legOf(trace) {
    const i = legStart(trace);
    const pts = trace.slice(i).filter(p => typeof p[1] === 'number' && typeof p[2] === 'number').map(p => [p[1], p[2]]);
    const step = Math.max(1, Math.ceil(pts.length / MAX_PTS));
    return pts.filter((_, k) => k % step === 0 || k === pts.length - 1);
  }
  async function trace(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F]{6}$/.test(hex)) return { ok: false, error: 'invalid ICAO24' };
    hex = hex.toLowerCase();
    try {
      const r = await get(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`, 15000);
      if (r.status === 404) return { ok: true, points: [] };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const tr = (await r.json()).trace || []; return { ok: true, points: legOf(tr), prof: profOf(tr) };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- airport info: weather (open-meteo), city/country (OpenStreetMap), photo (Wikipedia) ---------- */
  const json = async url => { const r = await get(url, 10000); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  async function airport(lat, lon) {
    lat = +lat; lon = +lon; if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, error: 'invalid position' };
    const [w, p, ph] = await Promise.allSettled([
      json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&wind_speed_unit=kn`),
      json(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lon}`),
      json(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${lat}%7C${lon}&ggsradius=6000&ggslimit=10&prop=pageimages%7Cinfo&inprop=url&piprop=thumbnail&pithumbsize=640`)]);
    const c = w.status === 'fulfilled' ? w.value.current : null, ad = p.status === 'fulfilled' ? p.value.address || {} : {};
    const pages = ph.status === 'fulfilled' ? Object.values(ph.value.query?.pages || {}).filter(x => x.thumbnail?.source).sort((a, b) => a.index - b.index) : [];
    const pg = pages.find(x => /airport|airfield|aerodrome|international|havaliman|havaalan/i.test(x.title)) || null;
    if (!c && p.status !== 'fulfilled') return { ok: false, error: 'no response' };
    return { ok: true,
      weather: c ? { temp: c.temperature_2m, feels: c.apparent_temperature, hum: c.relative_humidity_2m, code: c.weather_code, day: !!c.is_day, pres: c.surface_pressure,
        wind: c.wind_speed_10m, dir: c.wind_direction_10m, gust: c.wind_gusts_10m, vis: c.visibility } : null,
      place: { city: ad.province || ad.city || ad.town || ad.village || ad.municipality || ad.county || ad.state || '', region: ad.state || '', country: ad.country || '' },
      photo: pg ? { src: pg.thumbnail.source, link: pg.fullurl || '', title: pg.title } : null };
  }

  /* ---------- today's flights of one aircraft: the day trace split into legs ---------- */
  // A leg is one stretch of airborne points, from the last ground point before it to the first ground point after it (or the end of the data).
  // Point: [seconds, lat, lon, altitude ft | "ground", ...]. base = the trace's start time (unix seconds).
  const pathKm = pts => { let d = 0; for (let i = 1; i < pts.length; i++) d += km(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); return d; };
  function splitLegs(trace, base = 0) {
    const out = []; let cur = null, ground = null, prev = null;
    const close = () => { if (cur) { out.push(cur); cur = null; } };
    for (const p of trace) {
      if (typeof p[1] !== 'number' || typeof p[2] !== 'number') continue;
      if (prev && cur && (gapBreak(prev, p) || (p[6] & 2))) close();
      const g = p[3] === 'ground', pt = [p[1], p[2], g ? 0 : p[3] || 0, base + p[0]];
      if (g) { if (cur) { cur.pts.push(pt); close(); } ground = pt; }
      else { if (!cur) cur = { pts: ground && p[0] - (ground[3] - base) <= LEG_GAP_S ? [ground] : [] }; cur.pts.push(pt); }
      prev = p;
    }
    if (cur) cur.open = true; close(); // only the last stretch can still be in the air
    return out.filter(l => l.pts.length >= 3 && pathKm(l.pts) > 15).map(l => { const pts = l.pts, step = Math.max(1, Math.ceil(pts.length / 300));
      return { t0: pts[0][3], t1: pts[pts.length - 1][3], km: Math.round(pathKm(pts)), maxAlt: Math.max(...pts.map(q => q[2])), open: !!l.open,
        from: [pts[0][0], pts[0][1]], to: [pts[pts.length - 1][0], pts[pts.length - 1][1]], pts: pts.filter((_, k) => k % step === 0 || k === pts.length - 1).map(q => [q[0], q[1]]) }; });
  }
  async function legs(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F]{6}$/.test(hex)) return { ok: false, error: 'invalid ICAO24' };
    hex = hex.toLowerCase();
    try {
      const r = await get(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`, 15000);
      if (r.status === 404) return { ok: true, legs: [] };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); return { ok: true, legs: splitLegs(j.trace || [], j.timestamp || 0) };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- aviationweather.gov (METAR / TAF, free, no key) and RainViewer (rain radar tiles, free) ---------- */
  async function metar(lat, lon) {
    lat = +lat; lon = +lon; if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, error: 'invalid position' };
    const text = async url => { const r = await get(url, 10000); if (!r.ok && r.status !== 204) throw new Error('HTTP ' + r.status); const t = await r.text(); return t.trim() ? JSON.parse(t) : []; };
    try {
      const list = await text(`https://aviationweather.gov/api/data/metar?format=json&bbox=${lat - .4},${lon - .4},${lat + .4},${lon + .4}`);
      const m = list.filter(x => x.rawOb && typeof x.lat === 'number').sort((a, b) => km(lat, lon, a.lat, a.lon) - km(lat, lon, b.lat, b.lon))[0];
      if (!m) return { ok: true, metar: null, taf: null };
      let taf = null; try { taf = (await text(`https://aviationweather.gov/api/data/taf?format=json&ids=${encodeURIComponent(m.icaoId)}`))[0]?.rawTAF || null; } catch {}
      return { ok: true, taf, metar: { icao: m.icaoId, raw: m.rawOb, cat: m.fltCat || '', obs: m.obsTime || 0, name: m.name || '', dist: Math.round(km(lat, lon, m.lat, m.lon)) } };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  async function radar() {
    try { const j = await json('https://api.rainviewer.com/public/weather-maps.json');
      const f = (j.radar?.past || []).slice(-1)[0]; return f ? { ok: true, host: j.host, path: f.path, time: f.time } : { ok: false, error: 'no radar data' };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- turbulence ahead: SIGMET / G-AIRMET advisories + recent pilot reports (aviationweather.gov) ---------- */
  // severity: 0 none/smooth, 1 light, 2 moderate, 3 severe or worse
  const sevOf = x => { x = String(x || '').toUpperCase(); return /SEV|EXTRM/.test(x) ? 3 : /MOD/.test(x) ? 2 : /LGT/.test(x) ? 1 : 0; };
  const inPoly = (lat, lon, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((xi > lon) !== (xj > lon) && lat < (yj - yi) * (lon - xi) / (xj - xi) + yi) c = !c; } return c; };
  // pts: [[lat, lon]...] ahead of the aircraft; adv: [{sev, base, top (ft), poly}]; peps: [{lat, lon, ft, sev}]
  function turbAssess(pts, altFt, adv, peps) {
    let level = 0, at = null, src = '', n = 0; const hit = (sev, i, s) => { n++; if (sev > level || (sev === level && i < at)) { level = sev; at = i; src = s; } };
    for (const a of adv) { if (a.sev < 2 || !(altFt >= (a.base ?? 0) - 2000 && altFt <= (a.top ?? 99999) + 2000)) continue;
      const i = pts.findIndex(p => inPoly(p[0], p[1], a.poly)); if (i >= 0) hit(a.sev, i, 'advisory'); }
    for (const r of peps) { if (r.sev < 2 || Math.abs(r.ft - altFt) > 4000) continue;
      let best = -1; for (let i = 0; i < pts.length; i++) if (km(pts[i][0], pts[i][1], r.lat, r.lon) < 75) { best = i; break; } if (best >= 0) hit(r.sev, best, 'pirep'); }
    let dist = null; if (at !== null) { dist = 0; for (let i = 1; i <= at; i++) dist += km(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); }
    return { level, km: dist === null ? null : Math.round(dist), n, src };
  }
  const text = async (url, ms = 12000) => { const r = await get(url, ms); if (!r.ok && r.status !== 204) throw new Error('HTTP ' + r.status); const t = await r.text(); return t.trim() ? JSON.parse(t) : []; };
  const fl = ft => ft >= 99999 ? '' : ft <= 0 ? 'SFC' : 'FL' + String(Math.round(ft / 100)).padStart(3, '0');
  // Current turbulence SIGMETs (worldwide) and G-AIRMETs (USA): [{sev 2|3, base, top (ft), poly, name}]
  async function advisories() {
    const now = Date.now() / 1000;
    const [is, ga] = await Promise.allSettled([text('https://aviationweather.gov/api/data/isigmet?format=json'), text('https://aviationweather.gov/api/data/gairmet?type=tango&format=json')]);
    if (is.status !== 'fulfilled' && ga.status !== 'fulfilled') throw new Error('no data');
    const adv = [], P = c => c.map(q => [+q.lat, +q.lon]);
    if (is.status === 'fulfilled') for (const x of is.value) if (x.hazard === 'TURB' && Array.isArray(x.coords) && x.coords.length > 2 && now >= x.validTimeFrom - 1800 && now <= x.validTimeTo)
      adv.push({ sev: Math.max(2, sevOf(x.qualifier)), base: x.base ?? 0, top: x.top ?? 99999, poly: P(x.coords), name: `${x.firName || x.firId || ''} ${x.qualifier || ''}`.trim() });
    if (ga.status === 'fulfilled') for (const x of ga.value) if (/^TURB/.test(x.hazard) && Array.isArray(x.coords) && x.coords.length > 2 && now <= x.expireTime)
      adv.push({ sev: Math.max(2, sevOf(x.severity)), base: x.base ? +x.base * 100 : 0, top: x.top ? +x.top * 100 : 99999, poly: P(x.coords), name: 'G-AIRMET ' + x.hazard });
    return adv.map(a => ({ ...a, lv: `${fl(a.base)}${a.top < 99999 ? '–' + fl(a.top) : '+'}` }));
  }
  async function turbMap() { try { return { ok: true, adv: await advisories() }; } catch (e) { return { ok: false, error: e.message }; } }
  async function turb(pts, altFt) {
    if (!Array.isArray(pts) || pts.length < 1 || pts.length > 80 || !pts.every(p => Array.isArray(p) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 540) || !Number.isFinite(+altFt)) return { ok: false, error: 'invalid input' };
    const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]), pad = 1.5, bb = [Math.min(...lats) - pad, Math.min(...lons) - pad, Math.max(...lats) + pad, Math.max(...lons) + pad].map(v => +v.toFixed(2));
    const [ad, pi] = await Promise.allSettled([advisories(), text(`https://aviationweather.gov/api/data/pirep?format=json&age=2&bbox=${bb[0]},${bb[1]},${bb[2]},${bb[3]}`)]);
    if (ad.status !== 'fulfilled' && pi.status !== 'fulfilled') return { ok: false, error: 'no data' };
    const adv = ad.status === 'fulfilled' ? ad.value : [], peps = [];
    if (pi.status === 'fulfilled') for (const x of pi.value) { const sev = Math.max(sevOf(x.tbInt1), sevOf(x.tbInt2)), ft = (x.fltLvl ?? ((x.tbBas1 + x.tbTop1) / 2)) * 100;
      if (typeof x.lat === 'number' && typeof x.lon === 'number' && Number.isFinite(ft)) peps.push({ lat: x.lat, lon: x.lon, ft, sev: /MOD-SEV/.test(x.tbInt1 + x.tbInt2) ? 3 : sev }); }
    // advisories in the western hemisphere may come with longitudes on the other side of the date line: compare on the same copy as the path
    const near = lon0 => poly => poly.map(([la, lo]) => [la, lo + 360 * Math.round((lon0 - lo) / 360)]);
    adv.forEach(a => { a.poly = near(pts[0][1])(a.poly); }); peps.forEach(r => { r.lon = r.lon + 360 * Math.round((pts[0][1] - r.lon) / 360); });
    const res = turbAssess(pts, +altFt, adv, peps); return { ok: true, ...res, adv: adv.length, pireps: peps.length };
  }

  /* ---------- wind grid at a pressure level (open-meteo, free, no key) ---------- */
  const HPA = [850, 700, 500, 300, 250, 200];
  async function wind(b, hpa) {
    const s = Math.max(-80, +b.s), n = Math.min(80, +b.n), w = +b.w, e = +b.e; hpa = +hpa;
    if (![s, n, w, e].every(Number.isFinite) || !HPA.includes(hpa) || n <= s || e <= w || e - w > 720) return { ok: false, error: 'invalid area' };
    const C = 8, R = 6, lat = [], lon = [], pos = [];
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const la = s + (n - s) * (i + .5) / R, lo = w + (e - w) * (j + .5) / C; pos.push([la, lo]); lat.push(la.toFixed(2)); lon.push((((lo + 540) % 360) - 180).toFixed(2)); }
    try {
      const r = await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat.join(',')}&longitude=${lon.join(',')}&hourly=wind_speed_${hpa}hPa,wind_direction_${hpa}hPa&wind_speed_unit=kn&forecast_hours=1&timezone=GMT`, 15000);
      if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(), a = Array.isArray(j) ? j : [j];
      return { ok: true, hpa, pts: a.map((x, i) => ({ lat: pos[i][0], lon: pos[i][1], kt: x.hourly?.['wind_speed_' + hpa + 'hPa']?.[0], dir: x.hourly?.['wind_direction_' + hpa + 'hPa']?.[0] })).filter(p => Number.isFinite(p.kt) && Number.isFinite(p.dir)) };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  const api = { flights, find, setOpenSky, route, aircraft, photos, trace, airport, watch, legs, splitLegs, metar, radar, cityName, turb, turbMap, turbAssess, wind, legOf, cover, bounds };
  root.SkyData = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
