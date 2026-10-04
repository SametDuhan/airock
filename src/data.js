// Veri katmanı: uçuşlar, rotalar ve uçak bilgileri.
// Hem Electron ana süreci (require) hem tarayıcı (script etiketi) aynı kodu kullanır.
(function (root) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // adsb.lol genel User-Agent'ları reddeder (403); ana süreçte iletişim bilgili bir UA gönderilir (tarayıcı UA'sını zaten kendisi koyar)
  const HEADERS = typeof window === 'undefined' ? { 'User-Agent': 'SkyTrack/0.4.1 (+https://github.com/SametDuhan/airock)' } : {};
  const get = (url, ms = 12000) => fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms) });

  /* ---------- adsb.lol (birincil kaynak: ücretsiz, anahtarsız) ---------- */
  // API yalnızca bir noktanın en fazla 250 deniz mili çevresini verir; kutu sorgusu yok.
  // Görünen alanı ~600 km'lik hücrelere bölüp her hücreyi bir daireyle kaplarız. Hız sınırı sıkı (~10 istek/dk),
  // bu yüzden en fazla 2 daire (merkezdekiler) sorulur; daha geniş görünümlerde OpenSky denenir.
  const MAX_NM = 250, CELL_KM = 600, MAX_CIRCLES = 2;
  function cover(b) {
    const s = +b.s, n = +b.n, w = +b.w, e = +b.e, mLat = (s + n) / 2, mLon = (w + e) / 2;
    const ny = Math.max(1, Math.ceil((n - s) * 111.2 / CELL_KM)), nx = Math.max(1, Math.ceil((e - w) * 111.2 * Math.cos(Math.min(Math.abs(s), Math.abs(n)) * Math.PI / 180) / CELL_KM));
    const cells = [];
    for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) {
      const cs = s + (n - s) * i / ny, cn = s + (n - s) * (i + 1) / ny, cw = w + (e - w) * j / nx, ce = w + (e - w) * (j + 1) / nx;
      const lat = (cs + cn) / 2, lon = (cw + ce) / 2, far = Math.max(km(lat, lon, cn, ce), km(lat, lon, cs, ce));
      cells.push({ lat, lon, r: Math.max(5, Math.min(MAX_NM, Math.ceil(far / 1.852 * 1.05))), d: (lat - mLat) ** 2 + (lon - mLon) ** 2 });
    }
    cells.sort((a, b) => a.d - b.d);
    const circles = cells.slice(0, MAX_CIRCLES);
    // Seçilen dairelerin birlikte kapladığı dikdörtgen (kısmi kapsama durumunda istemci yalnız bunu "alındı" sayar)
    const covered = circles.reduce((o, c) => { const dLat = c.r * 1.852 / 111.2, dLon = dLat / Math.max(.05, Math.cos(c.lat * Math.PI / 180));
      return { s: Math.min(o.s, c.lat - dLat), n: Math.max(o.n, c.lat + dLat), w: Math.min(o.w, c.lon - dLon), e: Math.max(o.e, c.lon + dLon) }; }, { s: 90, n: -90, w: 360, e: -360 });
    return { circles, partial: cells.length > MAX_CIRCLES, total: cells.length, covered };
  }
  // İç birimler (eski OpenSky biçimiyle aynı): irtifa m, hız m/s, dikey hız m/s
  const fromAdsb = a => { const g = a.alt_baro === 'ground', ft = g ? 0 : typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_geom || 0;
    return { id: a.hex, cs: (a.flight || '').trim() || a.r || a.hex.toUpperCase(), reg: a.r || '', type: a.t || '', country: '', lat: a.lat, lon: a.lon,
      ground: g, alt: ft / 3.281, spd: (a.gs || 0) / 1.944, hdg: a.track ?? a.true_heading ?? 0, vr: (a.baro_rate ?? a.geom_rate ?? 0) / 196.85 }; };
  async function adsbLol(b) {
    const { circles, partial, covered } = cover(b), seen = new Map(); let okN = 0, lastErr = '';
    await Promise.all(circles.map(async (c, i) => {
      await sleep(i * 800); // istekleri arka arkaya patlatma
      try {
        const r = await get(`https://api.adsb.lol/v2/point/${c.lat.toFixed(3)}/${c.lon.toFixed(3)}/${c.r}`);
        if (!r.ok) throw new Error(r.status === 429 ? 'istek sınırı (429)' : 'HTTP ' + r.status);
        ((await r.json()).ac || []).forEach(a => a.lat != null && a.lon != null && seen.set(a.hex, a)); okN++;
      } catch (e) { lastErr = e.message; }
    }));
    if (!okN) throw new Error(lastErr || 'yanıt yok');
    const part = partial || okN < circles.length;
    return { flights: [...seen.values()].map(fromAdsb), partial: part, covered: part ? covered : undefined };
  }

  /* ---------- OpenSky (yedek kaynak: anonim kullanımda günlük kredi sınırı düşük) ---------- */
  let openSkyPause = 0; // kredi bitince (429) 10 dk OpenSky'a hiç sorma
  async function openSky(b) {
    if (Date.now() < openSkyPause) throw new Error('günlük kredi bitti, bekleniyor');
    const r = await get(`https://opensky-network.org/api/states/all?lamin=${b.s}&lomin=${b.w}&lamax=${b.n}&lomax=${b.e}`, 15000);
    if (r.status === 429) { openSkyPause = Date.now() + 600000; throw new Error('günlük kredi bitti (429)'); }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).states || []).filter(s => s[5] != null && s[6] != null).map(s => ({ id: s[0], cs: (s[1] || '').trim() || s[0].toUpperCase(), reg: '', type: '', country: s[2],
      lon: s[5], lat: s[6], ground: !!s[8], alt: s[8] ? 0 : s[7] ?? s[13] ?? 0, spd: s[9] || 0, hdg: s[10] || 0, vr: s[11] || 0 }));
  }

  // Yakın görünüm: adsb.lol (yedek OpenSky). Geniş görünüm: tek istekle her yeri kapsayan OpenSky (yedek: adsb.lol ile merkez).
  // Sınırları sayıya çevirir ve geçerli aralığa kırpar (renderer'dan gelen değerlere güvenme)
  function bounds(b) {
    const n = (x, m) => { x = +x; if (!Number.isFinite(x)) throw new Error('geçersiz sınır'); return Math.max(-m, Math.min(m, x)); };
    const o = { s: n(b?.s, 90), n: n(b?.n, 90), w: n(b?.w, 180), e: n(b?.e, 180) };
    if (o.s > o.n || o.w > o.e) throw new Error('geçersiz sınır');
    return o;
  }
  async function flights(b) {
    try { b = bounds(b); } catch (e) { return { ok: false, error: e.message }; }
    const order = cover(b).partial ? [['OpenSky', async () => ({ partial: false, flights: await openSky(b) })], ['adsb.lol', () => adsbLol(b)]]
                                   : [['adsb.lol', () => adsbLol(b)], ['OpenSky', async () => ({ partial: false, flights: await openSky(b) })]];
    const errs = [];
    for (const [src, fn] of order) { try { return { ok: true, src, ...(await fn()) }; } catch (e) { errs.push(`${src}: ${e.message}`); } }
    return { ok: false, error: errs.join(' · ') };
  }

  /* ---------- adsbdb.com: rota (çağrı koduna göre) ve uçak bilgisi (ICAO24 koduna göre) ---------- */
  const ap = a => ({ code: a.iata_code || a.icao_code, icao: a.icao_code, name: a.municipality || a.name, lat: a.latitude, lon: a.longitude });
  async function adsbdb(path) {
    const r = await get('https://api.adsbdb.com/v0/' + path, 10000);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).response;
  }
  async function route(cs) {
    if (typeof cs !== 'string' || !/^[A-Za-z0-9]{2,12}$/.test(cs)) return { ok: false, error: 'geçersiz çağrı kodu' };
    try {
      const fr = (await adsbdb('callsign/' + encodeURIComponent(cs)))?.flightroute;
      return { ok: true, route: fr ? { org: ap(fr.origin), dst: ap(fr.destination), airline: fr.airline?.name || '', airlineIata: fr.airline?.iata || '' } : null };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  async function aircraft(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F~]{6,8}$/.test(hex)) return { ok: false, error: 'geçersiz ICAO24' };
    try {
      const a = (await adsbdb('aircraft/' + encodeURIComponent(hex)))?.aircraft;
      return { ok: true, aircraft: a ? { type: [a.manufacturer, a.type].filter(Boolean).join(' '), icaoType: a.icao_type || '', reg: a.registration || '',
        owner: a.registered_owner || '', country: a.registered_owner_country_name || '', photo: a.url_photo || '', thumb: a.url_photo_thumbnail || '' } : null };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  const api = { flights, route, aircraft, cover, bounds };
  root.SkyData = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
